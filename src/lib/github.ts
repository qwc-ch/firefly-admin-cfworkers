import { Env, PostFile, PostMeta } from '../types';

const GITHUB_API = 'https://api.github.com';

async function githubFetch(env: Env, url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'firefly-admin',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response;
}

function parseFrontmatter(content: string): { frontmatter: PostMeta; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: { title: '', published: '', draft: false }, body: content };
  }

  const yamlStr = match[1];
  const body = match[2];

  const frontmatter: PostMeta = {
    title: '',
    published: '',
    draft: false,
  };

  const lines = yamlStr.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    if (key === 'title') frontmatter.title = value.replace(/^["']|["']$/g, '');
    else if (key === 'published') frontmatter.published = value;
    else if (key === 'updated') frontmatter.updated = value;
    else if (key === 'draft') frontmatter.draft = value === 'true';
    else if (key === 'description') frontmatter.description = value.replace(/^["']|["']$/g, '');
    else if (key === 'image') frontmatter.image = value.replace(/^["']|["']$/g, '');
    else if (key === 'tags') {
      const tagMatch = value.match(/\[(.*?)\]/);
      if (tagMatch) {
        frontmatter.tags = tagMatch[1].split(',').map(t => t.trim().replace(/^["']|["']$/g, ''));
      }
    }
    else if (key === 'category') frontmatter.category = value.replace(/^["']|["']$/g, '');
    else if (key === 'lang') frontmatter.lang = value.replace(/^["']|["']$/g, '');
    else if (key === 'pinned') frontmatter.pinned = value === 'true';
    else if (key === 'author') frontmatter.author = value.replace(/^["']|["']$/g, '');
    else if (key === 'comment') frontmatter.comment = value !== 'false';
  }

  return { frontmatter, body };
}

function buildFrontmatter(meta: PostMeta): string {
  const lines: string[] = ['---'];
  lines.push(`title: "${meta.title}"`);
  lines.push(`published: ${meta.published}`);
  if (meta.updated) lines.push(`updated: ${meta.updated}`);
  lines.push(`draft: ${meta.draft}`);
  if (meta.description) lines.push(`description: "${meta.description}"`);
  if (meta.image) lines.push(`image: '${meta.image}'`);
  if (meta.tags?.length) lines.push(`tags: [${meta.tags.map(t => `'${t}'`).join(', ')}]`);
  if (meta.category) lines.push(`category: '${meta.category}'`);
  if (meta.lang) lines.push(`lang: '${meta.lang}'`);
  if (meta.pinned) lines.push(`pinned: true`);
  if (meta.author) lines.push(`author: '${meta.author}'`);
  if (meta.comment === false) lines.push(`comment: false`);
  lines.push('---');
  return lines.join('\n');
}

export async function listPosts(env: Env): Promise<PostFile[]> {
  const posts: PostFile[] = [];
  await listPostsRecursive(env, env.POSTS_PATH, posts);
  posts.sort((a, b) => {
    const da = a.frontmatter.published || '';
    const db = b.frontmatter.published || '';
    return db.localeCompare(da);
  });
  return posts;
}

async function listPostsRecursive(env: Env, dirPath: string, posts: PostFile[]): Promise<void> {
  const url = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${dirPath}?ref=${env.GITHUB_BRANCH}`;
  const response = await githubFetch(env, url);
  const files = await response.json() as Array<{ name: string; path: string; type: string }>;

  for (const file of files) {
    if (file.type === 'dir') {
      await listPostsRecursive(env, file.path, posts);
    } else if (file.type === 'file' && (file.name.endsWith('.md') || file.name.endsWith('.mdx'))) {
      try {
        const post = await getPost(env, file.path.replace(`${env.POSTS_PATH}/`, '').replace(/\.(md|mdx)$/, ''));
        if (post) posts.push(post);
      } catch {
        // Skip files that can't be parsed
      }
    }
  }
}

export async function getPost(env: Env, slug: string): Promise<PostFile | null> {
  const possiblePaths = [
    `${env.POSTS_PATH}/${slug}.md`,
    `${env.POSTS_PATH}/${slug}.mdx`,
  ];

  for (const path of possiblePaths) {
    try {
      const url = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}?ref=${env.GITHUB_BRANCH}`;
      const response = await githubFetch(env, url);
      const file = await response.json() as { content: string; encoding: string; path: string };

      const content = file.encoding === 'base64'
        ? decodeURIComponent(escape(atob(file.content)))
        : file.content;

      const { frontmatter, body } = parseFrontmatter(content);
      return { slug, path: file.path, frontmatter, content: body };
    } catch {
      continue;
    }
  }

  return null;
}

export async function createPost(env: Env, slug: string, frontmatter: PostMeta, content: string): Promise<void> {
  const fullContent = `${buildFrontmatter(frontmatter)}\n\n${content}`;
  const encoded = btoa(unescape(encodeURIComponent(fullContent)));

  const url = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${env.POSTS_PATH}/${slug}.md`;
  await githubFetch(env, url, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Add post: ${frontmatter.title}`,
      content: encoded,
      branch: env.GITHUB_BRANCH,
    }),
  });
}

export async function updatePost(env: Env, slug: string, frontmatter: PostMeta, content: string): Promise<void> {
  const existing = await getPost(env, slug);
  if (!existing) throw new Error('Post not found');

  const fullContent = `${buildFrontmatter(frontmatter)}\n\n${content}`;
  const encoded = btoa(unescape(encodeURIComponent(fullContent)));

  const url = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${existing.path}`;
  const response = await githubFetch(env, url);
  const file = await response.json() as { sha: string };

  await githubFetch(env, url, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Update post: ${frontmatter.title}`,
      content: encoded,
      sha: file.sha,
      branch: env.GITHUB_BRANCH,
    }),
  });
}

export async function deletePost(env: Env, slug: string): Promise<void> {
  const existing = await getPost(env, slug);
  if (!existing) throw new Error('Post not found');

  const url = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${existing.path}`;
  const response = await githubFetch(env, url);
  const file = await response.json() as { sha: string };

  await githubFetch(env, url, {
    method: 'DELETE',
    body: JSON.stringify({
      message: `Delete post: ${slug}`,
      sha: file.sha,
      branch: env.GITHUB_BRANCH,
    }),
  });
}

// ===== Site Config =====

const CONFIG_PATH = 'src/config/siteConfig.ts';

export async function getConfigFile(env: Env): Promise<{ content: string; sha: string }> {
  const url = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${CONFIG_PATH}?ref=${env.GITHUB_BRANCH}`;
  const response = await githubFetch(env, url);
  const file = await response.json() as { content: string; encoding: string; sha: string };

  const decoded = file.encoding === 'base64'
    ? decodeURIComponent(escape(atob(file.content)))
    : file.content;

  return { content: decoded, sha: file.sha };
}

export async function parseSiteConfig(tsContent: string): Promise<Record<string, any>> {
  const langMatch = tsContent.match(/const\s+SITE_LANG\s*=\s*["']([^"']*)["']/);
  const siteLang = langMatch ? langMatch[1] : 'zh_CN';

  const configMatch = tsContent.match(/export\s+const\s+siteConfig[^=]*=\s*(\{[\s\S]*?\n\};)/);
  if (!configMatch) throw new Error('Cannot parse siteConfig from file');

  return parseJsObject(configMatch[1], { SITE_LANG: siteLang });
}

const TS_TYPE_WORDS = new Set([
  'string', 'number', 'boolean', 'SiteConfig', 'Favicon', 'Favicon[]',
]);

function parseJsObject(text: string, vars: Record<string, string>): Record<string, any> {
  let i = 0;
  const len = text.length;

  function skipWhitespace() {
    while (i < len && /\s/.test(text[i])) i++;
  }

  function skipLineComment() {
    if (text[i] === '/' && text[i + 1] === '/') {
      while (i < len && text[i] !== '\n') i++;
    }
  }

  function skipBlockComment() {
    if (text[i] === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < len && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
    }
  }

  function skipComments() {
    for (;;) {
      skipWhitespace();
      if (text[i] === '/' && text[i + 1] === '/') { skipLineComment(); continue; }
      if (text[i] === '/' && text[i + 1] === '*') { skipBlockComment(); continue; }
      break;
    }
  }

  function readString(): string {
    const quote = text[i]; i++;
    let s = '';
    while (i < len && text[i] !== quote) {
      if (text[i] === '\\') { s += text[i + 1]; i += 2; }
      else { s += text[i]; i++; }
    }
    i++; // skip closing quote
    return s;
  }

  function readWord(): string {
    const start = i;
    while (i < len && /[\w$]/.test(text[i])) i++;
    return text.slice(start, i);
  }

  function parseValue(): any {
    skipComments();
    if (text[i] === '"' || text[i] === "'") return readString();
    if (text[i] === '{') return parseObject();
    if (text[i] === '[') return parseArray();
    if (text[i] === '-' || /\d/.test(text[i])) return readNumber();
    const w = readWord();
    if (w === 'true') return true;
    if (w === 'false') return false;
    if (w === 'null') return null;
    if (w === 'undefined') return null;
    if (vars[w] !== undefined) return vars[w];
    return w;
  }

  function readNumber(): number {
    const start = i;
    if (text[i] === '-') i++;
    while (i < len && /[\d.]/.test(text[i])) i++;
    return Number(text.slice(start, i));
  }

  function parseArray(): any[] {
    i++; // skip [
    const arr: any[] = [];
    skipComments();
    while (text[i] !== ']') {
      arr.push(parseValue());
      skipComments();
      if (text[i] === ',') i++;
      skipComments();
    }
    i++; // skip ]
    return arr;
  }

  function parseObject(): Record<string, any> {
    i++; // skip {
    const obj: Record<string, any> = {};
    skipComments();
    while (text[i] !== '}') {
      skipComments();
      // key can be quoted or unquoted
      const key = (text[i] === '"' || text[i] === "'") ? readString() : readWord();
      skipComments();
      i++; // skip :
      skipComments();
      const val = parseValue();
      obj[key] = val;
      skipComments();
      if (text[i] === ',') i++;
      skipComments();
    }
    i++; // skip }
    return obj;
  }

  skipComments();
  return parseObject();
}

export function generateSiteConfigFile(config: Record<string, any>): string {
  const siteLang = config.lang || 'zh_CN';
  const c = { ...config };

  // Remove lang from the config object (it's defined as SITE_LANG variable)
  delete c.lang;

  const lines: string[] = [];
  lines.push(`import type { SiteConfig } from "@/types/siteConfig";`);
  lines.push(``);
  lines.push(`const SITE_LANG = "${siteLang}";`);
  lines.push(``);
  lines.push(`export const siteConfig: SiteConfig = {`);

  for (const [key, value] of Object.entries(c)) {
    lines.push(`\t${key}: ${serializeValue(value, 1)},`);
  }

  lines.push(`};`);
  lines.push(``);
  return lines.join('\n');
}

function serializeValue(value: any, indent: number): string {
  const tab = '\t'.repeat(indent);
  const tabInner = '\t'.repeat(indent + 1);

  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    // Simple array of strings
    if (value.every(v => typeof v === 'string')) {
      const items = value.map(v => `${tabInner}"${v}"`).join(',\n');
      return `[\n${items},\n${tab}]`;
    }
    // Array of objects
    const items = value.map(v => {
      if (typeof v === 'object' && v !== null) {
        const props = Object.entries(v)
          .map(([k, val]) => `${tabInner}${k}: ${serializeValue(val, indent + 1)}`)
          .join(',\n');
        return `${tabInner}{\n${props},\n${tabInner}}`;
      }
      return `${tabInner}${serializeValue(v, indent + 1)}`;
    }).join(',\n');
    return `[\n${items},\n${tab}]`;
  }

  if (typeof value === 'object') {
    const props = Object.entries(value)
      .map(([k, val]) => `${tabInner}${k}: ${serializeValue(val, indent + 1)}`)
      .join(',\n');
    return `{\n${props},\n${tab}}`;
  }

  return String(value);
}

export async function saveConfigFile(env: Env, config: Record<string, any>, sha: string, message: string): Promise<void> {
  const { content: original } = await getConfigFile(env);
  const patched = patchConfigFile(original, config);
  const encoded = btoa(unescape(encodeURIComponent(patched)));

  const url = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${CONFIG_PATH}`;
  await githubFetch(env, url, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: encoded,
      sha,
      branch: env.GITHUB_BRANCH,
    }),
  });
}

export function patchConfigFile(original: string, newConfig: Record<string, any>): string {
  let result = original;

  // Handle SITE_LANG: update the const declaration
  if (newConfig.lang !== undefined) {
    result = result.replace(
      /(const\s+SITE_LANG\s*=\s*["'])[^"']*(["'])/,
      `$1${newConfig.lang}$2`,
    );
  }

  // Find the config object start
  const objStart = result.indexOf('export const siteConfig');
  if (objStart === -1) throw new Error('Cannot find siteConfig in file');
  const braceStart = result.indexOf('{', objStart);
  if (braceStart === -1) throw new Error('Cannot find config object opening brace');

  // Process each top-level key (skip 'lang' since it's handled via SITE_LANG)
  const keys = Object.keys(newConfig).filter(k => k !== 'lang');

  for (const key of keys) {
    const newVal = newConfig[key];
    // Find "key:" in the source text after braceStart
    const keyPattern = new RegExp(`(^|\\n)([\\t ]*)${escapeRegex(key)}\\s*:`, 'm');
    const keyMatch = keyPattern.exec(result.slice(braceStart));
    if (!keyMatch) continue;

    const keyAbsPos = braceStart + keyMatch.index + keyMatch[0].length;
    // Skip whitespace and colon
    let valStart = keyAbsPos;
    while (valStart < result.length && /[\s:]/.test(result[valStart])) valStart++;

    // Find value extent
    const valEnd = findValueEnd(result, valStart);
    if (valEnd === -1) continue;

    // Serialize new value with matching indentation
    const indent = keyMatch[2] || '\t';
    const serialized = serializeValue(newVal, indent.length / 1);
    // Replace
    result = result.slice(0, valStart) + serialized + result.slice(valEnd);
  }

  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findValueEnd(text: string, start: number): number {
  const ch = text[start];
  if (ch === '"' || ch === "'") {
    let i = start + 1;
    while (i < text.length && text[i] !== ch) {
      if (text[i] === '\\') i++;
      i++;
    }
    return i + 1;
  }
  if (ch === '{' || ch === '[') {
    const close = ch === '{' ? '}' : ']';
    let depth = 0;
    let i = start;
    let inStr: string | null = null;
    while (i < text.length) {
      if (inStr) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === inStr) inStr = null;
      } else {
        if (text[i] === '"' || text[i] === "'") { inStr = text[i]; }
        else if (text[i] === ch) depth++;
        else if (text[i] === close) { depth--; if (depth === 0) return i + 1; }
      }
      i++;
    }
    return -1;
  }
  // Primitive: read until comma, newline, or closing brace
  let i = start;
  while (i < text.length && ![',', '}', '\n', '\r'].includes(text[i])) i++;
  return i;
}
