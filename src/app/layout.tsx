import React from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono, IBM_Plex_Sans_KR } from 'next/font/google';

import { ThemeProvider } from '@/components/shared/theme-provider';
import { Toaster } from '@/components/ui/sonner';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

// 제목(h1·h2·로고) 전용 — 굵기 2개만 받아 용량 최소화. 한글 글리프는 unicode-range로 필요한 만큼만 로드됨
const plexKr = IBM_Plex_Sans_KR({
  variable: '--font-plex-kr',
  weight: ['600', '700'],
  subsets: ['latin'],
  display: 'swap',
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
          <Toaster richColors closeButton position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
