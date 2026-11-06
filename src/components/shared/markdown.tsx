"use client";

import dynamic from "next/dynamic";

// 마크다운 변환(react-markdown + remark-gfm)은 서버 CPU를 많이 쓴다 — Cloudflare Workers 무료 요금제는 요청당 10ms라
// 상세 페이지를 새 탭으로 열 때 503(CPU 초과)이 났다. 보안과 상관없는 표시 작업이라 브라우저에서 그린다.
// 서버 HTML에는 회색 줄만 들어가고, 화면이 뜬 뒤 변환 코드를 받아 본문을 그린다.
const loadMarkdownRender = () => import("./markdown-render").then((m) => m.MarkdownRender);
const MarkdownRender = dynamic(loadMarkdownRender, {
  ssr: false,
  loading: () => <MarkdownPlaceholder />,
});

/** 변환 코드를 미리 받아 둔다 — 빠른 프로젝트 상세(quick-view)가 한가할 때 부른다.
 * 위 dynamic 과 같은 import 라야 누를 때 연결 조각을 dshs.dev(LA)에서 또 받지 않는다 */
export function preloadMarkdown() {
  void loadMarkdownRender();
}

function MarkdownPlaceholder() {
  return (
    <div aria-busy="true" aria-label="본문 불러오는 중…" className="grid gap-3 py-1">
      {[100, 92, 96, 64].map((w, i) => (
        <div key={i} className="h-4 rounded bg-zinc-100 dark:bg-zinc-800" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

export function Markdown({ children }: { children: string }) {
  return <MarkdownRender>{children}</MarkdownRender>;
}
