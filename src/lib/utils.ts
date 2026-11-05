import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Next 이미지 최적화(/_next/image)를 거칠 호스트. 구글·GitHub 프로필 사진은 넣지 않는다 —
// 이미 작은 크기로 오고 서울 CDN에서 바로 받는데, 최적화를 거치면 장마다 Worker(무료 망은 LA 경유)를 1.6~2초 들렀다(2026-11-05).
const ALLOWED_IMAGE_HOSTS = [
  'i.ibb.co',
];

export function isExternalImage(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith('/') || url.startsWith('data:')) return false;
  // SVG는 Next.js 이미지 최적화 대상이 아니므로 unoptimized로 처리
  if (/\.svg(\?|$)/i.test(url)) return true;

  try {
    const { hostname } = new URL(url);
    if (hostname.includes('supabase.co')) return false;
    return !ALLOWED_IMAGE_HOSTS.includes(hostname);
  } catch {
    return true;
  }
}

/** 사이트 안 주소인지 ('/'로 시작, '//host' 같은 바깥 주소는 제외) */
export function isInternalHref(href: string | undefined): boolean {
  return Boolean(href && /^\/(?!\/)/.test(href));
}
