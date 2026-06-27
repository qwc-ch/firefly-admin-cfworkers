# AGENTS.md

## What this is

Cloudflare Workers admin API for the "Firefly" blog. Hono framework, D1 (site config), R2 (images), GitHub Contents API (posts as Markdown files in a separate repo).

## Commands

```bash
pnpm install        # install deps
pnpm dev            # local dev server (wrangler dev)
pnpm deploy         # deploy to Cloudflare
pnpm cf-typegen     # regenerate worker types from wrangler.toml
```

No test suite, linter, or formatter configured.

## Required env vars

Set via `.dev.vars` (local) or Cloudflare dashboard (production). Do **not** commit `.dev.vars`.

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | PAT for GitHub Contents API (read/write blog posts) |
| `ADMIN_JSON` | JSON `{"username":"...","password":"..."}` for Basic Auth |

Others (`GITHUB_OWNER`, `GITHUB_REPO`, `POSTS_PATH`, `BLOG_URL`) are in `wrangler.toml`.

## Architecture

- **Entry**: `src/index.ts` — Hono app, mounts routes, runs D1 init on every `/api/*` request
- **Routes**: `src/routes/{posts,config,images}.ts`
- **Lib**: `src/lib/{github,d1,r2}.ts` — GitHub API, D1 queries, R2 operations
- **Types**: `src/types.ts` — `Env` binding interface, `PostMeta`, `PostFile`, `SiteConfig`
- **Auth**: `src/middleware/auth.ts` — Basic Auth on all `/api/*` routes

Posts live in a GitHub repo (path: `src/content/posts`). This API proxies CRUD operations to that repo via the GitHub Contents API.

## Key gotchas

- D1 `site_config` table is created via `CREATE TABLE IF NOT EXISTS` on every `/api/*` request — no migration system.
- `wrangler.toml` `database_id` is environment-specific; do not copy blindly.
- Frontmatter parsing in `src/lib/github.ts` is hand-rolled (not a YAML lib). Covers the fields the blog uses; exotic YAML will break.
- `nodejs_compat` flag is required (`wrangler.toml`).
- Local dev needs `.dev.vars` with `GITHUB_TOKEN` and `ADMIN_JSON` or auth/db calls will fail silently.
