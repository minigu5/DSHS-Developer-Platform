// 아이콘 주소를 받아 맞춤값(projects.icon_fit)을 만든다 — 서버(저장 뒤 서버 액션·매일 파비콘 동기화)와 로컬 스크립트가 쓴다.
// 스크립트가 node로 바로 읽으므로 상대 경로 import.

import { analyzeIconBytes, type AnalyzeOptions } from './icon-fit-analyze.ts';
import type { IconFit } from './icon-fit.ts';
import { assertSafePublicUrl } from './ssrf-guard.ts';

const MAX_BYTES = 600_000;
const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/;

/** 직접 올린 그림은 Cloudinary가 작은 PNG로 바꿔 준 것을 받는다(SVG·GIF도 PNG 한 장으로) */
function fetchUrlFor(src: string): string {
  return src.replace(CLOUDINARY_UPLOAD, '$1c_limit,w_64,h_64,f_png/');
}

/** 못 받거나 못 읽으면 null — 다음에 다시 시도한다. 읽었는데 할 일이 없으면 { src }만 */
export async function computeIconFit(src: string, opts: AnalyzeOptions = {}): Promise<IconFit | null> {
  const safe = await assertSafePublicUrl(fetchUrlFor(src));
  if (!safe.ok) return null;
  try {
    const res = await fetch(safe.url.href, {
      headers: { Accept: 'image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5' },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) return { src };
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > MAX_BYTES) return { src };
    const values = await analyzeIconBytes(bytes, opts);
    return values && { src, ...values };
  } catch {
    return null;
  }
}

/** 저장된 맞춤값이 지금 아이콘 것이 아니면 true */
export function iconFitStale(iconUrl: string | null, fit: unknown): boolean {
  if (!iconUrl) return false;
  return !fit || typeof fit !== 'object' || (fit as { src?: unknown }).src !== iconUrl;
}
