import { Env, SiteConfig } from '../types';

export async function initD1(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS site_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        ip TEXT NOT NULL,
        route TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (ip, route, window_start)
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS auth_tokens (
        token TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `),
  ]);
}

export async function checkRateLimit(
  db: D1Database,
  ip: string,
  route: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;

  const row = await db.prepare(
    'SELECT count FROM rate_limits WHERE ip = ? AND route = ? AND window_start = ?'
  ).bind(ip, route, windowStart).first<{ count: number }>();

  const currentCount = row?.count ?? 0;

  if (currentCount >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  await db.prepare(
    `INSERT INTO rate_limits (ip, route, window_start, count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(ip, route, window_start) DO UPDATE SET count = count + 1`
  ).bind(ip, route, windowStart).run();

  return { allowed: true, remaining: maxRequests - currentCount - 1 };
}

export async function createAuthToken(db: D1Database): Promise<string> {
  const token = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 86400; // 24 hours

  await db.prepare(
    'INSERT INTO auth_tokens (token, created_at, expires_at) VALUES (?, ?, ?)'
  ).bind(token, now, expiresAt).run();

  return token;
}

export async function validateAuthToken(db: D1Database, token: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(
    'SELECT 1 FROM auth_tokens WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first();

  return !!row;
}

export async function cleanupExpiredTokens(db: D1Database): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('DELETE FROM auth_tokens WHERE expires_at <= ?').bind(now).run();
}

export async function cleanupExpiredRateLimits(db: D1Database): Promise<void> {
  const cutoff = Math.floor(Date.now() / 1000) - 3600;
  await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(cutoff).run();
}

export async function getConfig(db: D1Database, key: string): Promise<SiteConfig | null> {
  const result = await db.prepare('SELECT * FROM site_config WHERE key = ?').bind(key).first();
  return result as SiteConfig | null;
}

export async function getAllConfig(db: D1Database): Promise<SiteConfig[]> {
  const result = await db.prepare('SELECT * FROM site_config').all();
  return result.results as unknown as SiteConfig[];
}

export async function setConfig(db: D1Database, key: string, value: string): Promise<void> {
  await db.prepare(`
    INSERT OR REPLACE INTO site_config (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `).bind(key, value).run();
}

export async function deleteConfig(db: D1Database, key: string): Promise<void> {
  await db.prepare('DELETE FROM site_config WHERE key = ?').bind(key).run();
}
