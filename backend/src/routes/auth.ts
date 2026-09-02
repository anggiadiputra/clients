import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { sendOtp } from '../lib/mailer';
import { JWT_SECRET, IS_PRODUCTION } from '../lib/config';
import { requireAuth } from '../middleware/auth';

const router = Router();
const OTP_EXPIRY_MINUTES = 5;

// ─── Rate limiters ──────────────────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
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

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
    const ip = req.ip || 'unknown';
    return email ? `${ip}_${email}` : ip;
  },
  message: { error: 'Terlalu banyak percobaan verifikasi OTP. Coba lagi nanti.' },
});

// ─── Cookie helpers (SEC-4) ──────────────────────────────────────────────────

/**
 * Set the JWT as an HttpOnly, SameSite=Strict cookie so it is inaccessible
 * to JavaScript and therefore immune to XSS-based token theft.
 */
function setAuthCookie(res: Response, token: string): void {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: IS_PRODUCTION,   // HTTPS-only in production
    sameSite: 'strict',      // No cross-site requests
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches JWT expiry)
    path: '/',
  });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    path: '/',
  });
}

// ─── Cloudflare Turnstile ────────────────────────────────────────────────────

async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['turnstileSiteKey', 'turnstileSecretKey', 'turnstileEnabled'] } },
  });
  const map: Record<string, string> = {};
  rows.forEach((r: any) => { map[r.key] = r.value; });

  const enabled = map.turnstileEnabled !== 'false';
  const siteKey = map.turnstileSiteKey?.trim();
  const secretKey = map.turnstileSecretKey?.trim();

  if (!enabled || !siteKey || !secretKey) return true;
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

// ─── Token / OTP generators ──────────────────────────────────────────────────

function generateToken(userId: number, email: string, role: string, tokenVersion: number): string {
  return jwt.sign({ userId, email, role, tokenVersion }, JWT_SECRET, { expiresIn: '7d' });
}

function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * SEC-3 fix: Invalidate all existing unverified OTPs for an email before
 * creating a new one. This prevents OTP accumulation and OTP bombing.
 */
async function invalidateExistingOtps(email: string): Promise<void> {
  await prisma.otpCode.updateMany({
    where: { email, verified: false },
    data: { verified: true },
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/auth/login  (step 1: validate email+password → send OTP)
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, turnstileToken } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email dan password wajib diisi' });
      return;
    }

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

    // SEC-3 fix: clear stale OTPs before issuing a new one
    await invalidateExistingOtps(email);

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await prisma.otpCode.create({ data: { email, code, expiresAt } });

    await sendOtp(email, code, 'login');

    res.json({ step: 'otp', email });
  } catch (error) {
    // SEC-6 fix: never expose internal error details to the client
    console.error(error);
    res.status(500).json({ error: 'Gagal login' });
  }
});

// POST /api/auth/otp/verify
router.post('/otp/verify', otpVerifyLimiter, async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ error: 'Email dan kode OTP wajib diisi' });
      return;
    }

    // Atomic claim — only one concurrent request can flip verified=false → true
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

    const token = generateToken(user.id, user.email, user.role, user.tokenVersion);

    // SEC-4 fix: set token as HttpOnly cookie (inaccessible to JS / XSS)
    setAuthCookie(res, token);

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

    // SEC-2 fix: verify user exists (respond generically to avoid email enumeration)
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success-like response to avoid revealing whether the email exists
      res.json({ message: 'OTP dikirim ulang' });
      return;
    }

    // SEC-2 fix: verify there is an active OTP session (user completed step-1)
    const hasPending = await prisma.otpCode.findFirst({
      where: { email, verified: false, expiresAt: { gt: new Date() } },
    });
    if (!hasPending) {
      res.status(400).json({ error: 'Tidak ada sesi OTP aktif. Silakan mulai login kembali.' });
      return;
    }

    // SEC-3 fix: invalidate existing OTPs before issuing a fresh one
    await invalidateExistingOtps(email);

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await prisma.otpCode.create({ data: { email, code, expiresAt } });

    await sendOtp(email, code, 'login');

    res.json({ message: 'OTP dikirim ulang' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mengirim OTP' });
  }
});

// GET /api/auth/me
// SEC-1 fix: use requireAuth middleware (validates tokenVersion) instead of manual JWT parse
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
    if (!user) {
      res.status(404).json({ error: 'User tidak ditemukan' });
      return;
    }
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch {
    res.status(500).json({ error: 'Gagal mengambil data user' });
  }
});

// PUT /api/auth/profile
// SEC-1 fix: use requireAuth middleware (validates tokenVersion) instead of manual JWT parse
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email wajib diisi' });
      return;
    }

    let updatedUser;
    try {
      updatedUser = await prisma.user.update({
        where: { id: req.authUser!.id },
        data: {
          name: name !== undefined ? name : undefined,
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

    const newToken = generateToken(updatedUser.id, updatedUser.email, updatedUser.role, updatedUser.tokenVersion);

    // SEC-4 fix: refresh the HttpOnly cookie with the new token
    setAuthCookie(res, newToken);

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
// SEC-1 fix: use requireAuth middleware (validates tokenVersion) instead of manual JWT parse
router.put('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Password saat ini dan password baru wajib diisi' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password baru minimal 6 karakter' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
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
      data: { password: hashed, tokenVersion: { increment: 1 } },
    });

    // SEC-4 fix: clear cookie — client must log in again with the new password.
    // This also forces all other sessions (other browsers/tabs using the old cookie) to log out.
    clearAuthCookie(res);

    res.json({ success: true, message: 'Password berhasil diubah. Silakan login kembali.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mengubah password' });
  }
});

// POST /api/auth/forgot-password
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
      // Generic response — do not leak whether the email exists
      res.json({ message: 'Jika email terdaftar, kode OTP reset password akan dikirim' });
      return;
    }

    // SEC-3 fix: clear old OTPs before issuing a new one
    await invalidateExistingOtps(email);

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await prisma.otpCode.create({ data: { email, code, expiresAt } });

    await sendOtp(email, code, 'reset-password');

    res.json({ message: 'Kode OTP reset password telah dikirim ke email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal memproses lupa password' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', otpVerifyLimiter, async (req: Request, res: Response) => {
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

    // Atomic OTP claim
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
      data: { password: hashed, tokenVersion: { increment: 1 } },
    });

    res.json({ success: true, message: 'Password berhasil diperbarui. Silakan login kembali.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mereset password' });
  }
});

// POST /api/auth/logout  (SEC-4 fix: clear HttpOnly cookie server-side)
router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

export default router;
