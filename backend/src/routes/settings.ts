import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../lib/prisma';
import { sendKirisanEmail, sendBrevoEmail } from '../lib/mailer';
import { invalidateS3ConfigCache } from '../lib/s3';
import { requireRole } from '../lib/rbac';

const router = Router();

// Restrict all settings endpoints to ADMIN role
router.use(requireRole('ADMIN'));

const SENSITIVE_KEYS = ['s3SecretAccessKey', 'brevoApiKey', 'kirisanToken', 'turnstileSecretKey', 'fonnteToken'];
const MASK_STRING = '••••••••••••••••';

const integrationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: 'Terlalu banyak percobaan pengujian integrasi. Coba lagi nanti.' },
});

const SETTING_KEYS = [
  'projectName', 'logo', 'primaryColor', 'pageBackground',
  'turnstileEnabled', 'turnstileSiteKey', 'turnstileSecretKey', 'fonnteToken',
  'emailProvider', 'kirisanToken', 'kirisanChannelKey', 'kirisanLoginOtpTemplateId', 'kirisanRegisterOtpTemplateId', 'kirisanResetPasswordTemplateId',
  'brevoApiKey', 'brevoSenderEmail', 'brevoSenderName', 'brevoTemplateId',
  'senderName', 'senderAddress', 'senderPhone', 'senderEmail', 'bankAccounts', 'termsAndConditions',
  's3Endpoint', 's3Region', 's3Bucket', 's3AccessKeyId', 's3SecretAccessKey', 's3PublicUrlBase',
];

const DEFAULTS: Record<string, string> = {
  projectName: 'Client CRM',
  logo: '',
  primaryColor: 'black',
  pageBackground: '#f0f2f5',
  turnstileEnabled: 'false',
  turnstileSiteKey: '',
  turnstileSecretKey: '',
  fonnteToken: '',
  emailProvider: 'kirisan',
  kirisanToken: '',
  kirisanChannelKey: '',
  kirisanLoginOtpTemplateId: '',
  kirisanRegisterOtpTemplateId: '',
  kirisanResetPasswordTemplateId: '',
  brevoApiKey: '',
  brevoSenderEmail: '',
  brevoSenderName: '',
  brevoTemplateId: '',
  senderName: '',
  senderAddress: '',
  senderPhone: '',
  senderEmail: '',
  bankAccounts: '[]',
  termsAndConditions: '1. Pembayaran ditransfer ke rekening yang tertera di atas.\n2. Pembayaran yang telah dilakukan tidak dapat dikembalikan.\n3. Harap lakukan konfirmasi pembayaran setelah melakukan transfer.',
  s3Endpoint: '',
  s3Region: '',
  s3Bucket: '',
  s3AccessKeyId: '',
  s3SecretAccessKey: '',
  s3PublicUrlBase: '',
};

// ponytail: in-memory settings cache. Upgrade ke Redis/Keyv jika multi-node/cluster.
let settingsCache: Record<string, string> | null = null;

export function invalidateSettingsCache() {
  settingsCache = null;
}

function maskSensitiveSettings(raw: Record<string, string>): Record<string, string> {
  const masked = { ...raw };
  for (const key of SENSITIVE_KEYS) {
    if (masked[key]) {
      masked[key] = MASK_STRING;
    }
  }
  return masked;
}

// GET /api/settings
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (settingsCache) {
      return res.json(maskSensitiveSettings(settingsCache));
    }
    const rows = await prisma.setting.findMany();
    const settings: Record<string, string> = { ...DEFAULTS };
    rows.forEach((r: any) => { settings[r.key] = r.value; });
    settingsCache = settings;

    // Safety guard: jika turnstileEnabled='true' tapi site key kosong, nonaktifkan otomatis.
    // Ini mencegah 405 error dari Cloudflare challenge platform di production.
    if (settingsCache.turnstileEnabled === 'true' && !settingsCache.turnstileSiteKey?.trim()) {
      settingsCache = { ...settingsCache, turnstileEnabled: 'false' };
    }

    res.json(maskSensitiveSettings(settingsCache));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Handler for saving settings (supports both PUT and POST for web servers blocking PUT)
async function handleSaveSettings(req: Request, res: Response) {
  try {
    const data = req.body;
    // Skip updating masked values so database secrets are preserved
    const validKeys = Object.keys(data).filter(
      (k) => SETTING_KEYS.includes(k) && String(data[k]) !== MASK_STRING
    );

    if (validKeys.length > 0) {
      await prisma.$transaction(
        validKeys.map((key) =>
          prisma.setting.upsert({
            where: { key },
            update: { value: String(data[key]) },
            create: { key, value: String(data[key]) },
          })
        )
      );
    }

    invalidateSettingsCache();
    invalidateS3ConfigCache();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
}

// PUT & POST /api/settings
router.put('/', handleSaveSettings);
router.post('/', handleSaveSettings);

// POST /api/settings/test-kirisan
router.post('/test-kirisan', integrationLimiter, async (req: Request, res: Response) => {
  try {
    const { recipient_email, kirisan_token, kirisan_channel_key, kirisan_template_id } = req.body;

    let token = kirisan_token;
    let channelKey = kirisan_channel_key;
    let templateId = kirisan_template_id;

    // Fallback to database settings if body is not fully supplied or masked
    if (!token || token === MASK_STRING || !channelKey || !templateId) {
      const rows = await prisma.setting.findMany({
        where: { key: { in: ['kirisanToken', 'kirisanChannelKey', 'kirisanLoginOtpTemplateId'] } },
      });
      const db: Record<string, string> = {};
      rows.forEach((r: any) => { db[r.key] = r.value; });

      if (!token || token === MASK_STRING) token = db.kirisanToken;
      channelKey = channelKey || db.kirisanChannelKey;
      templateId = templateId || db.kirisanLoginOtpTemplateId;
    }

    if (!recipient_email) {
      res.status(400).json({ error: 'Recipient email is required' });
      return;
    }

    if (!token || !channelKey || !templateId) {
      res.status(400).json({ error: 'Kirisan token, channel key, dan template ID belum dikonfigurasi' });
      return;
    }

    const testOtp = '123456';
    const ok = await sendKirisanEmail(
      recipient_email,
      {
        otp: testOtp,
        code: testOtp,
        reset_code: testOtp,
        purpose: 'test-connection',
        expiry_minutes: 5,
      },
      templateId,
      token,
      channelKey
    );

    if (ok) {
      res.json({ success: true, message: `Koneksi berhasil! Email uji coba telah dikirim ke ${recipient_email}` });
    } else {
      res.status(500).json({ error: 'Gagal mengirim email uji coba via Kirisan API. Periksa token dan template ID.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal menguji Kirisan API' });
  }
});

// POST /api/settings/test-brevo
router.post('/test-brevo', integrationLimiter, async (req: Request, res: Response) => {
  try {
    const { recipient_email, brevo_api_key, brevo_sender_email, brevo_sender_name, brevo_template_id } = req.body;

    let apiKey = brevo_api_key;
    let senderEmail = brevo_sender_email;
    let senderName = brevo_sender_name;
    let templateId = brevo_template_id;

    // Fallback to database settings if body is not fully supplied or masked
    if (!apiKey || apiKey === MASK_STRING) {
      const rows = await prisma.setting.findMany({
        where: { key: { in: ['brevoApiKey', 'brevoSenderEmail', 'brevoSenderName', 'brevoTemplateId', 'senderEmail', 'senderName'] } },
      });
      const db: Record<string, string> = {};
      rows.forEach((r: any) => { db[r.key] = r.value; });

      if (!apiKey || apiKey === MASK_STRING) apiKey = db.brevoApiKey;
      senderEmail = senderEmail || db.brevoSenderEmail || db.senderEmail;
      senderName = senderName || db.brevoSenderName || db.senderName;
      templateId = templateId || db.brevoTemplateId;
    }

    if (!recipient_email) {
      res.status(400).json({ error: 'Recipient email is required' });
      return;
    }

    if (!apiKey) {
      res.status(400).json({ error: 'Brevo API Key belum dikonfigurasi' });
      return;
    }

    const testOtp = '123456';
    const ok = await sendBrevoEmail(
      recipient_email,
      {
        otp: testOtp,
        code: testOtp,
        reset_code: testOtp,
        purpose: 'test-connection',
        expiry_minutes: 5,
      },
      apiKey,
      senderEmail,
      senderName,
      templateId
    );

    if (ok) {
      res.json({ success: true, message: `Koneksi berhasil! Email uji coba telah dikirim via Brevo ke ${recipient_email}` });
    } else {
      res.status(500).json({ error: 'Gagal mengirim email uji coba via Brevo API. Periksa API Key dan sender email.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal menguji Brevo API' });
  }
});

export default router;

