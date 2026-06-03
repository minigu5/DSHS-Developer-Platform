import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ALLOWED_IMAGE_HOSTS = [
  'lh3.googleusercontent.com',
  'avatars.githubusercontent.com',
  'www.google.com',
];

export function isExternalImage(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith('/') || url.startsWith('data:')) return false;
  
  try {
    const { hostname } = new URL(url);
    // Supabase storage is dynamic but usually contains 'supabase.co'
    if (hostname.includes('supabase.co')) return false;
    return !ALLOWED_IMAGE_HOSTS.includes(hostname);
  } catch {
    return true;
  }
}
