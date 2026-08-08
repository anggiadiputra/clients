import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { requireRole } from '../lib/rbac';

const router = Router();

const VALID_ROLES = ['ADMIN', 'STAFF', 'VIEWER'] as const;
type Role = typeof VALID_ROLES[number];

// All other user-management routes require ADMIN role
router.use(requireRole('ADMIN'));

function publicUser(u: any) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt };
}

// GET /api/users
router.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(users.map(publicUser));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email dan password wajib diisi' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password minimal 6 karakter' });
      return;
    }
    if (role && !VALID_ROLES.includes(role)) {
      res.status(400).json({ error: 'Role tidak valid' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);

    let user;
    try {
      user = await prisma.user.create({
        data: {
          email,
          password: hashed,
          name: name || null,
          role: (role as Role) || 'STAFF',
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        res.status(400).json({ error: 'Email sudah terdaftar' });
        return;
      }
      throw err;
    }

    res.status(201).json(publicUser(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id/role
router.put('/:id/role', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { role } = req.body;

    if (!VALID_ROLES.includes(role)) {
      res.status(400).json({ error: 'Role tidak valid' });
      return;
    }

    const me = req.authUser;
    // Admin cannot demote themselves (would lock them out)
    if (id === me?.id && role !== 'ADMIN') {
      res.status(400).json({ error: 'Anda tidak dapat mengubah role Anda sendiri dari ADMIN' });
      return;
    }

    // Prevent removing the last admin
    if (role !== 'ADMIN') {
      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (targetUser?.role === 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
        if (adminCount <= 1) {
          res.status(400).json({ error: 'Tidak dapat menurunkan role admin terakhir' });
          return;
        }
      }
    }

    const updated = await prisma.user.update({ where: { id }, data: { role: role as Role } });
    res.json(publicUser(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const me = req.authUser;
    if (id === me?.id) {
      res.status(400).json({ error: 'Anda tidak dapat menghapus akun sendiri' });
      return;
    }

    // Prevent deleting the last admin
    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Tidak dapat menghapus admin terakhir' });
        return;
      }
    }

    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST /api/users/:id/reset-password
router.post('/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Password baru minimal 6 karakter' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });
    res.json({ success: true, message: 'Password berhasil direset' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
