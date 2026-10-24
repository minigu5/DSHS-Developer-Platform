import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * 페이지 뼈대 — 각 경로의 loading.tsx가 데이터가 오기 전에 바로 보여 준다(2026-10-24).
 * 서버(Cloudflare)까지 왕복이 길어 링크를 누르고 1초쯤 아무 반응이 없던 문제를 가린다.
 * 실제 페이지와 같은 틀(PageHero 높이·카드 격자)에 회색 블록만 둔다. 반짝임·펄스 같은 움직임은 넣지 않는다.
 */

export function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-md bg-zinc-100 dark:bg-zinc-800/80", className)} />;
}

/** 뼈대 페이지 바깥 틀 — 스크린리더에는 "불러오는 중…"만 알린다 */
export function SkeletonPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950" aria-busy="true">
      <p role="status" className="sr-only">
        불러오는 중…
      </p>
      {children}
    </div>
  );
}

const CARD = "rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";

/** PageHero와 같은 높이의 머리 뼈대 */
export function HeroSkeleton({
  variant = "default",
  maxWidth = "md",
  actions = 0,
  children,
}: {
  variant?: "default" | "compact";
  maxWidth?: "md" | "lg";
  /** 알약 버튼 자리 수 */
  actions?: number;
  children?: ReactNode;
}) {
  const compact = variant === "compact";
  return (
    <section
      className={cn(
        "paper-grid border-b border-zinc-200 px-6 dark:border-zinc-800",
        compact ? "pt-[22px] pb-5 sm:pt-[30px] sm:pb-[26px]" : "pt-8 pb-7 sm:pt-12 sm:pb-10",
      )}
    >
      <div
        className={cn(
          "relative z-10 mx-auto flex flex-col items-center",
          maxWidth === "lg" ? "max-w-6xl" : "max-w-5xl",
        )}
      >
        <Bone className={compact ? "h-9 w-9 rounded-[10px]" : "h-11 w-11 rounded-xl"} />
        <Bone
          className={cn(
            "rounded-lg",
            compact ? "mt-3 h-7 w-40 sm:h-8 sm:w-52" : "mt-[18px] h-[34px] w-44 sm:h-[46px] sm:w-64",
          )}
        />
        {!compact && (
          <div className="mt-3 hidden h-7 items-center sm:flex">
            <Bone className="h-4 w-[22rem]" />
          </div>
        )}
        {actions > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {Array.from({ length: actions }, (_, i) => (
              <Bone key={i} className="h-11 w-32 rounded-full" />
            ))}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/** 카드 격자 뼈대 — 목록 페이지(팁·해줘·공지)와 같은 1/2/3열. 모바일은 3장만 */
export function CardGridSkeleton({ count = 6, cover = false }: { count?: number; cover?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn(CARD, "overflow-hidden", i >= 3 && "hidden sm:block")}>
          {cover && <Bone className="aspect-[16/10] w-full rounded-none" />}
          <div className={cn("flex flex-col gap-3 p-5", !cover && "min-h-[160px]")}>
            <Bone className="h-5 w-20 rounded-full" />
            <Bone className="h-5 w-4/5" />
            <Bone className="h-4 w-3/5" />
            <div className="mt-auto flex items-center gap-2 pt-2">
              <Bone className="h-6 w-6 rounded-full" />
              <Bone className="h-3.5 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 목록 페이지 — 머리 + (세그먼트) + 개수 줄 + 카드 격자 */
export function ListPageSkeleton({
  actions = 1,
  cover = false,
  tabs = false,
}: {
  actions?: number;
  cover?: boolean;
  /** 머리 아래 세그먼트(해줘 상태 탭) 자리 */
  tabs?: boolean;
}) {
  return (
    <SkeletonPage>
      <HeroSkeleton actions={actions}>{tabs && <Bone className="mt-5 h-10 w-72 rounded-full" />}</HeroSkeleton>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-9">
        <Bone className="mb-4 h-4 w-16" />
        <CardGridSkeleton cover={cover} />
      </main>
    </SkeletonPage>
  );
}

/** 본문 상자(ReadingSurface) 안 글줄 */
function ReadingSkeleton({ lines = 9 }: { lines?: number }) {
  const widths = ["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-2/3"];
  return (
    <div className={cn(CARD, "mt-7 flex flex-col gap-3 p-6 sm:p-8")}>
      {Array.from({ length: lines }, (_, i) => (
        <Bone key={i} className={cn("h-4", widths[i % widths.length])} />
      ))}
    </div>
  );
}

/** 글 상세(팁·해줘·공지) — ArticleHeader + (커버) + 본문 */
export function ArticleSkeleton({ cover = false }: { cover?: boolean }) {
  return (
    <SkeletonPage>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-7">
        <div className="flex min-h-9 items-center">
          <Bone className="h-4 w-20" />
        </div>
        <div className="mt-4 flex gap-1.5">
          <Bone className="h-6 w-14 rounded-full" />
          <Bone className="h-6 w-16 rounded-full" />
        </div>
        <Bone className="mt-3 h-9 w-4/5 rounded-lg sm:h-10" />
        <Bone className="mt-3 h-5 w-3/5" />
        <div className="mt-5 flex items-center gap-2.5">
          <Bone className="h-9 w-9 rounded-full" />
          <Bone className="h-4 w-32" />
        </div>
        {cover && <Bone className="mt-7 aspect-[16/9] w-full rounded-3xl" />}
        <ReadingSkeleton />
      </main>
    </SkeletonPage>
  );
}

/** 프로젝트 상세 — 아이콘 스티커 머리 + 수치 띠 + 본문·사이드 카드 */
export function ProjectDetailSkeleton() {
  return (
    <SkeletonPage>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-7">
        <Bone className="h-4 w-24" />
        <div className="mt-5 flex items-start gap-4 sm:gap-7">
          <Bone className="h-[72px] w-[72px] shrink-0 rounded-[22%] sm:h-28 sm:w-28" />
          <div className="min-w-0 flex-1">
            <div className="flex gap-1.5">
              <Bone className="h-5 w-14" />
              <Bone className="h-5 w-12 rounded-full" />
            </div>
            <Bone className="mt-2.5 h-[30px] w-3/5 rounded-lg sm:h-[44px]" />
            <Bone className="mt-2 h-5 w-4/5" />
            <div className="mt-3.5 flex items-center gap-2">
              <Bone className="h-7 w-7 rounded-full" />
              <Bone className="h-3.5 w-40" />
            </div>
            <div className="mt-5 flex gap-2">
              <Bone className="h-11 w-28 rounded-full" />
              <Bone className="h-11 w-24 rounded-full" />
            </div>
          </div>
        </div>
        <div className={cn(CARD, "mt-8 grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-4")}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2 p-5">
              <Bone className="h-3.5 w-12" />
              <Bone className="h-6 w-20" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1">
            <ReadingSkeleton lines={10} />
          </div>
          <div className="flex flex-col gap-4 lg:mt-7 lg:w-72">
            {[0, 1, 2].map((i) => (
              <div key={i} className={cn(CARD, "flex flex-col gap-3 p-5")}>
                <Bone className="h-4 w-16" />
                <Bone className="h-4 w-full" />
                <Bone className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </SkeletonPage>
  );
}

/** 탐색 — 넓은 머리 + 큰 검색창 + (데스크탑) 사이드바 + 2열 카드 */
export function ExploreSkeleton() {
  return (
    <SkeletonPage>
      <HeroSkeleton maxWidth="lg">
        <Bone className="mt-5 h-[46px] w-full max-w-[640px] rounded-full sm:mt-6 sm:h-[52px]" />
      </HeroSkeleton>
      <div className="flex gap-2 px-6 py-3 md:hidden">
        <Bone className="h-[34px] w-20 rounded-full" />
        <Bone className="h-[34px] w-24 rounded-full" />
        <Bone className="h-[34px] w-20 rounded-full" />
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="flex gap-8">
          <aside className="hidden w-56 shrink-0 flex-col gap-3 md:flex">
            {Array.from({ length: 8 }, (_, i) => (
              <Bone key={i} className={cn("h-9", i % 3 === 0 ? "w-24" : "w-full")} />
            ))}
          </aside>
          <div className="min-w-0 flex-1">
            <Bone className="mb-4 h-4 w-24" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={cn(CARD, "flex flex-col gap-3 p-5", i >= 3 && "hidden sm:flex")}>
                  <div className="flex items-start gap-3.5">
                    <Bone className="h-14 w-14 shrink-0 rounded-[22%]" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Bone className="h-5 w-3/5" />
                      <Bone className="h-4 w-4/5" />
                    </div>
                  </div>
                  <div className="flex gap-1.5 pt-2">
                    <Bone className="h-6 w-12 rounded-full" />
                    <Bone className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </SkeletonPage>
  );
}

/** 개발자 프로필 — 아바타 머리 + 회색 띠 프로젝트 2열 */
export function ProfileSkeleton() {
  return (
    <SkeletonPage>
      <section className="paper-grid border-b border-zinc-200 px-6 pt-8 pb-7 sm:pt-12 sm:pb-10 dark:border-zinc-800">
        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center">
          <Bone className="h-[84px] w-[84px] rounded-full sm:h-[104px] sm:w-[104px]" />
          <Bone className="mt-[18px] h-[34px] w-40 rounded-lg sm:h-[46px]" />
          <Bone className="mt-3.5 h-4 w-64" />
          <div className="mt-5 flex gap-2">
            <Bone className="h-[34px] w-36 rounded-full" />
            <Bone className="h-[34px] w-28 rounded-full" />
          </div>
        </div>
      </section>
      <section className="border-b border-zinc-200 bg-zinc-50 py-8 sm:py-11 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="mx-auto w-full max-w-5xl px-6">
          <Bone className="mb-[18px] h-7 w-36 bg-zinc-200/70" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className={cn(CARD, "flex items-start gap-3.5 p-5")}>
                <Bone className="h-14 w-14 shrink-0 rounded-[22%]" />
                <div className="flex flex-1 flex-col gap-2">
                  <Bone className="h-5 w-3/5" />
                  <Bone className="h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SkeletonPage>
  );
}

/** 가이드 결과 — 작은 머리 + 답 칩 + 진행 막대 + 단계 카드 하나 */
export function GuideSkeleton() {
  return (
    <SkeletonPage>
      <HeroSkeleton variant="compact">
        <div className="mt-3.5 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <Bone key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      </HeroSkeleton>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8">
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} className="h-1.5 rounded-full" />
          ))}
        </div>
        <Bone className="mt-4 h-4 w-48" />
        <div className={cn(CARD, "mt-4 flex flex-col gap-3 p-6 sm:p-8")}>
          <Bone className="h-4 w-10" />
          <Bone className="h-7 w-3/5 rounded-lg" />
          {["w-full", "w-11/12", "w-4/5", "w-full", "w-2/3"].map((w, i) => (
            <Bone key={i} className={cn("h-4", w)} />
          ))}
          <Bone className="mt-4 h-11 w-32 self-end rounded-full" />
        </div>
      </main>
    </SkeletonPage>
  );
}

/** 작성·수정 화면 — 작은 머리 + 입력 카드 두 장 */
export function EditorSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <SkeletonPage>
      <HeroSkeleton variant="compact" />
      <main className={cn("mx-auto w-full flex-1 px-6 py-7", wide ? "max-w-5xl" : "max-w-3xl")}>
        <div className={cn(CARD, "flex flex-col gap-4 p-6 sm:p-8")}>
          <Bone className="h-9 w-3/5 rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Bone className="h-10 rounded-xl" />
            <Bone className="h-10 rounded-xl" />
          </div>
          <Bone className="h-32 rounded-2xl" />
        </div>
        <div className={cn(CARD, "mt-5 flex flex-col gap-3 p-6 sm:p-8")}>
          <Bone className="h-9 w-56 rounded-full" />
          <Bone className="h-64 rounded-2xl" />
        </div>
      </main>
    </SkeletonPage>
  );
}
