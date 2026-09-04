/**
 * Centralized config. Fail fast on missing required secrets in production.
 */

const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

const DEV_FALLBACK_JWT = 'dev-secret-change-me';

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (IS_PRODUCTION) {
    if (!secret || secret === DEV_FALLBACK_JWT || secret.trim().length < 32) {
      throw new Error(
        'FATAL SECURITY ERROR: In production, JWT_SECRET must be explicitly set to a cryptographically secure string of at least 32 characters.'
      );
    }
    return secret;
  }
  return secret || DEV_FALLBACK_JWT;
}

export const JWT_SECRET = resolveJwtSecret();
export const ALLOWED_ORIGINS: string[] = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'https://crm.diurusin.id', 'https://apis.diurusin.id'];
// Sliding-session inactivity timeout (minutes). A user is auto-logged-out after
// this many minutes without any authenticated request. Default 30 (aligned with
// dash.ekstensi.id). Configure via SESSION_TIMEOUT_MIN in .env if needed.
export const SESSION_TIMEOUT_MIN = parseInt(process.env.SESSION_TIMEOUT_MIN || '30', 10);

