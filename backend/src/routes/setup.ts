import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { invalidateSettingsCache } from './settings';

const router = Router();

/** Sentinel thrown inside transactions for business-logic failures. */
class TxError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'TxError';
  }
}

// GET /api/setup/status
router.get('/status', async (_req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ needsSetup: userCount === 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal memeriksa status instalasi' });
  }
});

// POST /api/setup
router.post('/', async (req, res) => {
  try {
    const { name, email, password, projectName } = req.body;

    // --- Validation (outside transaction — fast, no DB locks needed) ---
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password minimal 8 karakter.' });
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password harus mengombinasikan huruf dan angka.' });
    }

    // --- Hash BEFORE transaction (bcrypt is slow; must not hold DB locks) ---
    const hashedPassword = await bcrypt.hash(String(password), 10);

    // --- Serializable transaction: count check → create user (atomic) ---
    const adminUser = await prisma.$transaction(
      async (tx) => {
        const userCount = await tx.user.count();
        if (userCount > 0) {
          throw new TxError('ALREADY_SETUP', 'Setup already completed');
        }

        return tx.user.create({
          data: {
            name: String(name).trim(),
            email: String(email).trim().toLowerCase(),
            password: hashedPassword,
            role: 'ADMIN',
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    // --- Non-critical work outside transaction ---
    if (projectName && String(projectName).trim()) {
      await prisma.setting.upsert({
        where: { key: 'projectName' },
        update: { value: String(projectName).trim() },
        create: { key: 'projectName', value: String(projectName).trim() },
      });
      invalidateSettingsCache();
    }

    res.json({
      success: true,
      message: 'Instalasi berhasil! Akun administrator telah dibuat.',
      user: { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role },
    });
  } catch (error: any) {
    if (error instanceof TxError && error.code === 'ALREADY_SETUP') {
      return res.status(403).json({ error: 'Instalasi sudah selesai. Setup tidak dapat dijalankan ulang.' });
    }

    // MySQL Serializable can produce deadlocks (P2034) under concurrent writes
    if (error?.code === 'P2034') {
      return res.status(409).json({ error: 'Permintaan bentrok dengan operasi lain. Silakan coba lagi.' });
    }

    console.error(error);
    res.status(500).json({ error: 'Gagal menyelesaikan instalasi.' });
  }
});

export default router;
