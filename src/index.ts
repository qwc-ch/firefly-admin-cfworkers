import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { authMiddleware, verifyBasicAuth } from './middleware/auth';
import { rateLimiterAuth, rateLimiterApi } from './middleware/rateLimiter';
import posts from './routes/posts';
import config from './routes/config';
import images from './routes/images';
import { initD1, createAuthToken, cleanupExpiredTokens, cleanupExpiredRateLimits } from './lib/d1';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: (origin, c) => c.env.BLOG_URL,
}));

app.get('/', (c) => {
  return c.json({
    name: 'Firefly Admin API',
    version: '1.0.0',
    description: 'REST API for Firefly blog administration',
  });
});

// Initialize database + periodic cleanup on first request
app.use('/api/*', async (c, next) => {
  await initD1(c.env.DB);
  await cleanupExpiredTokens(c.env.DB);
  await cleanupExpiredRateLimits(c.env.DB);
  await next();
});

// Login endpoint: rate-limited, no bearer token required
app.use('/api/auth/login', rateLimiterAuth);
app.post('/api/auth/login', async (c) => {
  const ok = await verifyBasicAuth(c);
  if (!ok) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }
  const token = await createAuthToken(c.env.DB);
  return c.json({ token, expires_in: 86400 });
});

// Protected API routes
app.use('/api/*', rateLimiterApi);
app.use('/api/*', authMiddleware);
app.route('/api/posts', posts);
app.route('/api/config', config);
app.route('/api/images', images);

// Health check (no auth)
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

export default app;
