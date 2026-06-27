# Firefly Admin API

基于 [Hono](https://hono.dev/) 的 Cloudflare Workers 博客管理 API，为 "Firefly" 博客系统提供后端支持。

## 功能

- **文章管理** — 通过 GitHub Contents API，对博客仓库中的 Markdown 文章进行增删改查
- **站点配置** — 在 D1 数据库中管理博客全局设置（标语、社交链接等）
- **图片管理** — 通过图床服务上传、列出和删除图片

## 环境要求

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/)
- [Cloudflare 账号](https://dash.cloudflare.com/) 并开通 Workers、D1、R2

## 配置步骤

### 1. 准备本地环境变量

在项目根目录创建 `.dev.vars` 文件（**不要**提交该文件到仓库）：

```env
GITHUB_TOKEN="你的 GitHub Personal Access Token"
ADMIN_JSON='{"username":"admin","password":"你的密码"}'
```

### 2. 修改 `wrangler.toml`

将 `wrangler.toml` 中的占位符替换为你的实际配置：

| 变量 | 说明 |
|------|------|
| `database_id` | 你的 D1 数据库 ID（可通过 `npx wrangler d1 create firefly-admin` 创建） |
| `GITHUB_OWNER` | 博客仓库所属的 GitHub 用户名或组织名 |
| `GITHUB_REPO` | 博客仓库名 |
| `POSTS_PATH` | 博客仓库中 Markdown 文章所在目录（如 `src/content/posts`） |
| `BLOG_URL` | 博客的公开访问地址 |
| `IMG_BED_URL` | 图床服务地址（如不使用可留空） |
| `IMG_BED_TOKEN` | 图床 API 令牌（如不使用可留空） |

## ⚠️ 安全警告

**请勿将包含真实密钥的 `wrangler.toml` 提交到公开仓库。**

- 敏感信息（`GITHUB_TOKEN`、`ADMIN_JSON`、`IMG_BED_TOKEN`）应通过 **Cloudflare Workers Secrets**（`npx wrangler secret put SECRET_NAME`）或 **`.dev.vars`** 管理
- 如需将项目上传至代码仓库，**务必使用私有仓库**，或通过 CLI 管理密钥，确保密钥不会以明文形式出现在文件中

## 常用命令

```bash
pnpm install        # 安装依赖
pnpm dev            # 本地开发（wrangler dev）
pnpm deploy         # 部署到 Cloudflare
pnpm cf-typegen     # 从 wrangler.toml 重新生成类型定义
```

## API 文档

详见 [API.md](./API.md)。

## 许可证

MIT
