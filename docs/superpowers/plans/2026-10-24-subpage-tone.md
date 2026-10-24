# 하위 페이지 톤 통일 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈을 제외한 15개 화면(탐색·프로젝트 상세·팁 목록/상세/작성·해줘 목록/상세/등록·공지 목록/상세/작성·가이드·프로필(마이페이지)·프로젝트 등록/수정·로그인·온보딩·접근 거부)을 홈 리뉴얼 톤(흰 바탕, 가운데 스택 머리, 섹션 색 세 군데, 알약 버튼, 스티커 아이콘, 물결 모눈)으로 바꾼다. 기능·데이터 흐름은 그대로.

**Architecture:** 표현 계층만 바꾼다. 공유 컴포넌트 여덟 개(`PageHero`, 섹션 색 맵, `ReadingSurface`, `ArticleHeader`, `EditorTabs`, 폼 선택 UI 3종, `FormSection`/`FormRail`, `StatStrip`, `AuthShell`)를 먼저 만들고 페이지를 그 위에 다시 조립한다. 서버 액션·쿼리·RLS·검증 로직은 손대지 않는다(프로필의 "작성한 글" 조회 2개만 추가).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, shadcn `base-nova`(Button은 `asChild` 미지원 → Link에 `buttonVariants()`), lucide-react. 테스트 프레임워크 없음 → 각 태스크 검증은 `npx tsc --noEmit`, `npm run lint`, grep 단언, `playwright-cli` 스크린샷 육안 확인.

**Spec:** `docs/superpowers/specs/2026-10-24-subpage-tone-design.md` (이하 §번호는 스펙 절). 시안: https://claude.ai/artifact/5yGgqNw7rQmZUGzyGVGCP1 (v14).

## Global Constraints

- 바탕 `bg-white dark:bg-zinc-950`. `bg-zinc-50 dark:bg-zinc-950`을 페이지 바탕으로 쓰지 않는다(보조 띠는 `bg-zinc-50 dark:bg-zinc-900/40 border-t`). (§4.1)
- 좌우 여백은 모든 폭에서 `px-6`. `px-4 sm:px-6` 금지. (§4.7)
- 너비: 목록·상세 `max-w-5xl`, 탐색만 `max-w-6xl`, 글·에디터 `max-w-3xl`. (§4.7)
- 섹션 색은 머리 타일·주 버튼·활성 칩에만. 다중 선택 폼의 선택 상태는 무채색 반전(`bg-zinc-900 text-white dark:bg-white dark:text-zinc-950`). 위저드(단일 선택)는 섹션 색 유지. (§4.3, §4.5)
- 팁 색은 `@theme` 토큰 `tip-*`(`bg-tip-600` 등). Tailwind `pink-*` 클래스 금지. (§4.3)
- 흰 글자 배경: blue-600, emerald-700, purple-600, tip-600, orange-700, sky-700만. `*-500`, orange-600 금지. (§3)
- 버튼 `rounded-full`, 주 h-11 / 보조 h-9 / 작은 h-7.5. `transition-all` 금지, hover 확대·그라디언트·블러 블롭 금지. (§4.4, CLAUDE.md)
- 제목(h1·h2) `font-heading`. 숫자 `tabular-nums`. 문구 해요체. (§4.2, CLAUDE.md)
- 모눈 라인 라이트 `#f0f0f3`, 다크 `#18181c`. 모눈은 `.paper-grid`의 `::before`에만. 물결: drift 10s, wave 28s, 바탕 가시도 .38. `prefers-reduced-motion`이면 정지. (§4.6)
- 카드형 선택 UI는 `role="button"` + `tabIndex` + Enter/Space, 토글은 `aria-pressed`, 접힘은 `aria-expanded`, 장식 아이콘 `aria-hidden`. (§3, CLAUDE.md ♿)
- 홈 쪽 파일은 `globals.css`, `src/app/page.tsx` 히어로 `<section>`의 내용 래퍼 한 줄, `recent-posts.tsx` 팁 색 두 줄, `site-header.tsx`만. (§2)
- 각 태스크 끝: `npx tsc --noEmit` 출력 없음, `npm run lint` 오류 0, 커밋 메시지는 Conventional Commits 한국어, 끝에 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` / `Claude-Session: https://claude.ai/code/session_01A5FALTWmSJmrEaSSPFs4Rm`.

**공통 검증 명령(각 태스크의 "확인" 단계가 참조):**
```bash
npx tsc --noEmit            # 기대: 출력 없음
npm run lint                # 기대: 오류 0
# 시각 확인 (dev 서버 http://localhost:3000 가동 상태)
playwright-cli open "http://localhost:3000/<route>" && playwright-cli resize 1280 900 && playwright-cli screenshot --filename=/tmp/dshs-shots/<name>-d.png
playwright-cli resize 390 844 && playwright-cli screenshot --filename=/tmp/dshs-shots/<name>-m.png
playwright-cli eval "() => { document.documentElement.classList.add('dark'); return 1 }" && playwright-cli screenshot --filename=/tmp/dshs-shots/<name>-dark.png
playwright-cli eval "() => document.documentElement.scrollWidth <= innerWidth"   # 기대: true (가로 넘침 없음)
```

## Review Focus

1. **리뷰·방문 수 0인 프로젝트 상세**: 수치 띠가 "–"와 "아직 리뷰가 없어요"를 보여 주고, `url` 없는 프로젝트는 방문 칸을 숨겨 3칸이 되어야 한다. → Task 7 확인 단계에 리뷰 0·url 없음 프로젝트 스크린샷 추가.
2. **닉네임 없는 사용자 프로필**: h1에 실명이 대신 들어가야 하고, 실명도 없으면 이메일 앞부분. 이메일 알약은 항상 하나만(contacts에 email이 있어도 중복 금지). → Task 8.
3. **팀 프로젝트 상세**: 개발자 카드에 팀 이름 + 팀원 목록, 작성자 줄에 "· 팀 프로젝트". 팀원에게 수정 버튼 노출. → Task 7.
4. **웹사이트 종류 선택 시 플랫폼 잠금**: 토글 칩이 전부 선택·잠김(`aria-disabled`, `tabIndex -1`, opacity .35)이고 안내문이 보여야 하며, 종류를 바꾸면 풀려야 한다. → Task 10.
5. **키보드만으로 등록 폼 완주**: 종류 카드·라디오 카드가 Tab으로 닿고 Enter/Space로 선택되며 포커스 링이 보여야 한다. 모바일 탐색 칩 바의 드롭다운은 `aria-expanded`와 바깥 클릭 닫힘. → Task 10, Task 5.

---

### Task 1: 전역 토큰 — 모눈 물결, 팁 색 토큰, 여백

**Files:**
- Modify: `src/app/globals.css` (`.paper-grid` 83–97행, `@theme inline` 블록)
- Modify: `src/app/page.tsx:188-194` (히어로 내용 래퍼)
- Modify: `src/components/shared/site-header.tsx:29`

**Interfaces:**
- Produces: CSS 클래스 `.paper-grid`(요소에 `position: relative; isolation: isolate` 포함, 모눈은 `::before`), Tailwind 색 `tip-100/300/600/700/950`.

- [ ] **Step 1: `.paper-grid`를 ::before 물결로 바꾼다**

`globals.css` 83–97행의 `.paper-grid`/`.dark .paper-grid`를 아래로 교체한다(값은 §4.6 그대로).

```css
.paper-grid { position: relative; isolation: isolate; background-color: #ffffff; }
.dark .paper-grid { background-color: #09090b; }
.paper-grid::before {
  content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-image: linear-gradient(#f0f0f3 1px, transparent 1px), linear-gradient(90deg, #f0f0f3 1px, transparent 1px);
  background-size: 24px 24px; background-position: 50% 0;
  -webkit-mask-image: radial-gradient(closest-side, #000 0%, #000 30%, transparent 100%), radial-gradient(closest-side, #000 0%, #000 25%, transparent 100%), linear-gradient(rgba(0,0,0,.38), rgba(0,0,0,.38));
  mask-image: radial-gradient(closest-side, #000 0%, #000 30%, transparent 100%), radial-gradient(closest-side, #000 0%, #000 25%, transparent 100%), linear-gradient(rgba(0,0,0,.38), rgba(0,0,0,.38));
  -webkit-mask-size: 75% 160%, 60% 130%, 100% 100%; mask-size: 75% 160%, 60% 130%, 100% 100%;
  -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  animation: grid-drift 10s linear infinite, grid-wave 28s ease-in-out infinite alternate;
}
.dark .paper-grid::before { background-image: linear-gradient(#18181c 1px, transparent 1px), linear-gradient(90deg, #18181c 1px, transparent 1px); }
@keyframes grid-drift { from { background-position: 50% 0; } to { background-position: calc(50% + 24px) 24px; } }
@keyframes grid-wave {
  0%   { -webkit-mask-position: -15% 45%, 115% 55%, 0 0; mask-position: -15% 45%, 115% 55%, 0 0; }
  50%  { -webkit-mask-position: 55% 85%, 35% 5%, 0 0;   mask-position: 55% 85%, 35% 5%, 0 0; }
  100% { -webkit-mask-position: 115% 25%, -15% 75%, 0 0; mask-position: 115% 25%, -15% 75%, 0 0; }
}
```
기존 `@media (prefers-reduced-motion: reduce)` 블록이 `animation-duration: 0.01ms`로 전역 정지시키므로 추가 규칙 불필요. 주석은 한국어로 물결 의도를 한 줄 적는다.

- [ ] **Step 2: 팁 색 토큰 추가**

`@theme inline` 블록 안에 `--color-tip-100: #fce7f3; --color-tip-300: #f9a8d4; --color-tip-600: #db2777; --color-tip-700: #be185d; --color-tip-950: #500724;` 추가. 주석: "개발 팁 섹션 색 — Tailwind pink-600(oklch)은 승인된 색과 달라 hex 고정".

- [ ] **Step 3: 홈 히어로 내용 래퍼를 모눈 위로**

`src/app/page.tsx:194`의 `<div className="max-w-5xl mx-auto flex flex-col items-center text-center">`에 `relative z-10` 추가. 그 외 홈은 건드리지 않는다.

- [ ] **Step 4: 헤더 여백**

`site-header.tsx:29`의 `px-4 sm:px-6` → `px-6`.

- [ ] **Step 5: 확인**

Run: `npx tsc --noEmit && npm run lint && grep -n "tip-600\|grid-wave" src/app/globals.css | wc -l`
Expected: tsc·lint 통과, grep 2 이상.
시각: `/` 데스크탑·모바일·다크 스크린샷 — 히어로 모눈이 보이고(연해짐), 10초 안에 모눈이 움직이며 밝은 구역이 이동, 제목·버튼·아이콘이 모눈 위에 있음. `prefers-reduced-motion` 에뮬레이션(`playwright-cli eval` 불가 시 생략).

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/app/page.tsx src/components/shared/site-header.tsx
git commit -m "style(theme): 모눈 물결 배경·팁 색 토큰·헤더 여백 24px"
```

---

### Task 2: 섹션 색 맵 + PageNav·홈 팁 색 교체

**Files:**
- Create: `src/lib/section-colors.ts`
- Modify: `src/components/shared/page-nav.tsx:9-16` (pillClass)
- Modify: `src/components/home/recent-posts.tsx:117,124`

**Interfaces:**
- Produces:
  ```ts
  export type SectionKey = 'explore' | 'new' | 'guide' | 'tips' | 'haejwo' | 'announcements';
  export type SectionColor = { pill: string; tile: string; button: string; chip: string; text: string };
  export const SECTION_COLORS: Record<SectionKey, SectionColor>;
  ```
  - `pill`: 진한 배경 클래스(예 `bg-blue-600`) — PageNav 활성 알약, MobileNav 원.
  - `tile`: `bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300` 꼴(§4.3 표).
  - `button`: `bg-blue-600 hover:bg-blue-700 text-white` 꼴(해줘 `bg-orange-700 hover:bg-orange-800`, 팁 `bg-tip-600 hover:bg-tip-700`, 등록 `bg-emerald-700 hover:bg-emerald-800`, 가이드 `bg-purple-600 hover:bg-purple-700`, 공지 `bg-sky-700 hover:bg-sky-800`).
  - `chip`: 활성 칩 `bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300` 꼴.
  - `text`: `text-blue-700 dark:text-blue-300` 꼴.

- [ ] **Step 1: `section-colors.ts` 작성** — 위 타입과 상수. 값은 §4.3 표 한 줄씩. 팁은 `tip-*` 토큰.
- [ ] **Step 2: `page-nav.tsx`** — `NAV_ITEMS`의 `pillClass` 리터럴을 `SECTION_COLORS[key].pill`로. 팁 항목이 `bg-tip-600`이 되는지 확인(기존 amber-700 제거).
- [ ] **Step 3: `recent-posts.tsx`** — 117행 `tileClass`를 `bg-tip-100 text-tip-700 dark:bg-tip-950 dark:text-tip-300`, 124행 링크 색을 `text-tip-700 dark:text-tip-300`으로. 다른 줄은 손대지 않는다.
- [ ] **Step 4: 확인**

Run: `npx tsc --noEmit && npm run lint && grep -rn "amber" src/components/shared/page-nav.tsx src/components/home/recent-posts.tsx`
Expected: 통과, grep 결과 0.
시각: `/tips`에서 PageNav 활성 알약과 하단 탭 원이 분홍(#db2777). `/` "요즘 올라온 글" 팁 타일 분홍.

- [ ] **Step 5: Commit** — `git commit -m "feat(theme): 섹션 색 맵 추가, 개발 팁 색 amber→tip(pink)"`

---

### Task 3: 공유 컴포넌트 — PageHero · ReadingSurface · ArticleHeader

**Files:**
- Create: `src/components/shared/page-hero.tsx`
- Create: `src/components/shared/reading-surface.tsx`
- Create: `src/components/shared/article-header.tsx`
- Modify: `src/components/shared/markdown.tsx:17-23` (본문색은 이미 zinc-700/300 — 변경 없음, 확인만)

**Interfaces:**
- Consumes: `SECTION_COLORS`, `SectionKey` (Task 2).
- Produces:
  ```tsx
  // page-hero.tsx (서버 컴포넌트)
  export function PageHero(props: {
    section: SectionKey; icon: LucideIcon; title: string; description?: string;
    actions?: React.ReactNode; children?: React.ReactNode;        // children = 추가 요소(검색창·세그먼트)
    variant?: 'default' | 'compact'; avatar?: React.ReactNode;    // avatar가 있으면 타일 대신 렌더
    maxWidth?: 'md' | 'lg';                                       // md=max-w-5xl(기본), lg=max-w-6xl(탐색)
  }): JSX.Element;
  // reading-surface.tsx
  export function ReadingSurface(props: { children: React.ReactNode; className?: string; footer?: React.ReactNode }): JSX.Element;
  // article-header.tsx
  export function ArticleHeader(props: {
    backHref: string; backLabel: string; actions?: React.ReactNode;
    chips?: React.ReactNode; title: string; lead?: string;
    author: { id: string; name: string; avatarUrl: string | null }; dateLabel: string; extraMeta?: string;
  }): JSX.Element;
  ```

- [ ] **Step 1: `PageHero`** — `<section className="paper-grid border-b border-zinc-200 dark:border-zinc-800 px-6 ...">` + 내부 `<div className="relative z-10 mx-auto flex flex-col items-center text-center max-w-5xl">`. 크기 §4.2: default 패딩 `pt-8 pb-7 sm:pt-12 sm:pb-10`, 타일 `h-11 w-11 rounded-xl` 아이콘 `h-[22px] w-[22px]`, h1 `font-heading text-3xl sm:text-[40px] font-bold leading-[1.15] tracking-tight break-keep mt-[18px]`, 설명 `hidden sm:block mt-3 text-[17px] text-zinc-600 dark:text-zinc-400 max-w-[36em] break-keep`, actions `mt-6 flex flex-wrap justify-center gap-2.5`. compact: `pt-[22px] pb-5 sm:pt-[30px] sm:pb-[26px]`, 타일 `h-9 w-9 rounded-[10px]` 아이콘 18px, h1 `text-2xl sm:text-[28px] mt-3`, 설명 미출력. `.rise` + `style={{ '--rise-delay': ... }}` 0/60/120/180/240ms(홈 `riseDelay` 패턴 복제). 타일 색 `SECTION_COLORS[section].tile`.
- [ ] **Step 2: `ReadingSurface`** — `<div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-9">{children}{footer && <div className="mt-7 border-t border-zinc-100 pt-5 dark:border-zinc-800">{footer}</div>}</div>`.
- [ ] **Step 3: `ArticleHeader`** — 첫 줄 `flex items-center justify-between`: 왼쪽 `Link backHref`(ArrowLeft + backLabel, `text-sm text-zinc-600`), 오른쪽 actions. 그 아래 chips(`flex flex-wrap gap-1.5`), h1 `font-heading text-3xl sm:text-4xl font-bold tracking-tight mt-3`, lead `mt-2.5 text-[17px] text-zinc-600`, 작성자 줄 `mt-5 flex items-center gap-2.5 text-[13px] text-zinc-500`: `Link href={/developers/${author.id}}`(아바타 36px `rounded-full border` + 이름 `font-semibold text-zinc-900 dark:text-white`) · dateLabel · extraMeta. 아바타는 `next/image` + `isExternalImage`(현재 팁 상세 방식).
- [ ] **Step 4: 확인** — `npx tsc --noEmit && npm run lint`. 아직 사용처 없음(다음 태스크에서 시각 확인).
- [ ] **Step 5: Commit** — `git commit -m "feat(ui): PageHero·ReadingSurface·ArticleHeader 공유 컴포넌트"`

---

### Task 4: 개발 팁 목록 · 공지사항 목록 · 해줘 목록

**Files:**
- Modify: `src/app/(nav)/tips/page.tsx` (49–118행 레이아웃)
- Modify: `src/components/tips/tip-card.tsx` (커버 비율·하단 줄)
- Modify: `src/app/(nav)/announcements/page.tsx` (49–100행)
- Modify: `src/components/announcements/announcement-card.tsx` (고정 테두리·요약·카테고리 알약)
- Create: `src/lib/type-icons.ts` (`explore-client.tsx`의 `TYPE_ICONS`·`PLATFORM_ICONS`·`CATEGORY_ICONS`를 옮겨 export; explore-client는 import로 교체)
- Create: `src/components/haejwo/haejwo-status-tabs.tsx`, `src/components/haejwo/haejwo-card.tsx`
- Modify: `src/app/(nav)/haejwo/page.tsx`

**Interfaces:**
- Consumes: `PageHero`(Task 3), `SECTION_COLORS`(Task 2).
- Produces: `AnnouncementCard`에 `summary: string` prop 추가(본문 첫 문단 평문, 서버에서 생성). `TYPE_ICONS: Record<string, LucideIcon>` 등 3개 맵(`src/lib/type-icons.ts`). `HaejwoStatusTabs({ counts: { all: number; open: number; done: number }; value: 'all' | 'open' | 'done' })`('use client', `Link ?status=`로 이동). `HaejwoCard({ idea: IdeaRow & { linked_title?: string | null } })`.

- [ ] **Step 1: 팁 목록** — 바탕 `bg-white dark:bg-zinc-950`. 기존 `<div className="mb-8">…</div>` 머리를 `<PageHero section="tips" icon={Newspaper} title="개발 팁" description="막혔다가 해결한 방법, 써 보니 좋았던 도구를 글로 남기는 곳이에요." actions={…} />`로. actions: `[팁 작성]` = `Link /tips/new` + `buttonVariants()` + `rounded-full h-11 px-5 ${SECTION_COLORS.tips.button}` + PenLine, `[해줘! 둘러보기]` = 현재 orange 윤곽 버튼을 h-11로. `<main>`은 `max-w-5xl px-6 py-9`. 목록 위 한 줄 `<p className="mb-4 text-sm text-zinc-600"><b className="font-semibold text-zinc-900 tabular-nums">{tips.length}개</b>의 팁</p>`. 정렬 토글 없음.
- [ ] **Step 2: `TipCard`** — 커버 컨테이너 `h-40` → `aspect-[16/10]`(`relative w-full`). 하단 줄은 이미 `border-t`; 글자 크기·간격만 §5.3대로(작성자 12px, 통계 11px `tabular-nums`). hover는 `hover:border-zinc-300 dark:hover:border-zinc-700`로(blue-500/50 제거), 제목 hover 색 변화 제거.
- [ ] **Step 3: 공지 목록** — 바탕 흰색, `<PageHero section="announcements" icon={Bell} title="공지사항" description="베타 테스터 모집, 업데이트 소식, 의견 요청을 올리는 게시판이에요." actions={[공지 작성] sky}/>`. "고정된 공지사항" 소제목 행은 제거하고 고정→일반 순서로 한 그리드(`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5`). 서버에서 `summary = content.replace(/[#*`>\-\[\]()!]/g, '').split(/\n\s*\n/)[0].trim().slice(0, 120)`를 만들어 카드에 넘긴다.
- [ ] **Step 4: `AnnouncementCard`** — props에 `summary`. 고정이면 카드 `border-sky-300 dark:border-sky-800`(배경 없음), 칩 줄 오른쪽 끝 `<span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300"><Pin className="h-3 w-3"/>고정</span>`. 카테고리 알약 색은 티커(`announcement-ticker.tsx`)의 매핑을 import 해 재사용(함수가 없으면 `src/lib/announcement-colors.ts`로 추출해 둘 다 쓰게). 제목 아래 `<p className="line-clamp-2 text-[13px] text-zinc-600">{summary}</p>`. 제목 hover 색 변화·`transition-colors duration-300` 제거, hover는 테두리만.
- [ ] **Step 5: `type-icons.ts`** — explore-client의 세 아이콘 맵을 옮기고 import로 교체(동작 변화 없음).
- [ ] **Step 6: 해줘 목록** — `haejwo/page.tsx`: `searchParams.status`('open' | 'done' | 없음)를 읽어 `.eq('status', …)` 조건을 선택적으로 붙인다(전체 수·open 수·done 수는 `select('status')` 한 번 더 조회해 집계 — 또는 전체를 가져와 서버에서 걸러도 됨, 구현자 선택). `ideas` 조회에 `linked_project:projects!ideas_linked_project_id_fkey(title)`를 추가해 완료 카드에 제목을 넘긴다(FK 이름은 `docs/10-supabase-haejwo.sql`·`11-…-alter.sql`에서 확인). 바탕 흰색, `<PageHero section="haejwo" icon={Megaphone} title="해줘!" description="있으면 좋겠는 프로그램을 올리면, 만들 수 있는 사람이 가져가요. 개발을 못 해도 괜찮아요." actions={[해줘! 등록] orange}>` children에 `<HaejwoStatusTabs/>`. 그리드 `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5`에 `HaejwoCard`.
- [ ] **Step 7: `HaejwoStatusTabs`** — `rise mt-6 inline-flex gap-0.5 rounded-full bg-zinc-100 p-[3px] dark:bg-zinc-800`, 항목 `Link` `h-8 rounded-full px-3.5 text-[13px] font-medium` + 숫자 `font-semibold text-zinc-500 tabular-nums`; 활성 `bg-white dark:bg-zinc-900 shadow-sm text-zinc-900` + 숫자 `text-orange-700 dark:text-orange-300`; `aria-current="page"`. 세 칸: 전체 / 구현 요청 중 / 완료(`in_progress`는 넣지 않음, 스펙 §5.6).
- [ ] **Step 8: `HaejwoCard`** — 기존 페이지 안의 카드 마크업을 컴포넌트로 추출하며 §5.6대로: 상단 행(상태 알약 기존 `STATUS_LABELS` 색 + 종류 칩 `TYPE_ICONS` 아이콘 + 카테고리 칩) → 제목 `line-clamp-2 text-[17px] font-bold` → `status==='done' && linked_title`이면 `<p className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300"><Check/>연결된 프로젝트: {linked_title}</p>` → 하단 작성자(아바타 24px 이니셜)·상대시간. 완료 카드는 `border-dashed`. 카드 전체 Link, hover 테두리만.
- [ ] **Step 9: 확인** — tsc·lint. 시각 `/tips`, `/announcements`, `/haejwo`, `/haejwo?status=done` 데스크탑·모바일·다크: 머리 가운데 스택, 모바일에서 설명 숨김, 좌우 24px, 팁 버튼 분홍, 공지 고정 카드 sky 테두리 + 요약 2줄, 해줘 세그먼트 3칸·완료 카드 점선, 가로 넘침 없음.
- [ ] **Step 10: Commit** — `git commit -m "feat(lists): 팁·공지·해줘 목록 머리를 PageHero로, 카드 톤 통일, 해줘 상태 세그먼트"`

---

### Task 5: 탐색

**Files:**
- Modify: `src/app/(nav)/explore/page.tsx`
- Modify: `src/components/explore/explore-client.tsx` (전체 레이아웃, 400–470행 검색/정렬/카운트, 그리드)

**Interfaces:**
- Consumes: `PageHero`(`maxWidth="lg"`, children에 검색창), `SECTION_COLORS.explore`.
- Produces: `ExploreClient` props 변경 없음. 내부에 `MobileFilterBar`(같은 파일 하단 또는 `src/components/explore/mobile-filter-bar.tsx`) — props `{ selectedTypes, selectedCategories, selectedPlatforms, onToggleType, onToggleCategory, onTogglePlatform, onReset, sortButton: React.ReactNode }`.

- [ ] **Step 1: 머리** — `ExploreClient`가 클라이언트라 검색 상태를 가지므로 `PageHero`는 `ExploreClient` 안에서 렌더한다(서버 컴포넌트를 클라이언트에서 import 해도 됨 — 훅 없음). `<PageHero section="explore" icon={Search} title="모든 프로젝트" description="친구들이 만든 프로젝트를 찾아보고, 써 본 뒤 리뷰를 남겨요." maxWidth="lg">` children = 검색창: `<div className="rise mt-6 w-full max-w-[640px]" style={{'--rise-delay':'180ms'}}>` 안에 기존 `<Input>`(Search 아이콘, X 지우기)을 `h-[52px] sm:h-13 rounded-full pl-12 text-[15px] shadow-sm`로. 기존 사이드바 위 검색 블록(63–84행)은 제거.
- [ ] **Step 2: 데스크탑 사이드바 유지** — 컨테이너 `max-w-6xl px-6 py-8 flex gap-8`. `aside` 그대로(`hidden md:block w-56 sticky top-24 self-start`). 활성 항목 색은 현재 `bg-blue-500/12 text-blue-700` 유지.
- [ ] **Step 3: 모바일 칩 바** — 기존 `md:hidden` 필터 토글(절대 드롭다운) 블록을 `MobileFilterBar`로 교체: `<div className="md:hidden sticky top-16 z-20 -mx-6 border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">` 안에 가로 스크롤 `flex h-14 items-center gap-2 overflow-x-auto [scrollbar-width:none]`: 드롭다운 알약 3개(`h-[34px] rounded-full border px-3.5 text-[13px] font-medium` + ChevronDown, 선택 수 배지 `bg-blue-600 text-white`), `aria-expanded`, 열리면 기존 패널 마크업(`absolute top-full left-0 right-0 mt-1 rounded-2xl border bg-white p-4 shadow-lg`)을 그 그룹만 렌더, 바깥 클릭·Esc로 닫힘. 선택된 값은 알약 뒤에 `bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300` 칩(X 포함, 클릭 시 해제). 세로 구분선 `w-px h-[18px] bg-zinc-200`. 맨 오른쪽 `ml-auto`에 기존 정렬 버튼.
- [ ] **Step 4: 본문** — 결과 줄: `<div className="mb-4 flex items-baseline justify-between text-sm text-zinc-600">` 왼쪽 `<b className="font-semibold text-zinc-900 tabular-nums">{filteredProjects.length}개</b>{activeFilterCount>0 && ' (필터 적용)'}`, 오른쪽 데스크탑 정렬 버튼(`rounded-full h-[34px]`). 기존 `<h1>` 제거(PageHero가 h1). 그리드 `grid grid-cols-1 lg:grid-cols-2 gap-5`. 빈 상태 문구 유지.
- [ ] **Step 5: 바탕 흰색**, `explore/page.tsx` 래퍼도 `bg-white dark:bg-zinc-950`.
- [ ] **Step 6: 확인** — tsc·lint. 시각 `/explore` 1280: 사이드바 + 2열, 머리 검색창 중앙. 390: 칩 바가 헤더 아래 고정, 드롭다운 열림/바깥 클릭 닫힘, 가로 스크롤만 칩 바에서. `grep -n "max-w-6xl" src/components/explore/explore-client.tsx` 1 이상.
- [ ] **Step 7: Commit** — `git commit -m "feat(explore): 가운데 검색 머리, 사이드바 유지, 모바일 칩 바, 2열 그리드"`

---

### Task 6: 글 상세 3개 — 팁 · 해줘 · 공지

**Files:**
- Modify: `src/app/(nav)/tips/[id]/page.tsx`
- Modify: `src/components/tips/tip-comments.tsx:82-86` (섹션 껍데기·제목)
- Modify: `src/components/tips/tip-like-button.tsx:68-82` (알약 크기)
- Modify: `src/app/(nav)/haejwo/[id]/page.tsx`
- Modify: `src/components/haejwo/haejwo-complete-button.tsx:75-86` (트리거 버튼 색)
- Modify: `src/app/(nav)/announcements/[id]/page.tsx`

**Interfaces:**
- Consumes: `ArticleHeader`, `ReadingSurface`(Task 3), `SECTION_COLORS`, `TYPE_ICONS`(Task 4).

- [ ] **Step 1: 팁 상세** — 바탕 흰색, `main max-w-3xl px-6 py-7`. 기존 상단 행·태그·h1·작성자·커버 블록을 `<ArticleHeader backHref="/tips" backLabel="개발 팁" actions={<TipOwnerActions…/>} chips={태그 Badge들} title lead={summary} author dateLabel="2026년 10월 21일" />` + 커버(`mt-7 aspect-[16/9] rounded-3xl border overflow-hidden`, 기존 블러 레터박스 유지)로. 본문 `<ReadingSurface className="mt-7" footer={<div className="flex items-center gap-3"><TipLikeButton…/><span className="text-[13px] text-zinc-500">도움이 됐다면 눌러 주세요</span></div>}><Markdown>…</Markdown></ReadingSurface>`. 그 아래 `TipComments`.
- [ ] **Step 2: `TipComments`** — 바깥 `<section>`을 카드 없이 `mt-9`로, 제목 `<h2 className="font-heading text-xl font-bold">댓글<span className="ml-1.5 text-base font-semibold text-zinc-500 tabular-nums">{n}</span></h2>`(아이콘 제거). 댓글 행 `border-b border-zinc-100 py-3.5`. 입력 상자 `rounded-2xl`, 버튼 `rounded-full h-9 ${SECTION_COLORS.tips.button}`. 삭제 Dialog 그대로.
- [ ] **Step 3: `TipLikeButton`** — `h-10 rounded-full border px-4 text-sm font-medium` 알약, 하트 16px(좋아요 시 `fill-rose-500 text-rose-500` 유지).
- [ ] **Step 4: 해줘 상세** — 바탕 흰색, `max-w-3xl`. `ArticleHeader backHref="/haejwo" backLabel="해줘!" actions={isOwner && status!=='done' ? <HaejwoOwnerActions/> : null} chips={상태 알약 + 종류 칩(아이콘) + 카테고리 칩} title author dateLabel={timeAgo}`. 본문 `ReadingSurface`. 그 아래: `status==='done' && linkedProject` → 연결 카드 `<div className="mt-5 flex items-center gap-3.5 rounded-[20px] border border-emerald-300 bg-emerald-50/60 p-4.5 dark:border-emerald-800 dark:bg-emerald-950/30">`(ProjectIcon 44px + "구현된 프로젝트" 라벨(CheckCircle2, emerald) + 제목 + short_description, 전체 Link). `currentUser && status!=='done'` → 점선 카드 `<div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-dashed border-zinc-300 p-5 dark:border-zinc-700">` 왼쪽 `<b>이 아이디어, 만들었어요?</b><p>내 프로젝트와 연결하면 요청이 "완료"로 바뀌어요.</p>` 오른쪽 `<HaejwoCompleteButton/>`.
- [ ] **Step 5: `HaejwoCompleteButton` 트리거** — `rounded-full h-9 ${SECTION_COLORS.haejwo.button}`, 라벨 "구현완료로 표시". 다이얼로그 내부 그대로.
- [ ] **Step 6: 공지 상세** — 바탕 흰색. `ArticleHeader backHref="/announcements" backLabel="공지사항" actions={<AnnouncementOwnerActions/> + <AnnouncementPinButton/>(관리자)} chips={고정이면 <Pin/>고정 알약 + 카테고리 알약} title author dateLabel`. 본문 `ReadingSurface`.
- [ ] **Step 7: 확인** — tsc·lint. 시각 `/tips/[id]`, `/haejwo/[id]`(open 상태 1개, done 상태 1개), `/announcements/[id]` 데스크탑·모바일·**다크**: 다크에서 본문 카드가 바탕보다 밝은 zinc-900, 글자 zinc-300. 가로 넘침 없음.
- [ ] **Step 8: Commit** — `git commit -m "feat(detail): 팁·해줘·공지 상세를 글 레이아웃(ArticleHeader+ReadingSurface)으로"`

---

### Task 7: 프로젝트 상세

**Files:**
- Create: `src/components/projects/stat-strip.tsx`
- Modify: `src/app/(nav)/projects/[id]/page.tsx` (98–372행)
- Modify: `src/components/projects/project-reviews.tsx:90-130`
- Modify: `src/components/projects/review-form.tsx:54-139`
- Modify: `src/components/projects/review-list.tsx:77-143`
- Modify: `src/components/projects/edit-button.tsx:38` (ghost 알약)

**Interfaces:**
- Produces:
  ```tsx
  export function StatStrip(props: { items: Array<{ label: string; value: React.ReactNode; sub?: string }> }): JSX.Element;
  // grid-cols-2 sm:grid-cols-{items.length}, 칸 사이 border-zinc-100, 값 18px 600 tabular-nums
  ```

- [ ] **Step 1: `StatStrip`** — §5.2 수치 띠. 컨테이너 `mt-8 grid overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 grid-cols-2 sm:grid-cols-4`(3칸이면 `sm:grid-cols-3`, `items.length`로 클래스 분기 — 동적 클래스 금지이므로 3·4 두 경우를 명시). 칸 `px-3 py-4.5 text-center grid gap-1 border-l border-zinc-100 first:border-l-0 dark:border-zinc-800` + 모바일 3·4번째 칸 `max-sm:border-t`(3번째는 `max-sm:border-l-0`).
- [ ] **Step 2: 상세 머리** — 바탕 흰색, `main max-w-5xl px-6 py-7`. 위에 `<Link href="/explore" className="inline-flex items-center gap-1 text-sm text-zinc-600">`(ArrowLeft) "모든 프로젝트". 머리 `flex gap-4 sm:gap-7 items-start`: `ProjectIcon className="h-[72px] w-[72px] sm:h-28 sm:w-28 rounded-[22%] ring-[3px] ring-white dark:ring-zinc-950 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)]"`; 오른쪽 배지·칩 → h1 `font-heading text-[26px] sm:text-[38px] font-bold leading-[1.15] tracking-tight mt-2.5` → 설명 `text-[15px] sm:text-[17px] text-zinc-600 mt-2 max-w-[40em]` → 작성자 줄 `mt-3.5 flex flex-wrap items-center gap-2 text-[13px] text-zinc-600`(아바타 28px + `<b>`이름 + `· {author_role==='team' ? '팀 프로젝트' : '개인 프로젝트'} · {등록일 ko-KR '2026년 9월 12일'} 등록`) → 버튼 행 `mt-5 flex flex-wrap gap-2.5`: 방문(`h-11 rounded-full ${SECTION_COLORS.explore.button}`), GitHub(h-11 outline), `EditButton`(ghost: `buttonVariants({variant:'ghost'})` + `rounded-full h-11`).
- [ ] **Step 3: 수치 띠 데이터** — items: ① `label:'별점', value: reviewCount>0 ? <><Star fill/>{avg.toFixed(1)}</> : '–', sub: reviewCount>0 ? \`리뷰 ${reviewCount}개\` : '아직 리뷰가 없어요'` ② `url`이 있을 때만 `{label:'방문', value: (click_count??0).toLocaleString('ko-KR'), sub:'회'}` ③ `label:'플랫폼', value: isWebsite&&hasAll ? 'Web' : PLATFORMS label 첫 값, sub: isWebsite&&hasAll ? '모든 브라우저' : (n>1 ? \`외 ${n-1}개\` : undefined)` ④ `label:'소스코드', value: source_type==='open' ? '오픈소스' : '비공개', sub: \`허용 ${license_features.length}개\``. 기존 별점 행·방문 수 블록(129–159행)은 삭제.
- [ ] **Step 4: 본문 2열** — 기존 `grid md:grid-cols-3 gap-8 mt-8` 유지. 왼쪽 `ReadingSurface`(제목 `<h2 className="font-heading text-xl font-bold mb-5">프로젝트 상세</h2>` + Markdown). 사이드 카드 3개(`rounded-3xl border bg-white p-6 shadow-sm`, 소제목 `text-[13px] font-semibold mb-3.5`): **개발자**(기존 개인/팀 블록 유지 + 개인이면 이메일 `text-xs text-zinc-500` + "프로필 보기 ›" 링크), **라이선스**(기존 허용/제한 목록 그대로, `license_custom` 추가 조건 유지), **정보**(key-value `flex justify-between text-sm`: 종류 / 플랫폼(라벨 join) / 공개 여부(기존 알약) / 등록일 / 최근 수정 `updated_at`). 기존 "환경 및 플랫폼" 카드 삭제.
- [ ] **Step 5: 리뷰** — `ProjectReviews` 바깥 카드 제거, `mt-10`에 `<h2 className="font-heading text-[22px] font-bold">리뷰<span className="ml-1.5 text-base font-semibold text-zinc-500 tabular-nums">{n}</span></h2>`. 작성 폼은 카드(`rounded-3xl border p-5`) 안: 머리 행 `flex justify-between` 왼쪽 "별점 (선택)" 오른쪽 별 5개(기존 토글 로직), 본문 textarea `rounded-2xl min-h-[84px]`, 버튼 `h-9 rounded-full ${SECTION_COLORS.explore.button}` "리뷰 남기기". 로그인 안내·"이미 작성" 행은 같은 카드 톤으로. `ReviewList`는 `divide-y` 대신 각 리뷰를 `rounded-3xl border p-4.5` 카드로, 별점 없는 리뷰는 별 행 생략.
- [ ] **Step 6: 확인** — tsc·lint. 시각: 리뷰 있는 공개 프로젝트, 리뷰 0·`url` 없음 프로젝트(3칸, "–"), 팀 프로젝트(팀원 목록·"팀 프로젝트") 각각 데스크탑·모바일·다크. 수치 띠 모바일 2×2.
- [ ] **Step 7: Commit** — `git commit -m "feat(project): 상세 머리 스티커 아이콘·수치 띠·사이드 카드 3개·리뷰 카드"`

---

### Task 8: 개발자 프로필 · 마이페이지

**Files:**
- Modify: `src/app/(nav)/developers/[id]/page.tsx` (38–246행)
- Modify: `src/components/projects/project-card.tsx:181-200` (manage 모드 푸터에 수정 버튼)

**Interfaces:**
- Consumes: `PageHero`(`avatar` prop), `ProjectCard mode="manage"`.
- Produces: `ProjectCard` manage 모드 푸터 오른쪽에 `[수정]`(`Link /projects/${id}/edit`, `h-7.5 rounded-full outline xs`, z-20) 추가.

- [ ] **Step 1: 데이터** — 기존 사용자·프로젝트 쿼리 유지. 추가 2개를 `Promise.all`에: `tips` `select('id,title,cover_url,created_at, tip_likes(count), tip_comments(count)').eq('author_id', id).order('created_at',{ascending:false}).limit(5)`, `ideas` `select('id,title,status,created_at').eq('author_id', id).order('created_at',{ascending:false}).limit(5)`. 둘을 `created_at` 내림차순으로 합쳐 `posts: Array<{kind:'tip'|'idea', id, title, when, cover_url?, status?, likeCount?, commentCount?}>`.
- [ ] **Step 2: 머리** — `<PageHero section="explore" icon={User} avatar={<아바타 h-[84px] w-[84px] sm:h-[104px] sm:w-[104px] rounded-full ring-[3px] ring-white dark:ring-zinc-950 shadow-[…] />} title={displayName}>`에 children: 자기소개 `<p className="rise mt-3.5 max-w-[34em] text-base text-zinc-600 break-keep">`, 연락처 알약 행 `rise mt-5 flex flex-wrap justify-center gap-2`(각 `<a className="inline-flex h-[34px] items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 text-[13px] font-medium dark:…">` 아이콘 14px zinc-500 + 값; 이메일 알약은 항상 1개 — `contacts`에 `type==='email'`이 있으면 그것만, 없으면 `developer.email`로 생성), 관심분야 칩 `rise mt-3.5 flex flex-wrap justify-center gap-1.5`(`m-chip` 꼴 `h-5 rounded-full border text-[11px]`). `isOwner`면 `rise mt-4.5 flex gap-2`: `<ProfileSettingsDialog …>`(트리거 `h-9 rounded-full outline` "프로필 설정") + 로그아웃 ghost(현재 `AuthButtons`의 `handleSignOut`와 같은 동작을 하는 작은 클라이언트 버튼 — `profile-settings-dialog.tsx` 옆 `sign-out-button.tsx` 신규, `supabase.auth.signOut()` 후 `router.push('/')`). h1에는 `displayName = nickname || full_name || email.split('@')[0]`. 실명·이메일 줄은 머리에 두지 않는다. 기존 `<aside>` 카드 전체 삭제.
- [ ] **Step 3: 프로젝트 띠** — `<section className="border-t border-zinc-200 bg-zinc-50 py-8 dark:border-zinc-800 dark:bg-zinc-900/40 sm:py-11"><div className="mx-auto max-w-5xl px-6">` 머리 `flex items-baseline justify-between mb-4.5`: `<h2 className="font-heading text-[22px] font-bold">{isOwner?'내 프로젝트':'등록한 프로젝트'}<span class="ml-1.5 text-[15px] font-semibold text-zinc-500 tabular-nums">{n}</span></h2>` + isOwner면 오른쪽 `Link /projects/new` "새 프로젝트 등록". 그리드 `grid-cols-1 lg:grid-cols-2 gap-5`, `ProjectCard mode={isOwner?'manage':'showcase'}`, isOwner면 마지막에 `<Link href="/projects/new" className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-zinc-300 text-sm font-medium text-zinc-600 dark:border-zinc-700"><Plus/>새 프로젝트 등록</Link>`. 빈 상태 문구 기존 유지.
- [ ] **Step 4: 작성한 글** — `<section className="py-8 sm:py-11"><div className="mx-auto max-w-5xl px-6">` 머리 `작성한 글 {posts.length}`. 행 `<Link className="flex items-center gap-3.5 rounded-2xl border border-zinc-200 bg-white px-4.5 py-3.5 dark:…">`: 썸네일 `h-10 w-14 rounded-[10px]`(팁: cover_url 이미지 / 해줘: `bg-orange-100 dark:bg-orange-950` 빈 칸), 제목 `text-sm font-semibold` + 아래 `text-xs text-zinc-500` "개발 팁 · 3일 전" / "해줘! · 3주 전", 오른쪽 팁은 ♥·댓글 수(11px tabular), 해줘는 상태 알약(기존 `STATUS_LABELS` 색). 비면 "아직 쓴 글이 없어요" + `/tips/new` 링크.
- [ ] **Step 5: `ProjectCard` manage 푸터** — 공개/비공개 알약 옆에 `[수정]` Link(xs outline, `relative z-20`). 카드 전체 Link(z-10)와 겹치지 않게 기존 패턴 유지.
- [ ] **Step 6: 확인** — tsc·lint. 시각 `/me`(본인) · 타인 프로필 · 닉네임 없는 사용자(가능하면) 데스크탑·모바일·다크. 이메일 알약 정확히 1개. `grep -n "aside" "src/app/(nav)/developers/[id]/page.tsx"` 0.
- [ ] **Step 7: Commit** — `git commit -m "feat(profile): 가운데 프로필 머리, 연락처 알약, 프로젝트 띠, 작성한 글"`

---

### Task 9: 에디터·위저드 — EditorTabs, 팁/공지 작성, 해줘 등록·수정, 가이드

**Files:**
- Create: `src/components/shared/editor-tabs.tsx`
- Create: `src/components/forms/select-card.tsx`, `src/components/forms/toggle-chip.tsx`, `src/components/forms/choice-row.tsx`
- Modify: `src/components/tips/tip-editor.tsx` (120–287행)
- Modify: `src/app/(nav)/tips/new/page.tsx`, `src/app/(nav)/tips/[id]/edit/page.tsx`
- Modify: `src/components/announcements/announcement-editor.tsx`
- Modify: `src/app/(nav)/announcements/new/page.tsx`, `src/app/(nav)/announcements/[id]/edit/page.tsx`
- Modify: `src/components/haejwo/haejwo-wizard.tsx` (112–300행)
- Modify: `src/app/(nav)/haejwo/new/page.tsx`, `src/app/(nav)/haejwo/[id]/edit/page.tsx`
- Modify: `src/components/guide/guide-wizard.tsx` (101–190행)
- Modify: `src/app/(nav)/guide/page.tsx`, `src/app/(nav)/guide/[...slug]/page.tsx` (머리만)

**Interfaces:**
- Produces:
  ```tsx
  export type EditorTab = 'write' | 'split' | 'preview';
  export function EditorTabs(props: { value: EditorTab; onChange: (t: EditorTab) => void; showSplit?: boolean }): JSX.Element;
  // 세그먼트: rounded-[10px] bg-zinc-100 dark:bg-zinc-800 p-[3px], 항목 h-7 rounded-lg px-3 text-xs; 활성 bg-white dark:bg-zinc-900 shadow-sm; 분할은 hidden md:inline-flex
  ```
  공용 클래스 상수 `TITLE_INPUT_CLASS = "h-auto rounded-none border-0 border-b border-zinc-200 bg-transparent px-0 py-2 font-heading text-[22px] sm:text-[26px] font-bold tracking-tight shadow-none focus-visible:ring-0 focus-visible:border-zinc-900 dark:border-zinc-800 dark:focus-visible:border-white"`(editor-tabs.tsx에서 export).
  폼 선택 UI 3종(`src/components/forms/`):
  ```tsx
  export function SelectCard(p: { selected: boolean; onSelect: () => void; icon: LucideIcon; label: string; description?: string; tone?: 'neutral' | SectionKey }): JSX.Element;   // role=button, tabIndex 0, Enter/Space, aria-pressed
  export function ToggleChip(p: { pressed: boolean; onToggle: () => void; label: string; icon?: LucideIcon; disabled?: boolean; tone?: 'neutral' | SectionKey }): JSX.Element; // <button type=button aria-pressed>, disabled → aria-disabled tabIndex -1 opacity-35
  export function ChoiceRow(p: { selected: boolean; onSelect: () => void; icon: LucideIcon; label: string; description: string; tone?: 'neutral' | SectionKey; disabled?: boolean; disabledReason?: string }): JSX.Element; // 가이드 옵션 행 마크업
  ```
  `tone='neutral'`(기본): 선택 = `border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-900`, 타일/원 `bg-zinc-900 text-white dark:bg-white dark:text-zinc-950`. `tone=SectionKey`: `SECTION_COLORS[tone]` 사용(타일 `tile`, 선택 테두리는 `pill` 색의 `border-*`, 원 `pill`). 포커스 `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`.

- [ ] **Step 1: `EditorTabs` + 폼 선택 UI 3종** — 위 사양대로 네 파일.
- [ ] **Step 2: `TipEditor`** — 두 카드(`rounded-3xl border bg-white p-5 sm:p-7 shadow-sm`)로 감싼다. 카드 1: 제목 `Input`에 `TITLE_INPUT_CLASS`(라벨은 `sr-only`), 2열 `grid sm:grid-cols-2 gap-3.5`(한 줄 요약 / 태그; 기존 카운터·오류 유지), 대표 이미지 `ImageUploadInput`(드롭존 겉모양 `border-2 border-dashed rounded-2xl`은 `image-upload-input.tsx` 수정이 필요하면 클래스만). 카드 2: 머리 `flex justify-between`(`<h2 className="font-heading text-lg font-bold">본문 <small className="text-xs font-medium text-zinc-500">마크다운</small></h2>` + `<EditorTabs/>`), textarea `rounded-2xl min-h-[320px]`. 하단 행 `flex flex-wrap items-center justify-end gap-2.5` 왼쪽 `mr-auto text-xs text-zinc-500` "발행하면 바로 목록에 올라가요. 수정은 나중에도 할 수 있어요.", 취소 ghost, 제출 `h-11 rounded-full ${SECTION_COLORS.tips.button}` 라벨 create "팁 발행" / edit "저장".
- [ ] **Step 3: 팁 new/edit 페이지** — 바탕 흰색, `<PageHero section="tips" icon={Newspaper} title="새 팁 작성"|"팁 수정" variant="compact"/>` + `main max-w-3xl px-6 py-7`. 기존 h1·p 제거.
- [ ] **Step 4: `AnnouncementEditor` + 페이지** — 같은 두 카드 구조. 카드 1 맨 위 카테고리 카드 선택(기존 UI, 선택 상태 sky 유지 — 단일 선택), 그 아래 제목 `TITLE_INPUT_CLASS`. 제출 `${SECTION_COLORS.announcements.button}` "공지 올리기"/"저장". 페이지는 compact PageHero(`section="announcements"`, Bell, "공지 작성"/"공지 수정") + `max-w-3xl`; 기존 바깥 카드 `<div className="rounded-3xl …">` 제거(에디터가 카드를 가짐).
- [ ] **Step 5: `HaejwoWizard`** — 위 행: "이전" ghost 알약 유지, 단계 표시를 `<span className="inline-flex h-7 items-center rounded-full bg-orange-100 px-3 text-xs font-semibold text-orange-700 tabular-nums dark:bg-orange-950 dark:text-orange-300">{n}단계</span>`. h2 `font-heading text-2xl sm:text-[28px]`. 1·2단계 옵션 버튼을 `<ChoiceRow tone="haejwo" icon={TYPE_ICONS[value] | CATEGORY_ICONS[value]} label description={PROJECT_TYPES·FEATURES의 desc, 없으면 GUIDE_PROGRAM_TYPES의 desc 재사용} selected onSelect/>`로(`type-icons.ts`는 Task 4). 3단계: 부제에 `${typeLabel} · ${categoryLabel}로 분류했어요.`, 제목 `TITLE_INPUT_CLASS`, `EditorTabs showSplit={false}`, 제출 `h-11 rounded-full bg-orange-700 hover:bg-orange-800`. `mode==='edit'`: 위 행에 단계 알약·이전 없음, 제출 "저장".
- [ ] **Step 6: 해줘 new/edit 페이지** — compact PageHero(`section="haejwo"`, Megaphone, "해줘! 등록"/"해줘! 수정") + `main max-w-2xl px-6 py-7`.
- [ ] **Step 7: `GuideWizard` + 페이지** — `/guide/page.tsx`: 바탕 흰색, 기존 h1·p를 `<PageHero section="guide" icon={BookOpen} title="나도 개발해볼래!" description="만들고 싶은 프로그램과 쓰는 컴퓨터를 고르면 시작 방법을 단계별로 알려줘요."/>`로, `main max-w-2xl px-6 py-9`. 위저드: 단계 표시 알약 `bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300`, 옵션 버튼을 `<ChoiceRow tone="guide" …disabled disabledReason/>`로 교체(기존 `STEP_OPTION_ICONS` 맵은 아이콘 prop으로 전달, 비활성 이유 표시 유지). `/guide/[...slug]/page.tsx`: 바탕 흰색, compact PageHero(`section="guide"`, title=기존 h1 텍스트) + 선택 요약 칩 행은 머리 children으로; `GuideViewer` 그대로.
- [ ] **Step 8: 확인** — tsc·lint. 시각 `/tips/new`, `/announcements/new`, `/haejwo/new`(1단계·3단계), `/guide`, `/guide/website/claude-code/mac` 데스크탑·모바일·다크. `grep -rn "DescTabButton\|TabButton" src/components/tips src/components/announcements src/components/haejwo` → 0(모두 EditorTabs).
- [ ] **Step 9: Commit** — `git commit -m "feat(editor): EditorTabs 공유, 팁·공지 작성/해줘 위저드/가이드 머리 톤 통일"`

---

### Task 10: 프로젝트 등록·수정 폼

**Files:**
- Create: `src/components/forms/form-section.tsx`, `src/components/forms/form-rail.tsx`
- Modify: `src/components/projects/project-form.tsx` (480–1165행 렌더부; 상태·핸들러 1–479행은 그대로)
- Modify: `src/app/(nav)/projects/new/page.tsx`, `src/app/(nav)/projects/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `EditorTabs`, `SelectCard`, `ToggleChip`, `ChoiceRow`(Task 9), `PageHero`, `TYPE_ICONS`·`CATEGORY_ICONS`(Task 4), `ProjectIcon`.
- Produces:
  ```tsx
  export function FormSection(p: { id: string; title: string; hint?: string; danger?: boolean; children: React.ReactNode }): JSX.Element; // rounded-3xl border p-5 sm:p-7, h2 font-heading text-lg; danger → border-rose-300 dark:border-rose-900 + h2 text-rose-700
  export function FormRail(p: { sections: Array<{ id: string; title: string; done: boolean }>; requiredDone: number; requiredTotal: number; className?: string }): JSX.Element; // 'use client', IntersectionObserver로 현재 섹션 강조, 클릭 scrollIntoView({behavior:'smooth', block:'start'}); 완료 원 bg-zinc-900 dark:bg-white + Check, 현재 항목 bg-zinc-100 dark:bg-zinc-800, 아래 "필수 항목 {done} / {total}"
  ```

- [ ] **Step 1: `FormSection`·`FormRail` 작성** — 위 인터페이스.
- [ ] **Step 2: (삭제됨 — 선택 UI는 Task 9에서 완료)**
- [ ] **Step 3: `ProjectForm` 렌더부 재구성** — `<form className="space-y-4.5">` 안에 `FormSection` 5개(§5.9 순서·내용). ① `id="basic"` "기본 정보": 아이콘 행(`ProjectIcon` 72px 스티커 미리보기 + `ToggleChip` 2개 "URL에서 자동 추출"/"직접 올리기"(iconType) + 힌트; link 모드면 아래 `ImageUploadInput`), 2열 이름/링크, 간단 설명(힌트 "탐색 카드에 2줄까지 보여요. 60자 안쪽이 좋아요.", 기존 100자 카운터 유지). ② `id="description"` "상세 설명 (마크다운)": `EditorTabs` + textarea. ③ `id="category"` "분류": 종류 `grid grid-cols-2 sm:grid-cols-3 gap-2.5`의 `SelectCard`(설명: 웹사이트 "브라우저에서 열어요" / 앱 "모바일·데스크톱 앱" / 확장 "브라우저·에디터" / CLI "터미널 도구" / 라이브러리 "가져다 쓰는 모듈"), 플랫폼 `ToggleChip`(웹사이트면 전부 pressed+disabled + 기존 안내문), 카테고리 `ToggleChip`(아이콘) + 기타 입력. ④ `id="source"` "소스코드·라이선스": `ChoiceRow` 2개(오픈소스/비공개, `grid sm:grid-cols-2 gap-2.5`), 오픈이면 저장소 링크, 허용 `ToggleChip` 6개 + 힌트 + 기타 조건. ⑤ `id="visibility"` "공개 범위·만든 사람": `ChoiceRow` 공개/비공개(비공개면 기존 허용 이메일 목록), `ChoiceRow` 개인/팀(팀이면 기존 팀 이름·팀원 UI). ⑥ `canDelete`면 `FormSection danger id="danger" title="위험 구역" hint="수정 페이지에서만"`: 왼쪽 "삭제하면 리뷰까지 함께 사라지고 되돌릴 수 없어요." + `[프로젝트 삭제]`(outline h-9, 기존 Dialog). 하단 `flex justify-end gap-2.5`: 취소 ghost(`router.back()` 또는 `/explore`), 제출 `h-11 rounded-full ${SECTION_COLORS.new.button}` "등록하기"/"저장하기" + Rocket. 기존 `scrollToField` id들(`title_section` 등)은 각 필드 래퍼에 그대로 둔다. 필수 별표 `text-rose-600`.
- [ ] **Step 4: 레일** — `ProjectForm`이 `requiredDone/Total`을 계산해(필수 7: 아이콘, 이름, 링크, 간단 설명, 상세 설명, 종류, 플랫폼) 섹션 완료 여부와 함께 `FormRail`에 넘긴다. 레이아웃: 페이지에서 `<div className="mx-auto flex max-w-5xl items-start gap-10 px-6 py-9"><div className="min-w-0 flex-1 max-w-3xl"><ProjectForm/></div><FormRail className="hidden lg:grid w-[200px] sticky top-24"/></div>` — `ProjectForm`이 폼과 레일을 함께 렌더하도록 `ProjectForm` 루트를 이 flex로 바꾸고 페이지는 바탕+PageHero만 둔다.
- [ ] **Step 5: 페이지** — new: 바탕 흰색 + `<PageHero section="new" icon={Rocket} title="프로젝트 등록하기" description="직접 만든 프로그램을 올리면 다른 학생들이 써 보고 리뷰를 남길 수 있어요."/>`; edit: title "프로젝트 수정", description "프로젝트의 최신 정보를 반영해요."
- [ ] **Step 6: 확인** — tsc·lint. 시각 `/projects/new` 1280(레일 보임, 섹션 클릭 스크롤), 390(레일 없음, 2열 종류 카드), 다크. 키보드: Tab으로 종류 카드·라디오 행 이동, Enter/Space 선택. 웹사이트 선택 → 플랫폼 칩 전부 선택·잠김 → 앱으로 바꾸면 해제. `grep -c "emerald" src/components/projects/project-form.tsx` → 0(색은 `SECTION_COLORS.new.button`만, 문자열 매칭 안 됨). 수정 페이지에서 위험 구역 노출(팀원 계정이면 미노출).
- [ ] **Step 7: Commit** — `git commit -m "feat(project-form): 카드 5장·목차 레일·무채색 선택 UI로 등록 폼 재구성"`

---

### Task 11: 로그인 · 온보딩 · 접근 거부

**Files:**
- Create: `src/components/auth/auth-shell.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/components/auth/google-login-button.tsx`
- Modify: `src/app/onboarding/page.tsx`, `src/app/onboarding/onboarding-form.tsx`
- Modify: `src/app/auth/forbidden/page.tsx`

**Interfaces:**
- Produces:
  ```tsx
  export function AuthShell(props: { children: React.ReactNode; mark?: 'logo' | 'warning' }): JSX.Element;
  // <main className="paper-grid grid min-h-screen place-items-center px-6 py-10 sm:py-[72px]"><div className="relative z-10 flex w-full max-w-[400px] sm:max-w-[620px] flex-col items-center text-center">
  //   mark: logo → <Image src="/logo.svg" 64/84px rounded-[20px]/[26px] shadow sticker rise>, warning → rose 타일(ShieldAlert) 같은 크기
  export const AUTH_TITLE_CLASS = "rise font-heading text-[32px] sm:text-5xl font-bold tracking-tight mt-5.5 sm:mt-7.5";
  export const AUTH_LEAD_CLASS = "rise mt-2.5 sm:mt-3.5 text-[15px] sm:text-[19px] text-zinc-600 dark:text-zinc-400 break-keep";
  export function AuthNote(props: { children: React.ReactNode }): JSX.Element; // rounded-2xl border bg-white p-4 text-left text-[13px] sm:text-sm, ShieldCheck blue
  ```

- [ ] **Step 1: `AuthShell`·`AuthNote`** — 위 사양. `.rise` 지연 0/60/120/180/240/280ms는 각 자식이 `style={{'--rise-delay'}}`로.
- [ ] **Step 2: 로그인** — `<AuthShell mark="logo">`: h1 "로그인", 설명 "학교 구글 계정으로 로그인해요.", `<GoogleLoginButton/>`, `errorMsg`면 `<div role="alert" className="rise mt-4.5 w-full max-w-[460px] rounded-[14px] bg-rose-50 px-3.5 py-3 text-left text-[13px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">`, `<AuthNote>`(`@ts.hs.kr` 굵게 + "개인 구글 계정은 막혀 있어요. 졸업생도 학교 계정이 살아 있으면 그대로 써요."), 뒤로 링크 `mt-6.5 text-[13px] text-zinc-600`(ArrowLeft "모든 프로젝트로 돌아가기"). 기존 `Card` 제거. `ERROR_MESSAGES`·`safeNext` 그대로.
- [ ] **Step 3: `GoogleLoginButton`** — 겉모양 `mt-7 sm:mt-10 flex h-13 sm:h-15 w-full max-w-[460px] items-center justify-center gap-3 rounded-full border border-zinc-200 bg-white text-[15px] sm:text-[17px] font-semibold shadow-sm dark:…`, 공식 G 로고 SVG 20/24px(4색 path, `aria-hidden`), 라벨 "Google로 계속하기". 클릭 로직 그대로.
- [ ] **Step 4: 온보딩** — `page.tsx`: `bg-zinc-950` 고정 제거, `<AuthShell mark="logo"><OnboardingForm user={user}/></AuthShell>`. `OnboardingForm`: `Card` 제거. 단계 알약 `<span className="rise mt-5.5 inline-flex h-[26px] items-center rounded-full bg-blue-50 px-2.75 text-xs font-semibold text-blue-700 tabular-nums dark:bg-blue-950 dark:text-blue-300">{step} / 2단계</span>`, h1 `AUTH_TITLE_CLASS`(단, 32px/40px로 한 단계 작게 — `sm:text-[40px]`), 설명 `AUTH_LEAD_CLASS`. 1단계: `w-full max-w-[460px] text-left mt-7`에 라벨 + `Input h-11 rounded-xl`(다크 전용 색 제거) + 힌트 "2~12자" + 오류, 버튼 `[다음]` `h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white w-full max-w-[460px]` + ChevronRight. 2단계: 관심 분야를 `ToggleChip tone="neutral"`(Task 9) `flex flex-wrap justify-center gap-2 max-w-[520px] mt-6.5`, 힌트, 버튼 행 `flex w-full max-w-[460px] gap-2.5 justify-between`: `[건너뛰기]` ghost, `[시작하기]` blue + Rocket. 맨 아래 `<span className="rise mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-1.5 pr-3 text-[13px] text-zinc-600">`(아바타 22px + `{email}로 로그인했어요`). zod·`updateProfile`·`router` 로직 그대로.
- [ ] **Step 5: 접근 거부** — `<AuthShell mark="warning">`: h1 "이 계정으로는 들어올 수 없어요", 설명 "대구과학고 **@ts.hs.kr** 계정만 쓸 수 있어요. 학교에서 받은 구글 계정으로 다시 로그인해 주세요.", `[다른 계정으로 로그인]`(`Link /login`, `h-11 rounded-full bg-blue-600 …`, ArrowLeft), `<AuthNote>` "개인 구글 계정으로 로그인하면 이 화면이 나와요. 학교 계정이 없거나 만료됐다면 정보부에 문의해요." `Card`·`destructive` 토큰 제거.
- [ ] **Step 6: 확인** — tsc·lint. 시각 `/login`, `/login?error=domain_not_allowed`, `/auth/forbidden`, `/onboarding`(닉네임 없는 계정 또는 리다이렉트 조건 일시 우회 금지 — 가능하면 로컬 테스트 계정) 데스크탑·모바일·다크. 모눈이 화면 전체에 깔리고 물결, 콘텐츠 가운데 620px. `grep -n "bg-zinc-950\b" src/app/onboarding/page.tsx` → 0.
- [ ] **Step 7: Commit** — `git commit -m "feat(auth): 로그인·온보딩·접근 거부를 AuthShell(모눈 물결) 틀로"`

---

### Task 12: 마무리 — 잔재 제거, 전체 점검, 문서

**Files:**
- Modify: `CLAUDE.md`, `AGENTS.md` (§9 목록)
- Modify: 남은 `bg-zinc-50 dark:bg-zinc-950` / `px-4 sm:px-6` 사용처(있으면)

- [ ] **Step 1: 잔재 grep**

Run:
```bash
grep -rn "px-4 sm:px-6" src --include=*.tsx | grep -v node_modules
grep -rn "bg-zinc-50 dark:bg-zinc-950" src/app --include=*.tsx
grep -rn "transition-all\|hover:scale-\|backdrop-blur\|blur-\[" src --include=*.tsx
grep -rn "amber" src --include=*.tsx | grep -v "fill-amber-400\|text-amber-400\|feedback\|의견"
```
Expected: 4개 모두 0줄(별점·공지 카테고리 amber 제외). 남은 것이 있으면 고치고 다시 실행.

- [ ] **Step 2: 전체 시각 점검** — 15개 라우트 × 데스크탑/모바일 × 라이트/다크 스크린샷을 `/tmp/dshs-shots/`에 저장하고 훑는다. 체크: 머리 구조 동일, 섹션 색 세 군데만, 모바일 24px 대칭, 가로 넘침 없음(`scrollWidth <= innerWidth`), 다크 본문 카드.
- [ ] **Step 3: 접근성 점검** — `/explore`(모바일 칩 바), `/projects/new`, `/guide`에서 Tab 순회·Enter/Space·`aria-pressed`/`aria-expanded` 확인(playwright-cli `snapshot`으로 role 트리 확인).
- [ ] **Step 4: 문서** — `CLAUDE.md`: 「📱 반응형」 `px-4 sm:px-6` → `px-6`; 「전역 페이지 내비게이션」 개발 팁 색 amber → tip(pink, `#db2777`, `@theme` 토큰); 「탐색/검색」(머리 검색창, 사이드바 유지, 모바일 칩 바, 2열, 6xl); 「프로젝트 상세」(수치 띠 4칸, 정보 카드 통합, 스티커 아이콘 112px); 「개발자 프로필 페이지」(가운데 머리, 닉네임만, 이메일은 알약, 작성한 글); 「협업 및 코드 스타일 규칙 › Design System」(PageHero·섹션 색 세 군데·폼 무채색 반전·모눈 `#f0f0f3`/`#18181c` + 물결·다크 글 카드·공유 컴포넌트 목록과 경로); 「🗂️ 디렉토리 구조」에 `components/forms`, `components/auth`, 새 shared 파일; 각 기능 섹션의 머리 설명. `AGENTS.md`도 같은 변경. 스펙 상태를 "구현 완료(날짜)"로.
- [ ] **Step 5: 최종 확인** — `npx tsc --noEmit && npm run lint && npm run build` 통과.
- [ ] **Step 6: Commit** — `git commit -m "docs: 하위 페이지 톤 통일 반영 (CLAUDE.md·AGENTS.md)"`
