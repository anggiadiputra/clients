import { Router, type Request, type Response } from 'express';
import prisma from '../lib/prisma';
import { requireRole, PAGE_KEYS } from '../lib/rbac';
import { requireAuth } from '../middleware/auth';

const router = Router();
const VALID_ROLES = ['ADMIN', 'STAFF', 'VIEWER'] as const;

/** Sentinel thrown inside transactions for business-logic failures. */
class TxError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'TxError';
  }
}

router.get('/me', requireAuth, async (req, res) => {
  try {
    const me = req.authUser;
    if (!me) { res.status(401).json({ error: 'Unauthorized' }); return; }
    if (me.role === 'ADMIN') {
      const all = PAGE_KEYS.map((pageKey) => ({ role: 'ADMIN', pageKey, allowed: true }));
      res.json(all); return;
    }
    const rows = await prisma.pageAccess.findMany({ where: { role: me.role as any } });
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch access' });
  }
});

router.use(requireRole('ADMIN'));

router.get('/', async (_req, res) => {
  try {
    const rows = await prisma.pageAccess.findMany();
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch access matrix' });
  }
});

router.put('/:role/:pageKey', async (req, res) => {
  try {
    const role = req.params.role as string;
    const pageKey = req.params.pageKey as string;
    const { allowed } = req.body;

    if (!VALID_ROLES.includes(role as any)) { res.status(400).json({ error: 'Role tidak valid' }); return; }
    if (!PAGE_KEYS.includes(pageKey as any)) { res.status(400).json({ error: 'PageKey tidak dikenal' }); return; }
    if (typeof allowed !== 'boolean') { res.status(400).json({ error: 'allowed harus boolean' }); return; }

    const me = req.authUser;

    let row: any;

    if (role === me?.role) {
      // --- Serializable transaction: count + upsert (atomic) ---
      // Prevents two concurrent admins from both passing the lockout guard
      // and concurrently disabling their own access.
      row = await prisma.$transaction(
        async (tx) => {
          if (!allowed) {
            const adminCount = await tx.user.count({ where: { role: 'ADMIN' } });
            if (adminCount <= 1) {
              throw new TxError(
                'LAST_ADMIN_LOCKOUT',
                'Cannot disable own access as the last admin',
              );
            }
          }

          return tx.pageAccess.upsert({
            where: { role_pageKey: { role: role as any, pageKey } },
            update: { allowed },
            create: { role: role as any, pageKey, allowed },
          });
        },
        { isolationLevel: 'Serializable' },
      );
    } else {
      // No "last admin" concern — upsert directly, no transaction needed
      row = await prisma.pageAccess.upsert({
        where: { role_pageKey: { role: role as any, pageKey } },
        update: { allowed },
        create: { role: role as any, pageKey, allowed },
      });
    }

    res.json(row);
  } catch (error: any) {
    if (error instanceof TxError && error.code === 'LAST_ADMIN_LOCKOUT') {
      res.status(400).json({ error: 'Tidak dapat menonaktifkan akses Anda sendiri sebagai admin terakhir' }); return;
    }

    if (error?.code === 'P2034') {
      res.status(409).json({ error: 'Permintaan bentrok dengan operasi lain. Silakan coba lagi.' }); return;
    }

    console.error(error);
    res.status(500).json({ error: 'Failed to update access' });
  }
});

export default router;
