import { Hono } from 'hono';
import { Env } from '../types';

const images = new Hono<{ Bindings: Env }>();

function imgBedEnv(c: { env: Env }) {
  if (!c.env.IMG_BED_URL) throw new Error('IMG_BED_URL not configured');
  const url = c.env.IMG_BED_URL.replace(/\/+$/, '');
  const token = c.env.IMG_BED_TOKEN;
  return { url, token };
}

images.get('/', async (c) => {
  const { url, token } = imgBedEnv(c);
  if (!token) return c.json({ error: 'Image bed token not configured' }, 500);

  try {
    const listUrl = new URL('/api/manage/list', url);
    listUrl.searchParams.set('dir', 'blog');
    listUrl.searchParams.set('recursive', 'true');
    listUrl.searchParams.set('count', '-1');

    const response = await fetch(listUrl.toString(), {
      headers: { 'Authorization': token },
    });

    if (!response.ok) {
      return c.json({ error: 'Failed to list images' }, 500);
    }

    const result = await response.json() as {
      files: Array<{ name: string; metadata: Record<string, string | number> }>;
    };

    const images = (result.files || []).map((f) => ({
      key: f.name,
      size: Number(f.metadata?.['FileSizeBytes'] || 0),
      url: `${url}/file/${f.name}`,
    }));

    return c.json(images);
  } catch {
    return c.json({ error: 'Failed to list images' }, 500);
  }
});

images.post('/upload', async (c) => {
  const { url, token } = imgBedEnv(c);
  if (!token) return c.json({ error: 'Image bed token not configured' }, 500);

  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  if (!file) return c.json({ error: 'No file provided' }, 400);

  const uploadForm = new FormData();
  uploadForm.append('file', file);

  const uploadUrl = new URL('/upload', url);
  uploadUrl.searchParams.set('uploadFolder', 'blog');

  try {
    const response = await fetch(uploadUrl.toString(), {
      method: 'POST',
      headers: { 'Authorization': token },
      body: uploadForm,
    });

    if (!response.ok) {
      return c.json({ error: 'Image bed upload failed' }, 500);
    }

    const result = await response.json() as Array<{ src: string; publicUrl?: string }>;
    const imageUrl = result[0]?.publicUrl || `${url}${result[0]?.src}`;
    return c.json({ url: imageUrl }, 201);
  } catch {
    return c.json({ error: 'Failed to upload to image bed' }, 500);
  }
});

images.delete('/:key{.+}', async (c) => {
  const { url, token } = imgBedEnv(c);
  if (!token) return c.json({ error: 'Image bed token not configured' }, 500);

  try {
    const deleteUrl = new URL(`/api/manage/delete/${c.req.param('key')}`, url);
    const response = await fetch(deleteUrl.toString(), {
      method: 'GET',
      headers: { 'Authorization': token },
    });

    if (!response.ok) {
      return c.json({ error: 'Failed to delete from image bed' }, 500);
    }

    return c.json({ message: 'Image deleted successfully' });
  } catch {
    return c.json({ error: 'Failed to delete from image bed' }, 500);
  }
});

export default images;
