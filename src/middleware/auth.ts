import { Context, Next } from 'hono';
import { Env } from '../types';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const base64 = authHeader.slice(6);
  const decoded = atob(base64);
  const [username, password] = decoded.split(':');

  if (!c.env.ADMIN_JSON) return c.json({ error: 'Server misconfigured' }, 500);
  const adminUser = JSON.parse(c.env.ADMIN_JSON) as { username: string; password: string };

  if (username !== adminUser.username || password !== adminUser.password) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  await next();
}
