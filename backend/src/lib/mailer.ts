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

export async function sendOtp(
  email: string,
  code: string,
  purpose: 'login' | 'register' | 'reset-password' = 'login'
): Promise<void> {
  // 1. Coba kirim via Kirisan API jika settings terkonfigurasi
  let kirisanConfigured = false;
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            'kirisanToken',
            'kirisanChannelKey',
            'kirisanLoginOtpTemplateId',
            'kirisanRegisterOtpTemplateId',
            'kirisanResetPasswordTemplateId',
          ],
        },
      },
    });

    const config: Record<string, string> = {};
    settings.forEach((s: any) => { config[s.key] = s.value; });

    const token = config.kirisanToken?.trim();
    const channelKey = config.kirisanChannelKey?.trim();

    let templateId = config.kirisanLoginOtpTemplateId?.trim();
    if (purpose === 'register' && config.kirisanRegisterOtpTemplateId?.trim()) {
      templateId = config.kirisanRegisterOtpTemplateId.trim();
    } else if (purpose === 'reset-password' && config.kirisanResetPasswordTemplateId?.trim()) {
      templateId = config.kirisanResetPasswordTemplateId.trim();
    }

    if (token && channelKey && templateId) {
      kirisanConfigured = true;
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
  } catch (error: any) {
    console.error('Kirisan send error:', error);
    if (error.message && error.message.includes('Kirisan API')) {
      throw error;
    }
  }

  // 2. Fallback ke SMTP Nodemailer jika SMTP terkonfigurasi
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

  // 3. Jika Kirisan tidak terkonfigurasi dan tidak ada SMTP, beri pesan error transparan
  if (!kirisanConfigured) {
    throw new Error('Pengiriman OTP Kirisan belum lengkap (Account Token, Channel Key, dan Template ID wajib diisi di Pengaturan).');
  }
}
