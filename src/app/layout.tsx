import React from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';

import { PrivacyGate } from '@/components/privacy/privacy-gate';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { PRIVACY_POLICY_VERSION } from '@/lib/privacy/version';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

// 제목(h1·h2·로고) 전용 — 굵기 2개. Google Fonts 판은 한글이 조각 ~100개로 나뉘어 첫 방문마다 글꼴 요청이
// ~100번 갔다(Cloudflare 속도 제한 100회/10초 초과). 그래서 자주 쓰는 한글 2,350자(KS X 1001)+라틴만 남긴
// 파일 2개를 직접 둔다. 만드는 법은 .claude/rules/performance.md. 빠진 글자는 아래 대체 글꼴로 보인다.
const plexKr = localFont({
  variable: '--font-plex-kr',
  src: [
    { path: './fonts/IBMPlexSansKR-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: './fonts/IBMPlexSansKR-Bold.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DSHS Developer Platform',
  description: '대구과학고 학생 개발자들의 프로젝트 허브',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${plexKr.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Supabase DB/Auth 연결 사전 준비 (기법 10: 프리커넥트) */}
        <link rel="preconnect" href="https://aclcleemnsmxyixcfqro.supabase.co" />
        {/* 구글 프로필 사진 도메인 사전 준비 */}
        <link rel="preconnect" href="https://lh3.googleusercontent.com" crossOrigin="anonymous" />
        {/* DNS 조회 사전 캐시 — preconnect 미지원 구형 브라우저 대응 */}
        <link rel="dns-prefetch" href="https://aclcleemnsmxyixcfqro.supabase.co" />
        <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
        <link rel="dns-prefetch" href="https://i.ibb.co" />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <PrivacyGate version={PRIVACY_POLICY_VERSION} />
          <Toaster richColors closeButton position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
