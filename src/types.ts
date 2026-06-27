export interface Env {
  DB: D1Database;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  POSTS_PATH: string;
  BLOG_URL: string;
  ADMIN_JSON: string;
  IMG_BED_URL: string;
  IMG_BED_TOKEN: string;
  ADMIN_IPS: string;
}

export interface AdminUser {
  username: string;
  password: string;
}

export interface PostMeta {
  title: string;
  published: string;
  updated?: string;
  draft: boolean;
  description?: string;
  image?: string;
  tags?: string[];
  category?: string;
  lang?: string;
  pinned?: boolean;
  author?: string;
  comment?: boolean;
}

export interface PostFile {
  slug: string;
  path: string;
  frontmatter: PostMeta;
  content: string;
}

export interface SiteConfig {
  key: string;
  value: string;
  updated_at: string;
}
