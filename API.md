# API Endpoints

## Public Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API info |
| GET | `/health` | Health check |
| GET | `/api/config/public` | Public site config |

## Authentication

### Login

```
POST /api/auth/login
Authorization: Basic base64(username:password)
```

Returns a Bearer token (valid 24h):

```json
{
  "token": "uuid-string",
  "expires_in": 86400
}
```

### Authenticated Requests

All protected routes require a Bearer token:

```
Authorization: Bearer <token>
```

## Protected Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/posts` | List all posts |
| GET | `/api/posts/:slug` | Get post content |
| POST | `/api/posts` | Create new post |
| PUT | `/api/posts/:slug` | Update post |
| DELETE | `/api/posts/:slug` | Delete post |
| GET | `/api/config` | Get all config |
| GET | `/api/config/site` | Get site config from GitHub |
| PUT | `/api/config/site` | Save site config to GitHub |
| POST | `/api/config` | Save D1 config |
| DELETE | `/api/config/:key` | Delete D1 config |
| GET | `/api/images` | List images |
| POST | `/api/images/upload` | Upload image |
| DELETE | `/api/images/:key` | Delete image |

## Rate Limiting

| Route | Limit | Window |
|-------|-------|--------|
| `/api/auth/login` | 10 requests | 15 minutes |
| All other `/api/*` | 100 requests | 1 minute |

IPs listed in `ADMIN_IPS` are exempt.

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
| `ADMIN_IPS` | Whitelisted IPs (comma-separated) |
| `IMG_BED_URL` | Image bed service URL |
| `IMG_BED_TOKEN` | Image bed API token |
