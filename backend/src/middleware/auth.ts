import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../lib/config';
import prisma from '../lib/prisma';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string; tokenVersion?: number };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Invalidate stale token if tokenVersion is missing or outdated
    if (payload.tokenVersion === undefined || user.tokenVersion !== payload.tokenVersion) {
      res.status(401).json({ error: 'Sesi telah berakhir atau password telah diubah. Silakan login kembali.' });
      return;
    }

    req.authUser = { id: user.id, email: user.email, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
