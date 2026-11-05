"use client";

import { ErrorScreen } from "@/components/shared/error-screen";

// 페이지·레이아웃에서 잡히지 않은 오류 — 루트 레이아웃(테마·글꼴) 안에서 보인다
export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  return <ErrorScreen error={error} />;
}
