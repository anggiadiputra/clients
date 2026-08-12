/**
 * Centralized config. Fail fast on missing required secrets in production.
 */

const NODE_ENV = process.env.NODE_ENV || 'development';

function requireSecret(name: string, devFallback?: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (NODE_ENV === 'production') {
    throw new Error(`${name} is required in production. Set it in the environment.`);
  }
  if (devFallback !== undefined) return devFallback;
  throw new Error(`${name} is not set.`);
}

export const JWT_SECRET = requireSecret('JWT_SECRET', 'dev-secret-change-me');
export const IS_PRODUCTION = NODE_ENV === 'production';
export const ALLOWED_ORIGINS: string[] = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'];

