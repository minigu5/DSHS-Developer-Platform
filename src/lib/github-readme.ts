// GitHub README 가져오기용 순수 함수 모음. 서버 라우트(/api/github-readme)와 폼이 같이 쓴다.
// node:test 로 검증하므로 상대 import 없이 유지.

export interface GithubRepo {
  owner: string;
  repo: string;
}

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;

// "https://github.com/o/r", "github.com/o/r.git", ".../tree/main" 등에서 소유자·저장소만 뽑는다.
export function parseGithubRepo(input: string): GithubRepo | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.hostname.toLowerCase() !== 'github.com' && url.hostname.toLowerCase() !== 'www.github.com') return null;

  const [owner, rawRepo] = url.pathname.split('/').filter(Boolean);
  if (!owner || !rawRepo) return null;
  const repo = rawRepo.replace(/\.git$/i, '');
  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo) || repo === '.' || repo === '..') return null;
  return { owner, repo };
}

export function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// 코드 블록·인라인 코드 안은 건드리지 않고 나머지에만 fn 적용.
function mapOutsideCode(md: string, fn: (chunk: string) => string): string {
  return md
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g)
    .map((part, i) => (i % 2 === 1 ? part : fn(part)))
    .join('');
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return (m?.[1] ?? m?.[2] ?? '').trim();
}

// Markdown 컴포넌트는 raw HTML 을 렌더하지 않으므로 README 에 흔한 HTML 을 마크다운으로 바꾼다.
const STRIP_TAGS =
  'p|div|span|picture|source|center|details|summary|b|strong|i|em|u|s|kbd|sup|sub|table|thead|tbody|tfoot|tr|td|th|ul|ol|li|section|article|figure|figcaption|video|iframe|font|small|big';

function htmlToMarkdown(chunk: string): string {
  return chunk
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const src = attr(tag, 'src');
      if (!src) return '';
      return `![${attr(tag, 'alt').replace(/[[\]]/g, '')}](${src})`;
    })
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_all, attrs: string, inner: string) => {
      const href = attr(`<a ${attrs}>`, 'href');
      const text = inner.replace(/\s+/g, ' ').trim();
      return href && text ? `[${text}](${href})` : text;
    })
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_all, level: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      return text ? `\n\n${'#'.repeat(Number(level))} ${text}\n\n` : '';
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(new RegExp(`</?(?:${STRIP_TAGS})(?:\\s[^>]*)?/?>`, 'gi'), '');
}

const IMAGE_EXT_RE = /\.(?:png|jpe?g|gif|svg|webp|avif|ico|bmp)(?:[?#].*)?$/i;
const ABSOLUTE_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

// 저장소 안 상대 경로를 GitHub 절대 주소로. 이미지는 raw, 나머지는 blob.
function resolveRelative(target: string, { owner, repo }: GithubRepo, dir: string): string {
  if (!target || ABSOLUTE_RE.test(target)) return target;
  const base = target.startsWith('/') ? '' : dir;
  const path = target.replace(/^\/+/, '');
  let resolved: URL;
  try {
    resolved = new URL(path, `https://x.invalid/${base ? `${base}/` : ''}`);
  } catch {
    return target;
  }
  const repoPath = resolved.pathname.replace(/^\//, '') + resolved.search + resolved.hash;
  return IMAGE_EXT_RE.test(path)
    ? `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${repoPath}`
    : `https://github.com/${owner}/${repo}/blob/HEAD/${repoPath}`;
}

function rewriteLinks(chunk: string, repo: GithubRepo, dir: string): string {
  return chunk
    .replace(/(\]\()(<?)([^)\s>]+)(>?)/g, (_all, open: string, lt: string, target: string, gt: string) =>
      `${open}${lt}${resolveRelative(target, repo, dir)}${gt}`,
    )
    .replace(/^(\s{0,3}\[[^\]]+\]:\s*)(\S+)/gm, (_all, head: string, target: string) =>
      `${head}${resolveRelative(target, repo, dir)}`,
    );
}

export interface PreparedReadme {
  markdown: string;
}

// readmePath: 저장소 안 README 경로 (예: "README.md", "docs/README.md").
export function prepareReadme(raw: string, repo: GithubRepo, readmePath: string): PreparedReadme {
  const dir = readmePath.includes('/') ? readmePath.slice(0, readmePath.lastIndexOf('/')) : '';
  let md = raw.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  md = mapOutsideCode(md, (chunk) => rewriteLinks(htmlToMarkdown(chunk), repo, dir));
  md = md.replace(/\n{3,}/g, '\n\n').trim();
  return { markdown: md };
}

const UNSUPPORTED_EXT = ['rst', 'adoc', 'asciidoc', 'org', 'textile', 'rdoc', 'pod'];

export function isSupportedReadmeName(name: string): boolean {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  return !UNSUPPORTED_EXT.includes(ext);
}
