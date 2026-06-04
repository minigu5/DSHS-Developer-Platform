// 사이트 URL에서 favicon/대표 이미지를 찾아 검증된 URL을 반환.
// /api/favicon 라우트와 백필 스크립트가 공유.

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function isImageOk(u: string): Promise<boolean> {
  try {
    const res = await fetch(u, {
      method: 'GET',
      headers: { 'User-Agent': UA, Accept: 'image/*,*/*;q=0.5' },
      redirect: 'follow',
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return false;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct) return true;
    if (ct.startsWith('image/')) return true;
    if (ct.startsWith('application/octet-stream')) return true;
    return false;
  } catch {
    return false;
  }
}

// 페이지 URL을 디렉토리 base로 정규화 — 상대 경로 해석을 정확하게.
// 예: https://x.github.io/repo  →  https://x.github.io/repo/
//     https://x.github.io/repo/page.html  →  https://x.github.io/repo/
function toDirectoryBase(u: URL): URL {
  if (u.pathname.endsWith('/')) return u;
  const lastSlash = u.pathname.lastIndexOf('/');
  const lastSeg = u.pathname.slice(lastSlash + 1);
  if (lastSeg.includes('.')) {
    return new URL(u.pathname.slice(0, lastSlash + 1), u.origin);
  }
  return new URL(u.pathname + '/', u.origin);
}

type IconCandidate = { href: string; rel: string; sizes: string; priority: number };

function collectLinkIcons(html: string): IconCandidate[] {
  const results: IconCandidate[] = [];
  const linkRegex = /<link\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(html)) !== null) {
    const tag = m[0];
    const relMatch = tag.match(/\brel\s*=\s*["']([^"']+)["']/i);
    const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (!relMatch || !hrefMatch) continue;
    const rel = relMatch[1].toLowerCase().trim();
    if (!/(^|\s)(icon|apple-touch-icon(-precomposed)?|shortcut\s+icon|fluid-icon|mask-icon)(\s|$)/.test(rel)) {
      continue;
    }
    const sizes = tag.match(/\bsizes\s*=\s*["']([^"']+)["']/i)?.[1] ?? '';

    let priority = 0;
    if (rel.includes('apple-touch-icon')) priority = 100;
    else if (rel === 'icon') priority = 60;
    else if (rel.includes('shortcut')) priority = 40;
    else if (rel.includes('fluid-icon')) priority = 30;
    else if (rel.includes('mask-icon')) priority = 10;
    const sizeNum = parseInt(sizes.split('x')[0] || '0', 10);
    if (Number.isFinite(sizeNum)) priority += Math.min(sizeNum, 512) / 8;

    results.push({ href: hrefMatch[1], rel, sizes, priority });
  }
  results.sort((a, b) => b.priority - a.priority);
  return results;
}

function findMetaImage(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];
  for (const p of patterns) {
    const match = html.match(p);
    if (match?.[1]) return match[1];
  }
  return null;
}

export async function resolveFavicon(rawUrl: string): Promise<string | null> {
  let pageUrl: URL;
  try {
    pageUrl = new URL(rawUrl);
  } catch {
    return null;
  }

  const candidates: string[] = [];
  let resolveBase = toDirectoryBase(pageUrl);

  try {
    const res = await fetch(pageUrl.href, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko,en;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      try {
        resolveBase = toDirectoryBase(new URL(res.url || pageUrl.href));
      } catch {
        // 무시
      }

      const html = await res.text();
      const icons = collectLinkIcons(html);
      for (const c of icons) {
        try {
          candidates.push(new URL(c.href, resolveBase).href);
        } catch {
          // 잘못된 href 스킵
        }
      }

      const meta = findMetaImage(html);
      if (meta) {
        try { candidates.push(new URL(meta, resolveBase).href); } catch {}
      }
    }
  } catch {
    // 페이지 fetch 실패 시 폴백으로 진행
  }

  try { candidates.push(new URL('favicon.ico', resolveBase).href); } catch {}
  candidates.push(`${pageUrl.origin}/favicon.ico`);

  const seen = new Set<string>();
  const unique = candidates.filter(c => (seen.has(c) ? false : (seen.add(c), true)));

  for (const c of unique.slice(0, 6)) {
    if (await isImageOk(c)) return c;
  }

  return null;
}
