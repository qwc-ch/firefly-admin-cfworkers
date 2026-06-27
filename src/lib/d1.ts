import { Env, SiteConfig } from '../types';

export async function initD1(db: D1Database): Promise<void> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS site_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
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
