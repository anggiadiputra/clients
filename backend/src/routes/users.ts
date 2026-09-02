import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { requireRole } from '../lib/rbac';

const router = Router();
const VALID_ROLES = ['ADMIN', 'STAFF', 'VIEWER'] as const;
type Role = typeof VALID_ROLES[number];

router.use(requireRole('ADMIN'));

/** Sentinel thrown inside transactions for business-logic failures. */
class TxError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'TxError';
  }
}

function publicUser(u: any) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt };
}

// GET /api/users
router.get('/', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(users.map(publicUser));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email dan password wajib diisi' }); return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password minimal 8 karakter' }); return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      res.status(400).json({ error: 'Password harus mengombinasikan huruf dan angka' }); return;
    }
    if (role && !VALID_ROLES.includes(role)) {
      res.status(400).json({ error: 'Role tidak valid' }); return;
    }
    const hashed = await bcrypt.hash(password, 10);
    let user;
    try {
      user = await prisma.user.create({
        data: { email, password: hashed, name: name || null, role: (role as Role) || 'STAFF' },
      });
    } catch (err: any) {
      if (err.code === 'P2002') { res.status(400).json({ error: 'Email sudah terdaftar' }); return; }
      throw err;
    }
    res.status(201).json(publicUser(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id/role
router.put('/:id/role', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { role } = req.body;

    if (!VALID_ROLES.includes(role)) {
      res.status(400).json({ error: 'Role tidak valid' }); return;
    }

    // Self-demotion is a deterministic check — no race possible, stays outside tx
    const me = req.authUser;
    if (id === me?.id && role !== 'ADMIN') {
      res.status(400).json({ error: 'Anda tidak dapat mengubah role Anda sendiri dari ADMIN' }); return;
    }

    // --- Serializable transaction: findUnique + count + update (atomic) ---
    const updated = await prisma.$transaction(
      async (tx) => {
        if (role !== 'ADMIN') {
          const targetUser = await tx.user.findUnique({ where: { id } });
          if (!targetUser) {
            throw new TxError('NOT_FOUND', 'User not found');
          }
          if (targetUser.role === 'ADMIN') {
            const adminCount = await tx.user.count({ where: { role: 'ADMIN' } });
            if (adminCount <= 1) {
              throw new TxError('LAST_ADMIN', 'Cannot demote the last admin');
            }
          }
        }

        return tx.user.update({
          where: { id },
          data: { role: role as Role, tokenVersion: { increment: 1 } },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    res.json(publicUser(updated));
  } catch (error: any) {
    if (error instanceof TxError) {
      if (error.code === 'NOT_FOUND') {
        res.status(404).json({ error: 'Pengguna tidak ditemukan' }); return;
      }
      if (error.code === 'LAST_ADMIN') {
        res.status(400).json({ error: 'Tidak dapat menurunkan role admin terakhir' }); return;
      }
    }

    if (error?.code === 'P2034') {
      res.status(409).json({ error: 'Permintaan bentrok dengan operasi lain. Silakan coba lagi.' }); return;
    }

    // Prisma record-not-found on update
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Pengguna tidak ditemukan' }); return;
    }

    console.error(error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);

    // Self-delete is a deterministic check — no race possible, stays outside tx
    const me = req.authUser;
    if (id === me?.id) {
      res.status(400).json({ error: 'Anda tidak dapat menghapus akun sendiri' }); return;
    }

    // --- Serializable transaction: findUnique + count + delete (atomic) ---
    await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({ where: { id } });
        if (!target) {
          throw new TxError('NOT_FOUND', 'User not found');
        }
        if (target.role === 'ADMIN') {
          const adminCount = await tx.user.count({ where: { role: 'ADMIN' } });
          if (adminCount <= 1) {
            throw new TxError('LAST_ADMIN', 'Cannot delete the last admin');
          }
        }

        await tx.user.delete({ where: { id } });
      },
      { isolationLevel: 'Serializable' },
    );

    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof TxError) {
      if (error.code === 'NOT_FOUND') {
        res.status(404).json({ error: 'Pengguna tidak ditemukan' }); return;
      }
      if (error.code === 'LAST_ADMIN') {
        res.status(400).json({ error: 'Tidak dapat menghapus admin terakhir' }); return;
      }
    }

    if (error?.code === 'P2034') {
      res.status(409).json({ error: 'Permintaan bentrok dengan operasi lain. Silakan coba lagi.' }); return;
    }

    // Prisma record-not-found on delete
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Pengguna tidak ditemukan' }); return;
    }

    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST /api/users/:id/reset-password
router.post('/:id/reset-password', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) { res.status(400).json({ error: 'Password baru minimal 8 karakter' }); return; }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      res.status(400).json({ error: 'Password baru harus mengombinasikan huruf dan angka' }); return;
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed, tokenVersion: { increment: 1 } } });
    res.json({ success: true, message: 'Password berhasil direset' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
