# CLAUDE.md

> 이 파일은 Claude Code가 본 프로젝트를 작업할 때 참고하는 컨텍스트 문서입니다.
> 프로젝트의 목적, 기술 스택, 요구사항, 진행 상황, 협업 규칙을 한곳에서 관리합니다.

---

## 🎯 프로젝트 개요

- **프로젝트명:** DSHS Developer Platform (대곽 개발자 플랫폼)
- **목적:** 대구과학고등학교(`@ts.hs.kr`) 학생들이 개발한 프로그램(웹, 앱 등)을 한곳에 모아 **공유, 검색, 피드백**할 수 있는 교내 전용 포트폴리오 + 앱스토어 플랫폼
- **주요 사용자:** 대구과학고 재학생 및 졸업생 (도메인 인증 기반)

---

## 🛠️ Tech Stack

| 계층 | 기술 |
|---|---|
| **Framework** | Next.js 16 (**App Router 필수**, TypeScript strict) |
| **Styling** | Tailwind CSS v4 + shadcn/ui (`base-nova` style, base-ui/react 기반) |
| **BaaS (DB & Auth)** | Supabase (PostgreSQL + Supabase Auth + **RLS**) |
| **Hosting** | Vercel |
| **추가 라이브러리** | `@supabase/ssr`, `react-hook-form`, `zod`, `lucide-react`, `date-fns`, `sonner`, `next-themes`, `react-markdown` + `remark-gfm` (바이브 코딩 가이드 렌더링) |

> ⚠️ shadcn `base-nova` style 의 Button 은 **`asChild` 미지원**. Link 에 `buttonVariants()` 클래스를 입혀 사용.

---

## 🔐 인증 및 권한

### 인증 방식
- **Google OAuth 단일 지원** (Supabase Auth 경유)
- **`@ts.hs.kr` 도메인 제한** — 3단 검증으로 차단:
  1. Google `hd` 파라미터 (1차, UX 필터)
  2. Next.js Middleware에서 `session.user.email` 검사 (2차, 라우트 보호)
  3. Supabase RLS 정책 + `users.email CHECK '%@ts.hs.kr'` (3차, DB 레벨 최종 방어선)

### 권한 계층

| Role | 권한 |
|---|---|
| **Guest** (비로그인) | Public 프로젝트 열람, 검색/필터링 |
| **User** (로그인) | 위 + 프로젝트 게시/수정/삭제, 댓글/별점 작성. Private 프로젝트는 작성자 또는 `allowed_users`에 포함된 사용자만 접근 |

### 보호 라우트 (`src/middleware.ts`)
- `/projects/new`, `/projects/[id]/edit`, `/me`
- 비로그인 시 `/login?next=<원래경로>` 로 리다이렉트
- 이미 로그인된 사용자가 `/login` 진입 시 홈으로

---

## 🧩 핵심 기능 — 프로젝트 체크리스트

프로젝트 게시·검색 시 사용하는 표준 분류 항목. 옵션 값은 `src/lib/constants.ts` 에 정의됨.

| 항목 | 키 | 값 |
|---|---|---|
| **프로그램 종류** | `type` | 웹사이트, 앱, 확장프로그램, CLI, 라이브러리 |
| **지원 플랫폼** | `platforms` | Web, iOS, Android, Windows, macOS, Linux (다중 선택) |
| **소스코드** | `source_type` | `open`(`repo_url` 필수) / `closed` |
| **라이선스 권한** | `license_features` | 상업적 이용, 수정, 배포, 개인적 이용, 법적 책임, 보증 (다중 선택) |
| **공개 여부** | `visibility` | `public` / `private` |
| **작성자 형태** | `author_role` | `individual` / `team` |
| **아이콘** | `icon_type` | `auto` (URL favicon) / `link` (이미지 링크 입력) |

### 프로젝트 등록 폼 UX (`src/components/projects/project-form.tsx`)
- **프로그램 종류 선택**: `<Select>` 드롭다운 대신 다른 항목들과 동일한 **카드 그리드 UI** (단일 선택). 5개 항목, 2~3열 배치.
- **플랫폼 자동 선택**: `type === 'website'` 선택 시 `useEffect`로 모든 플랫폼을 자동 선택하고 카드를 비활성화(`pointer-events-none`). "💡 모든 플랫폼은 web 사이트를 실행할 수 있습니다." 안내 표시. 다른 종류로 바꾸면 잠금 해제.
- 플랫폼 힌트 문구(웹사이트 제외)는 제거됨 — 사용자가 직접 선택.

---

---

## 🧭 바이브 코딩 가이드 (`/guide`)

만들고 싶은 프로그램에 맞춰 단계별 시작 가이드를 추천하는 기능. 회원가입 위저드와 유사한 UX.

### 선택 위저드 (`src/components/guide/guide-wizard.tsx`)
- 질문 순서: **프로그램 종류 → (앱이면) 앱 플랫폼 → 터미널 사용 여부 → AI 도구 → 운영체제**
- 단계는 이전 선택에 따라 **동적으로 노출/비활성화**됨 (예: 앱 플랫폼으로 iOS·iPadOS·macOS 선택 시 운영체제 단계에서 macOS 외 항목 잠금 + 이유 표시).
- 진행바 없음(단계 수 가변). 상단 고정 영역에 "이전" 버튼(첫 단계에서는 숨김)과 우측 "N단계" 표시.
- 모든 단계 응답 시 `/guide/<선택값들 '/' 연결>` 로 이동. 노출된 단계만 슬러그에 포함(앱 5세그먼트 / 그 외 4세그먼트).

### 단계 정의 (`src/lib/guide.ts`) — 위저드·결과 페이지 공유
- `GUIDE_STEPS`: 단계별 제목/옵션/`visible()`/`disabledReason()` 정의. 단계 추가·수정은 이 파일만 고치면 됨.
- `buildSlug()` / `resolveSlug()`: 답변 ↔ URL 슬러그 변환. 비활성 조합·세그먼트 수 불일치는 `null` → 결과 페이지에서 `notFound()`.
- 옵션 값은 `src/lib/constants.ts` 의 `GUIDE_*` 상수에 정의.

### 가이드 콘텐츠 (마크다운, `src/content/guides/*.md`)
- 가이드 본문은 마크다운 파일로 **직접 작성**. 작성법은 `src/content/guides/README.md` 참고(가이드로 노출 안 됨).
- 파일명 = 매칭 조합. 선택값을 `--` 로 연결 (예: `website--claude-code--mac.md`, `claude-code--mac.md`, `website.md`, `default.md`).
- **부분 매칭 + 폴백**: 구체적 파일 → 일반 파일 → `default.md` 순. 모든 조합을 만들 필요 없음. 매칭 로직: `src/lib/guide-content.ts` (`loadGuide`, server 전용 `fs`).
- 파일 내 `---` 한 줄로 단계 구분. 결과 페이지 `GuideViewer`(`src/components/guide/guide-viewer.tsx`)가 이전/다음으로 한 단계씩 표시.
- **마지막 "다음으로 해볼 것" 카드**: 파일 끝에 `===` 한 줄 뒤 섹션을 두면, 마지막 단계에서 "다시 선택하기" 대신 카드 묶음으로 노출되고 자동 부드러운 스크롤. 형식: 첫 헤딩=섹션 제목, 리스트 `- [버튼라벨](링크) — 설명`. 내부 링크(`/`로 시작)는 `Link`, 외부는 새 탭.

---

## 📝 개발 팁 블로그 (`/tips`)
- **목록** `/tips`(`revalidate=30`): 카드 그리드(커버·태그·작성자·좋아요/댓글 수·상대시간). 헤더 우측 "팁 작성".
- **작성** `/tips/new` · **수정** `/tips/[id]/edit`: `TipEditor`(`src/components/tips/tip-editor.tsx`) — 마크다운 작성/미리보기 탭. 둘 다 보호 라우트(미들웨어). 수정은 작성자만(서버에서 `author_id` 검증 후 아니면 리다이렉트).
- **상세** `/tips/[id]`(`revalidate=30`): `Markdown` 렌더, 좋아요(`TipLikeButton`, 낙관적), 댓글(`TipComments`, 작성/삭제). 작성자에게만 수정/삭제 노출(`TipOwnerActions`).
- 서버 액션: `src/app/tips/actions.ts`(`createTip`/`updateTip`/`deleteTip`, 모두 `getUser` + `author_id` 검증).
- 마크다운 렌더 공용 컴포넌트: `src/components/shared/markdown.tsx`(팁·가이드 공유).

---

## 🔎 탐색/검색 (`/explore`)
- `src/components/explore/explore-client.tsx`: 클라이언트 측 필터링.
- 검색 대상: 프로젝트 제목·설명·태그(`features`) + **작성자 닉네임·실명·팀 이름**.
- 사이드바 필터: **프로그램 종류 → 플랫폼** 순 (다중 선택).
- 헤더 우측 버튼은 제거됨 — 전역 `PageNav`로 이동.

---

## 🗄️ 데이터베이스 스키마 (Supabase PostgreSQL)

> 실제 SQL: `docs/03-supabase-schema.sql` (통합본 단일 source of truth)
> TypeScript 타입: `src/lib/types.ts` (수동 작성)

### 주요 테이블 구조
- **`users`**: `id`, `email`, `full_name`, `nickname`, `bio`, `interests`, `avatar_url`
- **`projects`**: `id`, `author_id`, `title`, `description`, `type`, `platforms`, `source_type`, `repo_url`, `url`, `license_features`, `visibility`, `allowed_users`, `icon_url`
- **`reviews`**: `id`, `project_id`, `user_id`, `rating`, `comment`

### RLS 정책 요약
- **`users`**: 누구나 조회 가능, 본인만 수정 가능.
- **`projects`**: Public은 누구나, Private은 소유자 및 허용된 사용자만. 생성/수정/삭제는 소유자만.
- **`reviews`**: 프로젝트 접근 권한자만 조회 가능, 본인만 생성/수정/삭제 가능.

### 팁(블로그) 테이블 — `docs/08-supabase-tips.sql`
- **`tips`**: `id`, `author_id`, `title`, `summary`, `content`(마크다운), `cover_url`, `tags[]`, `created_at`, `updated_at`(트리거 자동 갱신).
- **`tip_likes`**: `tip_id`, `user_id`, `created_at`, PK(`tip_id`,`user_id`) — 좋아요 1인 1회.
- **`tip_comments`**: `id`, `tip_id`, `user_id`, `content`, `created_at`.
- RLS: 모두 조회는 누구나, 생성은 로그인, 수정/삭제는 본인만. (좋아요는 수정 없음)
- ⚠️ 새 환경에서는 이 SQL을 Supabase에서 실행해야 함.

---

## 🌏 인프라 및 배포 설정

| 항목 | 설정값 |
|---|---|
| **Vercel 배포 리전** | `icn1` (서울, ap-northeast-2) |
| **Supabase DB 리전** | `ap-northeast-2` (서울) |

> 두 서비스를 서울 리전으로 통일하여 서버 → DB 왕복 레이턴시를 최소화함.

---

## ⚡ 성능 최적화 적용 내역

### 미들웨어 온보딩 쿠키 캐시 (`src/middleware.ts`)
- 문제: 로그인된 사용자의 **모든 페이지 이동마다** Supabase DB에 닉네임 확인 쿼리 발생.
- 해결: 닉네임 확인 성공 시 `ds_onboarded=1` 쿠키(30일)를 발급. 이후 요청은 DB 쿼리 없이 쿠키만 확인.

### 프로젝트 상세 쿼리 병렬화 (`src/app/projects/[id]/page.tsx`)
- 문제: `project` → `user` → `reviews` 쿼리가 직렬 실행.
- 해결: `Promise.all`로 3개 쿼리 동시 실행.

### 공개 페이지 Vercel 캐시 (`src/app/page.tsx`, `src/app/explore/page.tsx`)
- 홈페이지: `revalidate = 60` (60초 캐시)
- 탐색 페이지: `revalidate = 30` (30초 캐시)

### 이미지 URL 파싱 (`src/lib/parse-image-url.ts`)
- 프로필 아바타 · 프로젝트 아이콘 모두 링크 입력 방식으로 통일.
- `parseImageInput()`: HTML embed(`<img src="...">`)와 BBCode(`[img]...[/img]`)에서 직접 이미지 URL 추출.
- `GET /api/resolve-image?url=`: ibb.co 페이지 URL을 서버에서 og:image로 변환 (직접 링크 불가 케이스 대응).
- imgbb.com 추천 힌트 텍스트를 두 입력 필드에 표시.

---

## 🧭 전역 페이지 내비게이션 (`PageNav`)

- 컴포넌트: `src/components/shared/page-nav.tsx` (`"use client"`, `usePathname()` + `useRef` + `useEffect` 사용)
- **표시 위치**: `SiteHeader` 로고·프로필과 **동일한 h-16 행** 안, 로고 우측에 얇은 구분선(`w-px h-5`)으로 분리하여 인라인 배치.
- **4개 버튼**: 모든 프로젝트(→ `/explore`), 프로젝트 등록(→ `/projects/new`), 나도 개발해볼래!(→ `/guide`), 개발 팁(→ `/tips`)
- **활성 버튼 판정**:
  - `/explore`, `/projects/*`(등록·수정 제외), `/developers/*` → "모든 프로젝트"
  - `/projects/new`, `*/edit` → "프로젝트 등록"
  - `/guide/*` → "나도 개발해볼래!"
  - `/tips/*` → "개발 팁"
- **슬라이딩 pill 애니메이션**: `absolute` pill 하나가 활성 버튼 위치로 부드럽게 이동·확장(`transition-all duration-300 ease-out`). `useRef` 배열 + `useEffect`로 활성 항목의 `offsetLeft`/`offsetWidth`를 읽어 `translateX` + `width` 적용.
- **라벨 펼침**: 활성 버튼만 라벨 텍스트 노출(`max-w-[160px] opacity-100`), 비활성은 **아이콘만**(`max-w-0 opacity-0`). 전환 시 부드럽게 slide-in/out.
- **버튼별 고유 색**: 모든 프로젝트=blue, 프로젝트 등록=emerald, 나도 개발해볼래!=purple, 개발 팁=amber.
- **너비 통일**: 모든 버튼 `min-w-9 justify-center` → 비활성 아이콘 크기 균일.
- **적용 방법**: `SiteHeader`에 `showNav` prop → `<SiteHeader showNav />`. 홈(`/`)·로그인(`/login`) 페이지는 미적용.

---

## 📱 반응형 / 모바일 최적화

> 원칙: **데스크탑(`sm:` 640px 이상) 디자인은 그대로 두고, 모바일(기본 브레이크포인트)에서만 보강**한다. 모든 반응형 클래스는 `기본값(모바일) + sm:기존값(데스크탑 동일)` 패턴으로 작성해 데스크탑 레이아웃이 픽셀 단위로 동일하게 유지되도록 한다.

- **좌우 여백**: 페이지 `<main>`/섹션은 `px-4 sm:px-6` (모바일 16px, 데스크탑 24px). 헤더(`SiteHeader`) 컨테이너도 동일.
- **헤더 우측 버튼**: 좁은 폰에서 오버플로우 방지를 위해 라벨을 반응형 처리. 예) tips의 "팁 작성"은 모바일 "작성"/데스크탑 "팁 작성"(`<span className="hidden sm:inline">`). `PageNav` 버튼은 비활성 시 아이콘만 표시하므로 별도 처리 불필요.
- **큰 제목**: 모바일에서 한 단계 작게. 홈 히어로 `text-4xl sm:text-5xl md:text-7xl`, 각 페이지 h1 `text-3xl sm:text-4xl`.
- **카드/섹션 패딩**: `p-6 sm:p-8` (모바일 24px, 데스크탑 32px).
- **세로 스택 전환**: 좁은 폭에서 잘리는 행은 `flex-col sm:flex-row`로 전환 (예: 프로젝트 리뷰의 "이미 작성하셨습니다" 행).
- 신규 페이지/컴포넌트 작성 시에도 위 패턴을 따를 것.

## 📌 작업 시작 전 체크리스트
1. `npm run dev` 실행 및 `http://localhost:3000` 확인.
2. `npx tsc --noEmit` 실행하여 타입 에러 0 확인.
3. `.env.local` 환경 변수 설정 확인.

## ⚠️ 보안 및 주의사항
- **실명 파생**: `student_mappings` 테이블은 삭제됨. 이제 `users.full_name`은 로그인 시 이메일(입학연도)과 구글 계정명(숫자4자리+이름)에서 자동 파생 — `src/app/auth/callback/route.ts` 참고.
- **Supabase Client**: 서버 사이드에서는 `createServerClient`, 클라이언트에서는 `createBrowserClient` 사용. 민감한 작업은 항상 `getUser()`로 검증.

---

## 🗂️ 현재 디렉토리 구조
```
src/
├── app/                  # App Router 레이어 (auth, projects, developers, explore, guide, tips 등)
│   ├── guide/            # 바이브 코딩 가이드 (page=위저드, [...slug]=결과 페이지)
│   └── tips/             # 개발 팁 블로그 (page=목록, new, [id], [id]/edit, actions.ts)
├── components/
│   ├── shared/           # site-header, page-nav, auth-buttons, back-button, markdown 등
│   ├── projects/         # project-card, project-form, project-icon, project-reviews 등
│   ├── explore/          # explore-client
│   ├── guide/            # guide-wizard, guide-viewer
│   ├── tips/             # tip-card, tip-editor, tip-like-button, tip-comments 등
│   └── ui/               # shadcn 컴포넌트
├── content/guides/       # 가이드 마크다운 콘텐츠 (.md, 직접 작성)
├── lib/                  # 유틸리티 및 설정 (supabase, constants, types, utils, guide, guide-content)
└── middleware.ts         # 세션 관리 및 도메인 검증
```

## 📝 협업 및 코드 스타일 규칙
- **TS Strict**: `any` 사용 금지, 인터페이스 명확히 정의.
- **Server First**: 상호작용이 필요한 경우에만 `"use client"` 사용.
- **Design System**: 글래스모피즘, Zinc/Blue 포인트, `rounded-3xl` 스타일 유지.
- **반응형**: 모든 페이지는 모바일에서도 최적화돼야 함. 데스크탑(`sm:`+)은 유지하고 모바일만 보강 (자세한 규칙은 「📱 반응형 / 모바일 최적화」 참고).
- **Documentation**: `CLAUDE.md` 및 `AGENTS.md`를 항상 최신 상태로 유지. — 외부 서비스 정보, 진행 상황, 결정 사항이 바뀌면 즉시 반영
