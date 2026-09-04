import type { Request, Response, NextFunction } from 'express';
import prisma from './prisma';

export const PAGE_KEYS = [
  'dashboard',
  'clients',
  'kanban',
  'projects',
  'invoices',
  'services',
  'profile',
  'users',
  'access',
  'settings',
  'export',
] as const;

export type PageKey = typeof PAGE_KEYS[number];

// Tag the authenticated request with the user record (lightweight) so we can read role.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: { id: number; email: string; role: string };
    }
  }
}

/** Returns true when the PageAccess table has a row granting access. Admins bypass. Default: false. */
export async function canAccess(role: string, pageKey: string): Promise<boolean> {
  if (role === 'ADMIN') return true;
  const row = await prisma.pageAccess.findUnique({
    where: { role_pageKey: { role: role as any, pageKey } },
  });
  return !!row?.allowed;
}

/** Factory: middleware that requires a specific role (e.g. ADMIN). */
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auth = req.authUser;
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(auth.role)) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }
    next();
  };
}

/** Factory: middleware that requires the user's role to have access to a pageKey. */
export function requirePageAccess(pageKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auth = req.authUser;
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const ok = await canAccess(auth.role, pageKey);
    if (!ok) {
      res.status(403).json({ error: `Forbidden: no access to ${pageKey}` });
      return;
    }
    next();
  };
}

/**
 * SECURITY: prevent the read-only VIEWER role from any non-GET (mutating)
 * request. `requirePageAccess` only checks whether a role can view a page — a
 * VIEWER who has page access could otherwise create/update/delete records.
 * Apply this to routers that contain write endpoints (clients, invoices,
 * services, projects). ADMIN and STAFF pass through unchanged.
 */
export function requireWriteAccess(req: Request, res: Response, next: NextFunction) {
  const auth = req.authUser;
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (auth.role === 'VIEWER' && req.method !== 'GET') {
    res.status(403).json({ error: 'Forbidden: VIEWER hanya dapat melihat data' });
    return;
  }
  next();
}
