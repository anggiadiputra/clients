import { Router, type Request, type Response } from 'express';
import prisma from '../lib/prisma';
import { requireRole, PAGE_KEYS } from '../lib/rbac';
import { requireAuth } from '../middleware/auth';

const router = Router();

const VALID_ROLES = ['ADMIN', 'STAFF', 'VIEWER'] as const;

// Public-for-authenticated: get current user's effective access rows.
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const me = req.authUser;
    if (!me) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    // Admin bypasses the matrix — return all allowed=true rows.
    if (me.role === 'ADMIN') {
      const all = PAGE_KEYS.map((pageKey) => ({ role: 'ADMIN', pageKey, allowed: true }));
      res.json(all);
      return;
    }
    const rows = await prisma.pageAccess.findMany({ where: { role: me.role as any } });
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch access' });
  }
});

router.use(requireRole('ADMIN'));

// GET /api/access
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.pageAccess.findMany();
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch access matrix' });
  }
});

// PUT /api/access/:role/:pageKey
router.put('/:role/:pageKey', async (req: Request, res: Response) => {
  try {
    const role = req.params.role as string;
    const pageKey = req.params.pageKey as string;
    const { allowed } = req.body;

    if (!VALID_ROLES.includes(role as any)) {
      res.status(400).json({ error: 'Role tidak valid' });
      return;
    }
    if (!PAGE_KEYS.includes(pageKey as any)) {
      res.status(400).json({ error: 'PageKey tidak dikenal' });
      return;
    }
    if (typeof allowed !== 'boolean') {
      res.status(400).json({ error: 'allowed harus boolean' });
      return;
    }

    const me = req.authUser;
    // Prevent admin from locking themselves out of essential pages
    if (role === me?.role) {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1 && !allowed) {
        res.status(400).json({ error: 'Tidak dapat menonaktifkan akses Anda sendiri sebagai admin terakhir' });
        return;
      }
    }

    const row = await prisma.pageAccess.upsert({
      where: { role_pageKey: { role: role as any, pageKey } },
      update: { allowed },
      create: { role: role as any, pageKey, allowed },
    });

    res.json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update access' });
  }
});

export default router;
