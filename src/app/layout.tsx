import React from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { PrivacyGate } from '@/components/privacy/privacy-gate';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { PRIVACY_POLICY_VERSION } from '@/lib/privacy/version';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Supabase DB/Auth·제목 글꼴 연결 사전 준비 (기법 10: 프리커넥트) — fetch·글꼴은 CORS 요청이라 crossOrigin이 있어야 이 연결을 쓴다 */}
        <link rel="preconnect" href="https://aclcleemnsmxyixcfqro.supabase.co" crossOrigin="anonymous" />
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
