import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { authMiddleware } from './middleware/auth';
import posts from './routes/posts';
import config from './routes/config';
import images from './routes/images';
import { initD1 } from './lib/d1';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.get('/', (c) => {
  return c.json({
    name: 'Firefly Admin API',
    version: '1.0.0',
    description: 'REST API for Firefly blog administration',
  });
});

// Initialize database on first request
app.use('/api/*', async (c, next) => {
  await initD1(c.env.DB);
  await next();
});

// Protected API routes
app.use('/api/*', authMiddleware);
app.route('/api/posts', posts);
app.route('/api/config', config);
app.route('/api/images', images);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

export default app;
