import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { invalidateSettingsCache } from './settings';

const router = Router();

// GET /api/setup/status — check if system needs initial installation
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ needsSetup: userCount === 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal memeriksa status instalasi' });
  }
});

// POST /api/setup — perform initial installation (create first admin user & brand settings)
router.post('/', async (req: Request, res: Response) => {
  try {
    // Security check: ensure setup can only run ONCE when database has zero users
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return res.status(403).json({ error: 'Instalasi sudah selesai. Setup tidak dapat dijalankan ulang.' });
    }

    const { name, email, password, projectName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter.' });
    }

    // 1. Hash password & create primary Admin user
    const hashedPassword = await bcrypt.hash(String(password), 10);
    const adminUser = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    // 2. Initialize default brand settings if project name provided
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
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal menyelesaikan instalasi.' });
  }
});

export default router;
