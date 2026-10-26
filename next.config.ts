import type { NextConfig } from "next";

// 모든 응답에 붙는 보안 헤더. 다른 사이트가 우리 화면을 iframe에 넣어 클릭을 유도하는 것(클릭재킹)을 막는다.
// HSTS는 .dev 도메인이 브라우저 HSTS preload 목록에 통째로 들어 있어서 따로 두지 않는다.
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    // 사용하는 아이콘/함수만 번들에 포함시켜 JS 크기 감소 (기법 6: 번들링)
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  images: {
    // AVIF → WebP → JPEG 순으로 최신 포맷 우선 제공 (기법 2: 이미지 포맷)
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
      {
        protocol: 'https',
        hostname: 'ibb.co',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;

// `next dev`에서도 Cloudflare 바인딩(env)을 쓸 수 있게 한다 — OpenNext(Cloudflare Workers) 배포용.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
