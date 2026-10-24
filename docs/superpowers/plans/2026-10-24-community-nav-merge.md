# 내비 병합 "커뮤니티" (개발 팁 + 해줘!) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전역 내비의 "개발 팁"과 "해줘!" 두 칸을 "커뮤니티" 한 칸으로 합치고, "공지사항" 칸은 내비에서 빼 헤더 오른쪽(프로필 옆) 벨 아이콘으로 옮긴다. 내비가 6칸 → **4칸**(모든 프로젝트·프로젝트 등록·나도 개발해볼래!·커뮤니티)이 되어, 서브도메인 빌려주기("주소 받기", 별도 계획)가 들어갈 자리가 생긴다(들어가면 5칸). URL·데이터·서버 로직은 그대로 두고, 두 목록 화면을 오가는 탭과 헤더 벨만 추가한다.

**왜:** 서브도메인 기능을 홍보하려고 내비에 새 칸을 넣기로 했다(사용자 결정, 2026-10-24). PC 내비 6칸·모바일 탭바 6칸이 이미 빡빡해서 7칸은 안 된다. 개발 팁과 해줘!는 둘 다 "글을 올리고 읽는 곳"이고, 해줘!는 이미 개발 팁 머리의 버튼으로 들어가는 구조라 합치기가 가장 자연스럽다. 공지사항은 글 종류가 다르고 "알림"에 가까워서, 내비 칸 대신 헤더의 아이콘으로 두는 편이 낫다고 사용자가 정했다(모바일 포함). 시안(커뮤니티 탭 도구줄)은 사용자가 승인함.

**Spec:** 별도 스펙 없음 — 이 문서의 「결정」이 설계다. 작업 크기: 작은 변경(파일 약 7개, 서버·DB 변경 없음).

**Tech Stack:** Next.js 16 App Router, Tailwind v4, lucide-react. 테스트 프레임워크는 순수 로직용 `node --test`뿐 → 검증은 `npx tsc --noEmit`, `npm run lint`, 화면 육안 확인.

---

## 결정

사용자가 정한 것:
- 개발 팁 + 해줘!를 한 칸으로 합친다.
- 공지사항은 내비에서 빼고, **프로필 옆 아이콘 하나**(글자 없이)로 둔다. 모바일 헤더에도 똑같이.
- 커뮤니티 탭 도구줄 시안(`https://claude.ai/artifact/4j8gMhVUoz37nEJhTxPSYi`의 2~4번)대로 간다. 대안(탭을 머리 안에, 5번)은 채택하지 않음.
- 새 칸("주소 받기")은 이 계획 다음에 별도로 만든다.

**제가 정한 것(검토 필요):**

| 항목 | 결정 | 이유 |
|---|---|---|
| 칸 이름 | **커뮤니티** | 쉬운 말, 팁·요청을 모두 담음. 대안: 게시판, 글 |
| 아이콘 | lucide `MessagesSquare` | 두 글 종류를 묶는 느낌 |
| URL | **그대로** (`/tips`, `/haejwo`) | 북마크·가이드 링크·로그인 `next=`·서버 액션 `revalidatePath`가 안 깨짐. 새 라우트·리다이렉트 없음 |
| 칸을 누르면 | `/tips`로 이동 | 팁이 기본 탭 |
| 두 화면 오가기 | 목록 화면 위에 **탭 세그먼트**(개발 팁 \| 해줘!) | 내비 칸이 하나가 됐으니 안에서 오갈 길이 필요 |
| 탭 위치 | 머리(PageHero) 아래 `main` 맨 위 **도구줄**: 왼쪽 탭, 오른쪽에 그 화면의 필터/개수 | 머리 안에 두면 해줘!의 상태 세그먼트와 컨트롤이 두 줄로 쌓임 |
| 활성 알약 색 | `/tips*` = 분홍(tip-600), `/haejwo*` = 주황(orange-700) | 머리 타일·주 버튼 색과 일치. 새 색 안 만듦 |
| 활성 판정 | `/tips*`와 `/haejwo*`(목록·상세·작성·수정 전부) → 커뮤니티 | |
| 공지 벨 위치 | 헤더 오른쪽 그룹의 **다크모드 토글 ↔ 프로필 사이** (`SiteHeader`) | 프로필 옆이라는 요청. `SiteHeader`를 쓰는 모든 화면(홈 포함)에 같이 나옴 |
| 공지 벨 모양 | lucide `Bell`, 글자 없음, 다크모드 토글과 같은 고스트 아이콘 버튼(`rounded-full`). `aria-label`·`title` "공지사항" | 토글과 같은 크기·결이라 헤더가 시끄럽지 않음 |
| 공지 벨 활성 | `/announcements*`에서 `SECTION_COLORS.announcements.chip`(연한 sky 배경 + sky 글자) + `aria-current="page"` | 섹션 색을 "활성 칩"에 쓰는 기존 규칙. 진한 알약은 내비 전용이라 쓰지 않음 |
| 안 읽음 표시 | **없음** | 공지 읽음 상태를 저장하지 않음. 빨간 점을 달면 항상 켜져 있거나 거짓 정보가 됨 |
| 홈·푸터·가이드 | **코드 변경 없음** (아래 「영향 점검」) | |

## 영향 점검 (홈과 나머지)

변경하는 곳:
- `src/components/shared/page-nav.tsx` — 칸 병합, 공지사항 칸 제거, 활성 판정, 알약 색
- `src/components/shared/announcements-link.tsx` — 신규, 헤더 공지 벨
- `src/components/shared/site-header.tsx` — 오른쪽 그룹에 벨 추가, 모바일 간격, 모바일에서 다크모드 토글 숨김
- `src/components/shared/auth-buttons.tsx` — 프로필 드롭다운에 모바일 전용 테마 전환 항목
- `src/components/community/community-tabs.tsx` — 신규, 탭 세그먼트
- `src/app/(nav)/tips/page.tsx` — 탭 도구줄 추가, "해줘! 둘러보기" 버튼 제거
- `src/app/(nav)/haejwo/page.tsx` — 탭 도구줄 추가, 상태 세그먼트를 머리에서 도구줄로 이동
- `src/components/haejwo/haejwo-status-tabs.tsx` — 머리용 `rise`·`mt-6` 제거
- `CLAUDE.md` — 내비 설명 갱신

**의도적으로 바꾸지 않는 곳:**
- 홈 `RecentPosts`(개발 팁·해줘!·공지 세 칸): 홈은 내비가 아니라 "최근 글" 미리보기라 칸 이름이 목적지(`/tips`, `/haejwo`)와 맞아야 한다.
- 홈 `HowItWorks` 3번째 칸 "없으면 “해줘!”로 요청해요": 기능 이름 "해줘!"는 그대로 쓴다.
- `SiteFooter`: 푸터는 사이트맵이라 `개발 팁`·`해줘!`·`팁 쓰기`·`해줘! 올리기`·`공지사항` 링크를 따로 둔다.
- 홈 공지 티커(`AnnouncementTicker`)와 `/announcements` 페이지·`SECTION_COLORS.announcements`: 그대로. 티커는 공지의 또 다른 입구로 남고, 섹션 색은 공지 머리 타일·주 버튼·벨 활성 칩이 계속 쓴다.
- 가이드 마지막 단계의 "해줘! 둘러보기" 버튼: 기능 안내 목적이라 유지. (서브도메인 단계는 별도 계획에서 추가)
- 글 상세의 "← 개발 팁" / "← 해줘!" 되돌아가기 링크: 정확한 목적지를 가리키는 게 낫다.
- 개발자 프로필의 글 목록 "개발 팁 · 해줘!" 라벨: 글 종류 표시라 유지.
- 미들웨어 보호 라우트, 서버 액션, DB: 변경 없음.
- `SECTION_COLORS`의 `tips`·`haejwo` 키: 머리 타일·주 버튼·칩이 계속 쓴다. 키를 합치지 않는다.

## 선행 조건 — `cloudflare-workers` 브랜치

**해결됨(2026-10-24).** `cloudflare-workers` 브랜치(커밋 `3887036` "페이지 로딩 뼈대 + 메뉴 즉시 반응")는 이미 main과 `origin/main`에 들어가 있다(main이 그 위에 쌓여 있어 추가로 머지할 것이 없음). 이 계획은 그 결과 위에서 짠다.
- 목록 페이지는 `src/app/(nav)/tips/(list)/page.tsx`, `src/app/(nav)/haejwo/(list)/page.tsx`다(아래 Task 3·4의 경로). `loading.tsx` 스켈레톤도 있다.
- `page-nav.tsx`에 `useOptimisticActive`(눌린 칸을 즉시 활성으로 표시, **`href`를 활성 키로 비교**)가 있다. 그 전제를 유지하려고 Task 1에서 커뮤니티 칸의 `href`를 `/tips`로 두고 `resolveActive`가 두 경로 모두 `"/tips"`를 돌려주게 한다.
- 새 목록 화면 구조(탭 도구줄)에 맞는 `loading.tsx` 스켈레톤이 있다면 도구줄 높이(약 56px)를 반영해 같이 맞춘다 — Task 3·4 확인 단계에서 `loading.tsx`를 열어 본다.

## 작업 규칙

- 별도 워크트리/브랜치(`community-nav`)에서 진행. main 직접 작업 금지.
- 각 태스크 끝: `npx tsc --noEmit` 출력 없음, `npm run lint` 오류 0.
- 커밋은 Conventional Commits 한국어, 끝에 세션이 지정한 `Co-Authored-By`·`Claude-Session` 줄.
- CLAUDE.md 규칙: `transition-all` 금지(바뀌는 속성만), 장식 아이콘 `aria-hidden`, 섹션 색은 머리 타일·주 버튼·활성 칩에만, 흰 글자 배경은 tip-600/orange-700 등 AA 통과 색만, 모바일 여백 `px-6`.

---

## Task 1: 내비 칸 병합 — `page-nav.tsx`

**Files:** Modify `src/components/shared/page-nav.tsx`

- [ ] **Step 1: 칸 정의 교체.** `NAV_ITEMS`의 `/tips`·`/haejwo` 두 줄을 한 줄로 바꾸고, `/announcements` 줄은 지운다.

```tsx
import { Search, Rocket, BookOpen, MessagesSquare } from "lucide-react";
// Newspaper, Megaphone, Bell import는 제거(다른 곳에서 쓰지 않으면)

{ href: "/tips", label: "커뮤니티", icon: MessagesSquare, pillClass: SECTION_COLORS.tips.pill },
```

순서는 `explore → new → guide → community` (4칸). 서브도메인 칸은 나중에 `guide` 바로 뒤에 들어간다(→ 5칸).

- [ ] **Step 2: 활성 판정.** `resolveActive`에서 두 경로를 같은 키로 하고, `/announcements` 줄은 지운다(공지 화면에서는 내비 알약이 켜지지 않고 헤더 벨이 켜진다).

```tsx
if (pathname.startsWith("/tips") || pathname.startsWith("/haejwo")) return "/tips";
// "/announcements"는 더 이상 내비 칸이 아니므로 분기를 지운다 — 어느 칸에도 안 걸려 ""가 된다
```

- [ ] **Step 3: 알약 색을 하위 화면에 맞춤.** 칸 하나가 두 색을 가질 수 있게 헬퍼를 추가하고, PC 알약(`activePill`)과 모바일 원(`pillClass`) 모두 이걸 쓴다.

```tsx
// 커뮤니티 칸은 해줘! 화면에서 주황, 나머지(개발 팁)는 분홍 — 머리 타일·주 버튼 색과 맞춘다
function pillFor(href: string, pillClass: string, pathname: string) {
  return href === "/tips" && pathname.startsWith("/haejwo") ? SECTION_COLORS.haejwo.pill : pillClass;
}
```

PC 알약 `<span>`의 `transition-[transform,width,opacity]`에 `background-color`를 더한다(`transition-[transform,width,opacity,background-color]`). 탭을 눌러 분홍↔주황이 바뀔 때 색이 부드럽게 넘어가게 하려는 것. 모바일 원은 이미 `transition-colors`.

`MobileNav`는 지금 `useOptimisticActive`에서 `pathname`을 받지 않으면(선행 브랜치 머지 후 시그니처 확인) `usePathname()`을 직접 호출해 `pillFor`에 넘긴다.

- [ ] **Step 4: 확인.** `npx tsc --noEmit`, `npm run lint`. `grep -n "Newspaper\|Megaphone\|Bell\|announcements" src/components/shared/page-nav.tsx` → 출력 없음. PC·모바일 모두 4칸.

- [ ] **Step 5: 커밋** `feat(nav): 개발 팁·해줘!를 커뮤니티 한 칸으로 병합, 공지사항 칸 제거`

---

## Task 2: 탭 세그먼트 컴포넌트 — `community-tabs.tsx`

**Files:** Create `src/components/community/community-tabs.tsx` (서버 컴포넌트, `"use client"` 없음)

- [ ] **Step 1: 컴포넌트 작성.** `current` prop으로 활성 탭을 받는다 — 두 목록 페이지가 서버 컴포넌트(ISR `revalidate=30`)라서 `usePathname`·쿠키를 읽지 않고 prop으로 넘기면 캐시가 유지된다.

```tsx
import Link from "next/link";
import { Megaphone, Newspaper } from "lucide-react";

import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";

const TABS = [
  { key: "tips", href: "/tips", label: "개발 팁", icon: Newspaper },
  { key: "haejwo", href: "/haejwo", label: "해줘!", icon: Megaphone },
] as const;

/** 커뮤니티 안 두 목록(개발 팁 · 해줘!)을 오가는 세그먼트. 활성 탭만 섹션 색 칩. */
export function CommunityTabs({ current }: { current: "tips" | "haejwo" }) {
  return (
    <nav
      aria-label="커뮤니티 분류"
      className="inline-flex gap-0.5 rounded-full bg-zinc-100 p-[3px] dark:bg-zinc-800"
    >
      {TABS.map(({ key, href, label, icon: Icon }) => {
        const active = key === current;
        return (
          <Link
            key={key}
            href={href}
            prefetch={true}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
              active
                ? cn(SECTION_COLORS[key].chip, "font-semibold")
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: 확인.** `npx tsc --noEmit`, `npm run lint`. (화면 확인은 Task 3·4 뒤에.)

- [ ] **Step 3: 커밋** `feat(community): 개발 팁·해줘! 탭 세그먼트`

---

## Task 3: 개발 팁 목록에 도구줄 — `tips/page.tsx`

**Files:** Modify `src/app/(nav)/tips/page.tsx` (선행 브랜치 머지 후엔 `tips/(list)/page.tsx`)

- [ ] **Step 1: 머리에서 "해줘! 둘러보기" 버튼 제거.** `actions` 안의 오렌지 outline `Link` 블록을 지우고 "팁 작성"만 남긴다. `Megaphone` import 제거.

- [ ] **Step 2: 도구줄 추가.** `<main>` 맨 위, 팁 개수 줄이 있던 자리를 도구줄로 바꾼다. 팁이 0개여도 탭은 보여야 하므로 빈 상태 분기 **밖**에 둔다.

```tsx
<div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
  <CommunityTabs current="tips" />
  {tips.length > 0 && (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">
      <b className="font-semibold text-zinc-900 tabular-nums dark:text-white">{tips.length}개</b>의 팁
    </p>
  )}
</div>
```

기존 `<p className="mb-4 ...">` 개수 줄은 삭제. 카드 그리드·빈 상태 마크업은 그대로.

- [ ] **Step 3: 확인.** `npx tsc --noEmit`, `npm run lint`, 브라우저로 `/tips`: 머리에 "팁 작성" 버튼 하나, 아래 줄 왼쪽 탭(개발 팁 활성·분홍 칩) 오른쪽 개수. 팁 0개 상태도 확인(개수 없이 탭만).

- [ ] **Step 4: 커밋** `feat(tips): 목록에 커뮤니티 탭 도구줄`

---

## Task 4: 해줘! 목록에 도구줄 — `haejwo/page.tsx` + `haejwo-status-tabs.tsx`

**Files:** Modify `src/app/(nav)/haejwo/page.tsx` (또는 `(list)/page.tsx`), `src/components/haejwo/haejwo-status-tabs.tsx`

- [ ] **Step 1: 상태 세그먼트를 머리에서 뺀다.** `<PageHero>`의 `children`(`ideas.length > 0 && <Suspense><HaejwoStatusTabs/></Suspense>`)을 지우고 `PageHero`는 `actions`까지만.

- [ ] **Step 2: 도구줄 추가.** `<main>` 맨 위. 왼쪽 `CommunityTabs current="haejwo"`, 오른쪽 상태 세그먼트(아이디어가 있을 때만, 기존처럼 `Suspense`로 감쌈 — `useSearchParams` 때문).

```tsx
<div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
  <CommunityTabs current="haejwo" />
  {ideas.length > 0 && (
    <Suspense fallback={null}>
      <HaejwoStatusTabs counts={counts} />
    </Suspense>
  )}
</div>
```

- [ ] **Step 3: `HaejwoStatusTabs`에서 머리용 장식 제거.** `<nav>` className의 `rise mt-6`과 `style={{ "--rise-delay": "240ms" }}`(및 `CSSProperties` import)를 제거. 나머지(`inline-flex ... p-[3px]`)는 그대로. 안의 `href`는 이미 `/haejwo`·`/haejwo?status=...`.

- [ ] **Step 4: 확인.** `npx tsc --noEmit`, `npm run lint`. 브라우저로 `/haejwo`: 탭 활성이 주황 칩, 상태 세그먼트가 오른쪽(모바일 폭에선 아래 줄로 감김), `?status=open`·`?status=done` 전환이 스크롤 점프 없이 동작, 해줘!가 0개면 상태 세그먼트 없이 탭만.

- [ ] **Step 5: 커밋** `feat(haejwo): 목록에 커뮤니티 탭 도구줄, 상태 세그먼트 이동`

---

## Task 5: 공지사항 벨 — 헤더 오른쪽

**Files:** Create `src/components/shared/announcements-link.tsx`; Modify `src/components/shared/site-header.tsx`, `src/components/shared/auth-buttons.tsx`

- [ ] **Step 1: 벨 컴포넌트.** 활성 표시에 `usePathname`이 필요해서 클라이언트 컴포넌트. 다크모드 토글(`size="icon"` 고스트 버튼)과 같은 크기·같은 hover 색.

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";

/** 헤더 오른쪽 공지사항 아이콘 — 내비 칸 대신 프로필 옆에 둔다. 공지 화면에서는 섹션 색 칩으로 활성 표시. */
export function AnnouncementsLink() {
  const active = usePathname().startsWith("/announcements");
  return (
    <Link
      href="/announcements"
      prefetch={true}
      aria-label="공지사항"
      aria-current={active ? "page" : undefined}
      title="공지사항"
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "rounded-full",
        active
          ? SECTION_COLORS.announcements.chip
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
      )}
    >
      <Bell className="h-[1.1rem] w-[1.1rem]" aria-hidden />
    </Link>
  );
}
```

shadcn `base-nova` Button은 `asChild`를 지원하지 않으므로 `Link` + `buttonVariants()` 패턴을 쓴다(CLAUDE.md).

- [ ] **Step 2: `SiteHeader`에 끼우기.** 오른쪽 그룹 순서를 `rightExtra → ThemeToggle → AnnouncementsLink → AuthButtons`로. 모바일에서 한 개 늘어난 만큼 간격을 줄인다(데스크탑 `gap-2`는 그대로).

```tsx
<div className="flex items-center gap-1 sm:gap-2 shrink-0">
  {rightExtra}
  <ThemeToggle />
  <AnnouncementsLink />
  <AuthButtons />
</div>
```

`showNav` 여부와 무관하게 항상 노출 — 홈(`variant="transparent"`)에도 나온다. 로그인 계열(`AuthShell`)은 `SiteHeader`를 안 쓰므로 영향 없음.

- [ ] **Step 3: 모바일에서 다크모드 토글을 프로필 메뉴로 옮긴다 (사용자 결정, 2026-10-24).** 모바일 헤더는 로고(≈229px) + 벨 + 프로필(36px)만 남긴다. 토글까지 두면 360~375px에서 넘치기 때문.
  - `site-header.tsx`: `<ThemeToggle />`을 `<div className="hidden sm:block"><ThemeToggle /></div>`로 감싼다(데스크탑은 그대로).
  - `auth-buttons.tsx`: 로그인한 사용자의 드롭다운에 테마 항목을 `sm:hidden`으로 추가. `useTheme()`에서 `resolvedTheme`·`setTheme`를 쓰고, 항목은 `<DropdownMenuItem>` "다크 모드로 전환"/"라이트 모드로 전환" + `Moon`/`Sun` 아이콘(`aria-hidden`). 내 페이지 항목과 로그아웃 사이 구분선 위에 둔다. 마운트 전에는 라벨이 어긋나지 않도록 `ThemeToggle`처럼 `mounted` 가드를 쓴다.
  - **제가 정한 부분(검토 필요):** 비로그인 모바일에서는 프로필 메뉴가 없어 토글이 사라진다 → 시스템 설정을 따른다. 비로그인 모바일 헤더(로고 + 벨 + "로그인" 버튼)는 토글을 넣으면 넘쳐서 뺀다. 문제가 되면 `/login` 화면(`AuthShell`)에 토글을 두는 식으로 보완한다.
  - 점검: 360 / 375 / 390px에서 로그인·비로그인 둘 다 가로 넘침·로고 잘림 없음. 그래도 비로그인 쪽이 넘치면 제목 `text-base` → 모바일 `text-[15px]`로 줄인다.

- [ ] **Step 4: 확인.** `npx tsc --noEmit`, `npm run lint`. 브라우저: `/announcements`에서 벨이 연한 sky 칩으로 켜지고 내비 알약은 꺼짐, 다른 화면에서는 회색 아이콘, 비로그인·로그인 모두 노출, 키보드 Tab 순서(PC)가 토글 → 벨 → 프로필(모바일은 벨 → 프로필), 모바일 프로필 메뉴에서 테마 전환이 동작하고 데스크탑 메뉴에는 그 항목이 안 보임, 다크 모드 대비, 홈 투명 헤더 위에서도 보임.

- [ ] **Step 5: 커밋** `feat(layout): 공지사항을 헤더 오른쪽 벨 아이콘으로 이동`

---

## Task 6: 문서 갱신 — `CLAUDE.md`

**Files:** Modify `CLAUDE.md`

- [ ] **Step 1: 「🧭 전역 페이지 내비게이션」 고치기.**
  - "6개 항목" → **4개**: 모든 프로젝트, 프로젝트 등록, 나도 개발해볼래!, **커뮤니티(→ `/tips`)**. 공지사항은 내비 칸이 아니라 헤더 벨(`AnnouncementsLink`)이라고 적는다.
  - 활성 판정에서 `/tips/*`와 `/haejwo/*` 두 줄을 `/tips/*`·`/haejwo/*` → "커뮤니티" 한 줄로, `/announcements/*` 줄은 "헤더 벨 활성(섹션 sky 칩), 내비 알약은 꺼짐"으로 바꾼다.
  - "버튼별 고유 색"에 "커뮤니티: `/tips*`=tip-600 분홍, `/haejwo*`=orange-700 주황(화면에 따라 알약 색이 바뀜)" 추가하고 개발 팁·해줘!·공지사항 개별 항목은 정리.
  - 「모바일 `MobileNav`」의 헤더 설명 "로고 + 다크모드 토글 + 프로필만 표시" → "로고 + 다크모드 토글 + 공지 벨 + 프로필".
  - 「📢 공지사항」의 색상 포인트 "스카이블루 — PageNav pill" → "공지 머리 타일·주 버튼·헤더 벨 활성 칩".
- [ ] **Step 2: 「💡 해줘!」 진입점 문구 고치기.** "`/tips` 페이지 헤더의 '해줘!' 버튼(오렌지 색상)" → "커뮤니티 탭(`CommunityTabs`)의 '해줘!' 탭".
- [ ] **Step 3: 「📝 개발 팁 블로그」 목록 설명 고치기.** "헤더 우측 '팁 작성'" 유지 + "머리 아래 도구줄에 커뮤니티 탭(개발 팁 | 해줘!)과 개수" 추가. 해줘! 목록 설명에도 "상태 세그먼트는 도구줄 오른쪽".
- [ ] **Step 4: 디렉토리 구조에 `components/community/` 추가**(community-tabs), `shared/`에 `announcements-link` 언급.
- [ ] **Step 5: 「📱 반응형」에 한 줄** — "도구줄: `flex-wrap`으로 모바일에서 탭 아래에 필터가 내려감. 헤더 오른쪽(토글·벨·프로필)은 모바일 `gap-1`."
- [ ] **Step 6: 커밋** `docs: 커뮤니티 내비 병합·공지 벨 반영`

---

## Task 7: 최종 검증

- [ ] `npx tsc --noEmit` 출력 없음, `npm run lint` 오류 0, `npm test` 통과.
- [ ] 개발 서버에서 직접 확인 (`rm -rf .next` 후 기동하면 CSS 캐시 고착을 피함):
  - PC: `/tips`, `/tips/<id>`, `/tips/new`, `/haejwo`, `/haejwo/<id>`, `/haejwo/new`에서 내비 4칸, "커뮤니티" 활성, 알약 색이 팁=분홍·해줘!=주황. 탭으로 오갈 때 알약 색이 부드럽게 전환.
  - `/announcements`, `/announcements/<id>`, `/announcements/new`에서 내비 알약이 모두 꺼져 있고 헤더 벨만 켜짐.
  - 모바일 폭(360 / 375 / 390px): 하단 탭바 4칸, 헤더 한 줄에 로고·토글·벨·프로필이 다 들어감(가로 넘침 없음), 도구줄이 줄바꿈되며 가로 스크롤 없음, 좌우 여백 24px.
  - 다크 모드: 탭 칩·상태 세그먼트 대비.
  - 키보드: Tab으로 탭 두 개와 상태 세그먼트를 순서대로 이동, 포커스 링 표시, `aria-current="page"`가 활성 탭에만.
  - 동작 줄이기: 알약 이동 애니메이션 없이 전환.
  - 홈 `/`: 「요즘 올라온 글」 세 칸·푸터 링크가 전과 같이 동작.
  - 로그인 안 한 상태에서 `/tips/new` → `/login?next=/tips/new` 그대로.
- [ ] 이 계획에 없는 곳에서 `grep -rn "개발 팁\|해줘" src --include='*.tsx'`로 내비 이름을 가리키는 문구가 남았는지 한 번 더 확인.

## 위험과 대응

| 위험 | 대응 |
|---|---|
| `cloudflare-workers` 브랜치와 `page-nav.tsx`·목록 페이지 경로 충돌 | 그 브랜치 머지 후 시작(선행 조건). 아니면 경로를 바꿔 적용하고 머지 시 충돌 해결 |
| 활성 키를 `href`로 비교하는 `useOptimisticActive`와 어긋남 | 커뮤니티 칸 `href="/tips"`, `resolveActive`가 두 경로에 `"/tips"` 반환 — 키를 새로 만들지 않음 |
| 해줘!를 찾던 사람이 칸이 사라져 당황 | 해줘!는 같은 칸 안 탭으로 항상 보임. 홈 「요즘 올라온 글」·푸터·가이드 링크가 그대로 |
| ISR 캐시 | 탭은 `current` prop을 받는 서버 컴포넌트. 쿠키·`searchParams`를 서버에서 읽지 않음 |
| 공지 입구가 줄어 공지를 놓침 | 벨은 모든 화면 헤더에 항상 보이고, 홈 티커·푸터 링크는 그대로. 읽음 표시는 따로 만들지 않음(비목표) |
| 모바일 헤더가 좁아 가로 넘침 | 사용자 결정(2026-10-24)대로 모바일에서는 다크모드 토글을 프로필 메뉴로 옮김(Task 5 Step 3). 비로그인 모바일은 토글 없이 시스템 테마를 따름 — 문제 되면 `AuthShell`에 토글 추가 |
| 벨이 "알림 있음"처럼 읽힘 | `title`/`aria-label`을 "공지사항"으로 분명히 하고 점·숫자 배지를 달지 않음 |
| 알약 색 전환이 어색 | `background-color` transition 추가. 어색하면 단일 색(tip-600)으로 물러남 |

## 다음 계획 — 서브도메인 "주소 받기" 칸

이 병합이 끝나면 내비는 4칸이고, `NAV_ITEMS`에 한 줄을 넣을 자리가 생긴다(`guide` 바로 뒤 — "만들고 → 배포하고 → 주소 받기" 순서. 넣으면 5칸으로 모바일 탭바에도 여유가 있다). 그때 같이 정할 것: 칸 이름·아이콘·색(`SECTION_COLORS`에 키 추가, 흰 글자 AA 통과 색), 푸터 「만들기」 열 링크, 가이드 배포 장 끝 단계, 홈 `GuideTeaser`·`ClosingCta`·공지 티커를 통한 홍보. 권한·3개 제한·DB는 별도 스펙(`docs/superpowers/specs/`)으로.
