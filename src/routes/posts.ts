import { Hono } from 'hono';
import { Env } from '../types';
import { listPosts, getPost, createPost, updatePost, deletePost } from '../lib/github';

const posts = new Hono<{ Bindings: Env }>();

posts.get('/', async (c) => {
  try {
    const posts = await listPosts(c.env);
    return c.json(posts.map(p => ({
      slug: p.slug,
      ...p.frontmatter,
    })));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: 'Failed to list posts', detail: message }, 500);
  }
});

posts.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  try {
    const post = await getPost(c.env, slug);
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    return c.json({
      slug: post.slug,
      ...post.frontmatter,
      content: post.content,
    });
  } catch (error) {
    return c.json({ error: 'Failed to get post' }, 500);
  }
});

posts.post('/', async (c) => {
  const body = await c.req.json();
  const { slug, frontmatter, content } = body;

  if (!slug || !frontmatter || !content) {
    return c.json({ error: 'Missing required fields: slug, frontmatter, content' }, 400);
  }

  try {
    await createPost(c.env, slug, frontmatter, content);
    return c.json({ message: 'Post created successfully' }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create post' }, 500);
  }
});

posts.put('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json();
  const { frontmatter, content } = body;

  if (!frontmatter || !content) {
    return c.json({ error: 'Missing required fields: frontmatter, content' }, 400);
  }

  try {
    await updatePost(c.env, slug, frontmatter, content);
    return c.json({ message: 'Post updated successfully' });
  } catch (error) {
    return c.json({ error: 'Failed to update post' }, 500);
  }
});

posts.delete('/:slug', async (c) => {
  const slug = c.req.param('slug');
  try {
    await deletePost(c.env, slug);
    return c.json({ message: 'Post deleted successfully' });
  } catch (error) {
    return c.json({ error: 'Failed to delete post' }, 500);
  }
});

export default posts;
