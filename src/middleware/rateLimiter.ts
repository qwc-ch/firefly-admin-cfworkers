import { Context, Next } from 'hono';
import { Env } from '../types';
import { checkRateLimit } from '../lib/d1';

const AUTH_LIMIT = 10;
const AUTH_WINDOW = 900; // 15 minutes
const API_LIMIT = 100;
const API_WINDOW = 60; // 1 minute

function clientIp(c: Context<{ Bindings: Env }>): string {
  return c.req.header('cf-connecting-ip')
    || c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
}

export async function rateLimiterAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const result = await checkRateLimit(c.env.DB, clientIp(c), 'auth', AUTH_LIMIT, AUTH_WINDOW);
  if (!result.allowed) {
    return c.json({ error: 'Too many attempts. Try again later.' }, 429);
  }
  await next();
}

export async function rateLimiterApi(c: Context<{ Bindings: Env }>, next: Next) {
  const result = await checkRateLimit(c.env.DB, clientIp(c), 'api', API_LIMIT, API_WINDOW);
  if (!result.allowed) {
    return c.json({ error: 'Rate limit exceeded. Slow down.' }, 429);
  }
  await next();
}
