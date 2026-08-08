import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { sendOtp } from '../lib/mailer';
import { JWT_SECRET } from '../lib/config';

const router = Router();
const OTP_EXPIRY_MINUTES = 5;

// Rate limit sensitive auth endpoints — both per-IP and per-key when possible.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: 'Terlalu banyak percobaan. Coba lagi beberapa menit.' },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: 'Terlalu banyak permintaan OTP. Coba lagi nanti.' },
});

// Verify a Cloudflare Turnstile token against the configured secret key.
// Returns true on success (or if no site key or secret key is configured).
async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['turnstileSiteKey', 'turnstileSecretKey', 'turnstileEnabled'] } },
  });
  const map: Record<string, string> = {};
  rows.forEach((r: any) => { map[r.key] = r.value; });

  const enabled = map.turnstileEnabled !== 'false';
  const siteKey = map.turnstileSiteKey?.trim();
  const secretKey = map.turnstileSecretKey?.trim();

  if (!enabled || !siteKey || !secretKey) return true; // Turnstile disabled or no keys configured → skip verification
  if (!token) return false;

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
    });
    const json: any = await res.json();
    return json?.success === true;
  } catch (err) {
    console.error('Turnstile verification failed:', err);
    return false;
  }
}

function generateToken(userId: number, email: string, role: string): string {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' });
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Public self-registration is disabled. Users must be created by an admin via /api/users.

// POST /api/auth/login (step 1: validate email+password → kirim OTP)
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, turnstileToken } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email dan password wajib diisi' });
      return;
    }

    // Verify Turnstile (if site key configured) — generic failure to avoid info leak.
    const tsOk = await verifyTurnstile(turnstileToken);
    if (!tsOk) {
      res.status(400).json({ error: 'Verifikasi CAPTCHA gagal atau belum diisi' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Email atau password salah' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Email atau password salah' });
      return;
    }

    // Generate OTP
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.otpCode.create({
      data: { email, code, expiresAt },
    });

    await sendOtp(email, code, 'login');

    res.json({ step: 'otp', email });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error?.message || 'Gagal login' });
  }
});

// POST /api/auth/otp/verify
router.post('/otp/verify', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ error: 'Email dan kode OTP wajib diisi' });
      return;
    }

    // RC #1 fix: Atomic updateMany — hanya satu request bisa "claim" OTP
    const updated = await prisma.otpCode.updateMany({
      where: { email, code, verified: false, expiresAt: { gt: new Date() } },
      data: { verified: true },
    });

    if (updated.count === 0) {
      res.status(401).json({ error: 'Kode OTP salah atau sudah digunakan' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'User tidak ditemukan' });
      return;
    }

    const token = generateToken(user.id, user.email, user.role);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal verifikasi OTP' });
  }
});

// POST /api/auth/otp/resend
router.post('/otp/resend', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email wajib diisi' });
      return;
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.otpCode.create({
      data: { email, code, expiresAt },
    });

    await sendOtp(email, code, 'login');

    res.json({ message: 'OTP dikirim ulang' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error?.message || 'Gagal mengirim OTP' });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(404).json({ error: 'User tidak ditemukan' });
      return;
    }

    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// PUT /api/auth/profile
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };

    const { name, email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email wajib diisi' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!existing) {
      res.status(404).json({ error: 'User tidak ditemukan' });
      return;
    }

    // RC #4 fix: Langsung update, tangkap unique constraint error
    let updatedUser;
    try {
      updatedUser = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: name !== undefined ? name : existing.name,
          email,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        res.status(400).json({ error: 'Email sudah digunakan oleh akun lain' });
        return;
      }
      throw err;
    }

    const newToken = generateToken(updatedUser.id, updatedUser.email, updatedUser.role);

    res.json({
      token: newToken,
      user: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role },
      message: 'Profil berhasil diperbarui',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal memperbarui profil' });
  }
});


// PUT /api/auth/change-password
router.put('/change-password', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Password saat ini dan password baru wajib diisi' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password baru minimal 6 karakter' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(404).json({ error: 'User tidak ditemukan' });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      res.status(400).json({ error: 'Password saat ini salah' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    res.json({ success: true, message: 'Password berhasil diubah' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mengubah password' });
  }
});

// POST /api/auth/forgot-password (minta OTP reset)
router.post('/forgot-password', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { email, turnstileToken } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email wajib diisi' });
      return;
    }

    const tsOk = await verifyTurnstile(turnstileToken);
    if (!tsOk) {
      res.status(400).json({ error: 'Verifikasi CAPTCHA gagal atau belum diisi' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Demi keamanan, tetap beri respon sukses meski email tidak terdaftar
      res.json({ message: 'Jika email terdaftar, kode OTP reset password akan dikirim' });
      return;
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.otpCode.create({
      data: { email, code, expiresAt },
    });

    await sendOtp(email, code, 'reset-password');

    res.json({ message: 'Kode OTP reset password telah dikirim ke email' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error?.message || 'Gagal memproses lupa password' });
  }
});

// POST /api/auth/reset-password (submit OTP + password baru)
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      res.status(400).json({ error: 'Email, OTP, dan password baru wajib diisi' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password baru minimal 6 karakter' });
      return;
    }

    // RC #2 fix: Atomic updateMany — hanya satu request bisa "claim" OTP reset
    const updated = await prisma.otpCode.updateMany({
      where: { email, code, verified: false, expiresAt: { gt: new Date() } },
      data: { verified: true },
    });

    if (updated.count === 0) {
      res.status(401).json({ error: 'Kode OTP salah atau sudah digunakan' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'User tidak ditemukan' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    res.json({ success: true, message: 'Password berhasil diperbarui. Silakan login kembali.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mereset password' });
  }
});

export default router;

