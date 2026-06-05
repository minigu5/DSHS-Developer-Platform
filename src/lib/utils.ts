import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ALLOWED_IMAGE_HOSTS = [
  'lh3.googleusercontent.com',
  'avatars.githubusercontent.com',
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
