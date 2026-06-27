import { Context, Next } from 'hono';
import { Env } from '../types';
import { validateAuthToken } from '../lib/d1';

export async function verifyBasicAuth(c: Context<{ Bindings: Env }>): Promise<boolean> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) return false;

  const base64 = authHeader.slice(6);
  const decoded = atob(base64);
  const [username, password] = decoded.split(':');

  if (!c.env.ADMIN_JSON) return false;
  const adminUser = JSON.parse(c.env.ADMIN_JSON) as { username: string; password: string };

  return username === adminUser.username && password === adminUser.password;
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const valid = await validateAuthToken(c.env.DB, token);
    if (!valid) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }
    await next();
    return;
  }

  return c.json({ error: 'Unauthorized' }, 401);
}
