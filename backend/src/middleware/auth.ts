import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../lib/config';
import prisma from '../lib/prisma';

/**
 * SEC-1 + SEC-4 fix:
 * Extract JWT from Authorization Bearer header (preferred) OR HttpOnly cookie (fallback).
 * The cookie path is used when the browser reloads and the in-memory token is gone.
 * We do NOT use cookie-parser — we parse the Cookie header manually to avoid adding a dependency.
 */
function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);

  // HttpOnly cookie fallback
  const cookieHeader = req.headers.cookie ?? '';
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith('auth_token=')) {
      return decodeURIComponent(trimmed.slice('auth_token='.length));
    }
  }
  return undefined;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

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

    // SEC-1 fix: always enforce tokenVersion — stale/stolen tokens are rejected here
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
