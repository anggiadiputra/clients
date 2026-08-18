import nodemailer from 'nodemailer';
import prisma from './prisma';

const devMode = !process.env.SMTP_HOST;

const transporter = devMode
  ? null
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

export async function sendKirisanEmail(
  email: string,
  variables: Record<string, any>,
  templateId: string,
  token: string,
  channelKey: string
): Promise<boolean> {
  try {
    const cleanTemplateId = String(templateId || '').trim();
    const numericTemplate = !isNaN(Number(cleanTemplateId)) ? Number(cleanTemplateId) : cleanTemplateId;
    const body = {
      keys: {
        email: {
          token: String(channelKey || '').trim(),
        },
      },
      target: {
        email: String(email || '').trim(),
        variables: variables,
      },
      content: {
        email: {
          template: numericTemplate,
        },
      },
    };

    const res = await fetch('https://api.kirisan.com/v1/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${String(token || '').trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Kirisan API Error (${res.status}):`, errText);
      return false;
    }

    console.log(`✅ Email OTP terkirim via Kirisan API ke ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email via Kirisan API:', error);
    return false;
  }
}

export async function sendBrevoEmail(
  email: string,
  variables: Record<string, any>,
  apiKey: string,
  senderEmail?: string,
  senderName?: string,
  templateId?: string
): Promise<boolean> {
  try {
    const cleanApiKey = String(apiKey || '').trim();
    if (!cleanApiKey) return false;

    const cleanSenderEmail = String(senderEmail || '').trim();
    const cleanSenderName = String(senderName || '').trim() || 'Client CRM';
    const cleanTemplateId = String(templateId || '').trim();
    const numericTemplate = !isNaN(Number(cleanTemplateId)) && Number(cleanTemplateId) > 0 ? Number(cleanTemplateId) : null;

    const otpCode = variables.otp || variables.code || '';
    const purpose = variables.purpose || 'login';
    const subjectTitle = purpose === 'reset-password' ? 'Reset Password' : 'Login';

    const body: Record<string, any> = {
      to: [{ email: String(email || '').trim() }],
    };

    if (cleanSenderEmail) {
      body.sender = { email: cleanSenderEmail, name: cleanSenderName };
    }

    if (numericTemplate) {
      body.templateId = numericTemplate;
      body.params = {
        OTP: otpCode,
        CODE: otpCode,
        RESET_CODE: otpCode,
        PURPOSE: purpose,
        EXPIRY_MINUTES: 5,
        ...variables,
      };
    } else {
      body.subject = `Kode OTP ${subjectTitle} - ${cleanSenderName}`;
      body.htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-top: 0;">Kode OTP Verification</h2>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">Berikut adalah kode OTP Anda untuk ${purpose === 'reset-password' ? 'reset password' : 'masuk ke sistem'}:</p>
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827;">${otpCode}</span>
          </div>
          <p style="color: #6b7280; font-size: 13px; margin-bottom: 0;">Kode berlaku selama <strong>5 menit</strong>. Jangan bagikan kode ini kepada siapapun.</p>
        </div>
      `;
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': cleanApiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Brevo API Error (${res.status}):`, errText);
      return false;
    }

    console.log(`✅ Email OTP terkirim via Brevo API ke ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email via Brevo API:', error);
    return false;
  }
}

export async function sendOtp(
  email: string,
  code: string,
  purpose: 'login' | 'register' | 'reset-password' = 'login'
): Promise<void> {
  let providerConfigured = false;
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            'emailProvider',
            'kirisanToken',
            'kirisanChannelKey',
            'kirisanLoginOtpTemplateId',
            'kirisanRegisterOtpTemplateId',
            'kirisanResetPasswordTemplateId',
            'brevoApiKey',
            'brevoSenderEmail',
            'brevoSenderName',
            'brevoTemplateId',
            'senderEmail',
            'senderName',
          ],
        },
      },
    });

    const config: Record<string, string> = {};
    settings.forEach((s: any) => { config[s.key] = s.value; });

    const provider = config.emailProvider?.trim() || 'kirisan';

    if (provider === 'brevo') {
      const apiKey = config.brevoApiKey?.trim();
      const senderEmail = config.brevoSenderEmail?.trim() || config.senderEmail?.trim();
      const senderName = config.brevoSenderName?.trim() || config.senderName?.trim() || 'Client CRM';
      const templateId = config.brevoTemplateId?.trim();

      if (apiKey) {
        providerConfigured = true;
        const ok = await sendBrevoEmail(
          email,
          {
            otp: code,
            code: code,
            reset_code: code,
            purpose: purpose,
            expiry_minutes: 5,
          },
          apiKey,
          senderEmail,
          senderName,
          templateId
        );

        if (ok) return;

        throw new Error('Gagal mengirim email OTP via Brevo API. Periksa API Key atau domain pengirim di Pengaturan.');
      }
    } else {
      // Default: Kirisan API
      const token = config.kirisanToken?.trim();
      const channelKey = config.kirisanChannelKey?.trim();

      let templateId = config.kirisanLoginOtpTemplateId?.trim();
      if (purpose === 'register' && config.kirisanRegisterOtpTemplateId?.trim()) {
        templateId = config.kirisanRegisterOtpTemplateId.trim();
      } else if (purpose === 'reset-password' && config.kirisanResetPasswordTemplateId?.trim()) {
        templateId = config.kirisanResetPasswordTemplateId.trim();
      }

      if (token && channelKey && templateId) {
        providerConfigured = true;
        const ok = await sendKirisanEmail(
          email,
          {
            otp: code,
            code: code,
            reset_code: code,
            purpose: purpose,
            expiry_minutes: 5,
          },
          templateId,
          token,
          channelKey
        );

        if (ok) return;

        throw new Error('Gagal mengirim email OTP via Kirisan API. Periksa token, channel key, atau template ID di Pengaturan.');
      }
    }
  } catch (error: any) {
    console.error('Email send error:', error);
    if (error.message && (error.message.includes('Kirisan API') || error.message.includes('Brevo API'))) {
      throw error;
    }
  }

  // Fallback ke SMTP Nodemailer jika SMTP terkonfigurasi
  if (process.env.SMTP_HOST && transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: `Kode OTP ${purpose === 'reset-password' ? 'Reset Password' : 'Login'} - Client CRM`,
      text: `Kode OTP Anda: ${code}\n\nKode berlaku 5 menit.`,
      html: `<p>Kode OTP Anda:</p><h2 style="font-size:32px;letter-spacing:4px">${code}</h2><p>Kode berlaku <strong>5 menit</strong>.</p>`,
    });
    return;
  }

  // Jika provider tidak terkonfigurasi dan tidak ada SMTP, beri pesan error transparan
  if (!providerConfigured) {
    throw new Error('Pengiriman OTP belum lengkap. Silakan lengkapi konfigurasi Kirisan API atau Brevo API di Pengaturan.');
  }
}

