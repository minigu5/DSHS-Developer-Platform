"use client";

import { ErrorScreen } from "@/components/shared/error-screen";

import "./globals.css";

// 루트 레이아웃까지 깨졌을 때 — 레이아웃이 없으니 html·body 를 직접 그린다(테마 전환 없이 라이트)
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-white">
        <ErrorScreen error={error} />
      </body>
    </html>
  );
}
