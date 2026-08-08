import { Router, type Request, type Response } from 'express';
import prisma from '../lib/prisma';
import { sendKirisanEmail } from '../lib/mailer';
import { invalidateS3ConfigCache } from '../lib/s3';

const router = Router();

const SETTING_KEYS = [
  'projectName', 'logo', 'primaryColor', 'pageBackground',
  'turnstileSiteKey', 'turnstileSecretKey', 'fonnteToken',
  'kirisanToken', 'kirisanChannelKey', 'kirisanLoginOtpTemplateId', 'kirisanRegisterOtpTemplateId', 'kirisanResetPasswordTemplateId',
  'senderName', 'senderAddress', 'senderPhone', 'senderEmail', 'bankAccounts', 'termsAndConditions',
  's3Endpoint', 's3Region', 's3Bucket', 's3AccessKeyId', 's3SecretAccessKey', 's3PublicUrlBase',
];

const DEFAULTS: Record<string, string> = {
  projectName: 'Client CRM',
  logo: '',
  primaryColor: 'black',
  pageBackground: '#f0f2f5',
  turnstileSiteKey: '',
  turnstileSecretKey: '',
  fonnteToken: '',
  kirisanToken: '',
  kirisanChannelKey: '',
  kirisanLoginOtpTemplateId: '',
  kirisanRegisterOtpTemplateId: '',
  kirisanResetPasswordTemplateId: '',
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

// GET /api/settings
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (settingsCache) {
      return res.json(settingsCache);
    }
    const rows = await prisma.setting.findMany();
    const settings: Record<string, string> = { ...DEFAULTS };
    rows.forEach((r: any) => { settings[r.key] = r.value; });
    settingsCache = settings;

    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings
router.put('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const validKeys = Object.keys(data).filter(k => SETTING_KEYS.includes(k));

    if (validKeys.length > 0) {
      await prisma.$transaction(
        validKeys.map(key =>
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
});

// POST /api/settings/test-kirisan
router.post('/test-kirisan', async (req: Request, res: Response) => {
  try {
    const { recipient_email, kirisan_token, kirisan_channel_key, kirisan_template_id } = req.body;

    let token = kirisan_token;
    let channelKey = kirisan_channel_key;
    let templateId = kirisan_template_id;

    // Fallback to database settings if body is not fully supplied
    if (!token || !channelKey || !templateId) {
      const rows = await prisma.setting.findMany({
        where: { key: { in: ['kirisanToken', 'kirisanChannelKey', 'kirisanLoginOtpTemplateId'] } },
      });
      const db: Record<string, string> = {};
      rows.forEach((r: any) => { db[r.key] = r.value; });

      token = token || db.kirisanToken;
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

export default router;
