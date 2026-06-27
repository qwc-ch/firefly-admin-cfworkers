import { Hono } from 'hono';
import { Env } from '../types';
import { getConfig, getAllConfig, setConfig, deleteConfig, initD1 } from '../lib/d1';
import { getConfigFile, parseSiteConfig, saveConfigFile } from '../lib/github';

const config = new Hono<{ Bindings: Env }>();

// ===== Site Config (GitHub) =====

config.get('/site', async (c) => {
  try {
    const { content, sha } = await getConfigFile(c.env);
    const siteConfig = await parseSiteConfig(content);
    return c.json({ config: siteConfig, sha });
  } catch (error) {
    console.error('Failed to get site config:', error);
    return c.json({ error: 'Failed to get site config', detail: String(error) }, 500);
  }
});

config.put('/site', async (c) => {
  try {
    const { config: newConfig, sha, message } = await c.req.json() as {
      config: Record<string, any>;
      sha: string;
      message?: string;
    };
    await saveConfigFile(c.env, newConfig, sha, message || 'Update site config via admin');
    return c.json({ message: 'Site config saved successfully' });
  } catch (error) {
    console.error('Failed to save site config:', error);
    return c.json({ error: 'Failed to save site config', detail: String(error) }, 500);
  }
});

// ===== D1 Key-Value Config =====

config.get('/', async (c) => {
  try {
    const configs = await getAllConfig(c.env.DB);
    const result: Record<string, string> = {};
    for (const item of configs) {
      result[item.key] = item.value;
    }
    return c.json(result);
  } catch (error) {
    console.error('Failed to get config:', error);
    return c.json({ error: 'Failed to get config', detail: String(error) }, 500);
  }
});

config.get('/public', async (c) => {
  try {
    const configs = await getAllConfig(c.env.DB);
    const result: Record<string, string> = {};
    for (const item of configs) {
      if (item.key !== 'admin') {
        result[item.key] = item.value;
      }
    }
    return c.json(result);
  } catch (error) {
    console.error('Failed to get public config:', error);
    return c.json({ error: 'Failed to get public config', detail: String(error) }, 500);
  }
});

config.post('/', async (c) => {
  const body = await c.req.json();
  const { key, value } = body;

  if (!key || value === undefined) {
    return c.json({ error: 'Missing required fields: key, value' }, 400);
  }

  try {
    await setConfig(c.env.DB, key, typeof value === 'string' ? value : JSON.stringify(value));
    return c.json({ message: 'Config saved successfully' });
  } catch (error) {
    console.error('Failed to save config:', error);
    return c.json({ error: 'Failed to save config', detail: String(error) }, 500);
  }
});

config.delete('/:key', async (c) => {
  const key = c.req.param('key');
  try {
    await deleteConfig(c.env.DB, key);
    return c.json({ message: 'Config deleted successfully' });
  } catch (error) {
    console.error('Failed to delete config:', error);
    return c.json({ error: 'Failed to delete config', detail: String(error) }, 500);
  }
});

export default config;
