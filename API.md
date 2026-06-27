# API Endpoints

## Public Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API info |
| GET | `/health` | Health check |
| GET | `/img/:key` | Image proxy (public) |
| GET | `/api/config/public` | Public site config |

## Protected Routes (Basic Auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/posts` | List all posts |
| GET | `/api/posts/:slug` | Get post content |
| POST | `/api/posts` | Create new post |
| PUT | `/api/posts/:slug` | Update post |
| DELETE | `/api/posts/:slug` | Delete post |
| GET | `/api/config` | Get all config |
| POST | `/api/config` | Save config |
| DELETE | `/api/config/:key` | Delete config |
| GET | `/api/images` | List images |
| POST | `/api/images/upload` | Upload image |
| DELETE | `/api/images/:key` | Delete image |

## Authentication

All protected routes require Basic Auth header:

```
Authorization: Basic base64(username:password)
```

Example:
```bash
curl -u admin:password http://localhost:8787/api/posts
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub personal access token |
| `GITHUB_OWNER` | GitHub repository owner |
| `GITHUB_REPO` | GitHub repository name |
| `GITHUB_BRANCH` | Target branch (default: main) |
| `POSTS_PATH` | Path to posts directory |
| `BLOG_URL` | Blog URL for CORS |
| `ADMIN_JSON` | Admin credentials JSON |

