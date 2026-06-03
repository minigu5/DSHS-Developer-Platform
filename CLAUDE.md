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
| **BaaS (DB & Auth)** | Supabase (PostgreSQL + Supabase Auth) |
| **Hosting** | Vercel |
| **추가 라이브러리** | `@supabase/ssr`, `react-hook-form`, `zod`, `lucide-react`, `date-fns`, `sonner`, `next-themes` |

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
| **지원 플랫폼** | `platforms` (`text[]`) | Web, iOS, Android, Windows, macOS, Linux — 다중 선택 (앱이 아닌 경우 자동으로 전체) |
| **소스코드 공개 여부** | `source_type` | `open`(`repo_url` 필수) / `closed` |
| **라이선스 허용 항목** | `license_features` (`text[]`) | 상업적 이용, 수정, 배포, 개인적 이용, 법적 책임, 보증 — 다중 선택 |
| **라이선스 직접 입력** | `license_custom` | 위 항목으로 표현 안 되는 조건 |
| **기능/카테고리** | `features` (`text[]`) | 문서 편집, AI 활용, 학습 도구, 유틸리티, 게임 등 — 다중 선택 |
| **공개 여부** | `visibility` | `public` / `private` |
| **허용 사용자** | `allowed_users` (`text[]`) | private 일 때 추가로 접근 허용할 `@ts.hs.kr` 이메일 |
| **작성자 형태** | `author_role` | `individual` / `team` (팀이면 `team_name`, `team_members` 추가) |
| **아이콘** | `icon_type` + `icon_url` | `auto` (URL 의 favicon) / `upload` (직접 표시) |

> 💡 라이선스 항목이 "MIT/Apache/GPL 종류" 가 아닌 "허용 항목 체크박스" 로 설계된 이유: 학생 사용자에게 라이선스 종류명이 직관적이지 않으므로, 사용 권한을 직접 고르는 UX 로 단순화.

---

## 🗄️ 데이터베이스 스키마 (Supabase PostgreSQL)

> 실제 SQL: `docs/03-supabase-schema.sql` (drop + recreate 통합본, 단일 source of truth)
> TypeScript 타입: `src/lib/types.ts` (수동 작성, Supabase CLI 자동생성으로 교체 가능)

### `users`
| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `uuid` (PK) | `auth.users.id`와 연결, CASCADE |
| `email` | `text` not null | CHECK `like '%@ts.hs.kr'` |
| `full_name` | `text` | nullable |
| `avatar_url` | `text` | nullable |
| `created_at` | `timestamptz` | default `now()` |

> **트리거:** `on_auth_user_created` — `auth.users` INSERT 시 자동으로 `public.users` 생성 (`handle_new_user()` 함수).

### `projects`
| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `uuid` (PK) | default `gen_random_uuid()` |
| `author_id` | `uuid` (FK → users.id) | CASCADE |
| `title` | `text` | not null |
| `short_description` | `text` | nullable, ≤ 100자 권장 |
| `description` | `text` | not null |
| `type` | `text` | 체크리스트 참조 |
| `platforms` | `text[]` | default `'{}'` |
| `source_type` | `text` | `open` / `closed` |
| `repo_url` | `text` | source_type=open 일 때 필수 (앱 단 검증) |
| `url` | `text` | 웹사이트 / 다운로드 링크 |
| `license` | `text` | **nullable, legacy** — 신규 데이터는 비워둠. 실 데이터는 `license_features` 사용 |
| `license_features` | `text[]` | default `'{}'`, 허용 항목 다중 선택 |
| `license_custom` | `text` | nullable |
| `features` | `text[]` | default `'{}'` |
| `feature_custom` | `text` | nullable (features 에 `'other'` 포함 시) |
| `visibility` | `text` | CHECK in (`'public'`, `'private'`) |
| `allowed_users` | `text[]` | default `'{}'`, private 일 때 추가 접근자 이메일 |
| `author_role` | `text` | CHECK in (`'individual'`, `'team'`), default `'individual'` |
| `team_name` | `text` | nullable |
| `team_members` | `text[]` | nullable |
| `icon_type` | `text` | CHECK in (`'upload'`, `'auto'`) |
| `icon_url` | `text` | nullable |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

### `reviews`
| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `uuid` (PK) | |
| `project_id` | `uuid` (FK → projects.id) | CASCADE |
| `user_id` | `uuid` (FK → users.id) | CASCADE |
| `rating` | `int` | CHECK 1~5 |
| `comment` | `text` | not null |
| `created_at` | `timestamptz` | default `now()` |

### RLS 정책 요약

#### `users`
- **SELECT:** 누구나 (anyone) — 이메일/이름 조회 가능 (allowed_users 매칭용)
- **UPDATE:** `auth.uid() = id` (자기 자신만)

#### `projects`
- **SELECT (public):** `visibility = 'public'` → 누구나
- **SELECT (private):** `visibility = 'private'` AND (`auth.uid() = author_id` OR `(SELECT email FROM users WHERE id=auth.uid()) = ANY(allowed_users)`)
- **INSERT / UPDATE / DELETE:** `auth.uid() = author_id`

#### `reviews`
- **SELECT:** 해당 프로젝트가 SELECT 가능한 사용자만 (`EXISTS` 서브쿼리)
- **INSERT:** `auth.uid() = user_id`
- **UPDATE / DELETE:** `auth.uid() = user_id`

---

## 🌐 외부 서비스 정보

| 서비스 | URL / 식별자 |
|---|---|
| **GitHub Repository** | https://github.com/minigu5/DSHS-Developer-Platform |
| **Vercel Deployment** | https://dshs-developer-platform.vercel.app/ |
| **Supabase Project URL** | `https://aclcleemnsmxyixcfqro.supabase.co` |
| **Supabase Region** | Northeast Asia (Seoul) |
| **Google OAuth** | Google Cloud Console에서 생성 완료 (Web Client) |

### 환경 변수 (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (서버 전용)
- `NEXT_PUBLIC_SITE_URL` (로컬: `http://localhost:3000`, Vercel: production URL)
- `ALLOWED_EMAIL_DOMAIN=ts.hs.kr`

> Vercel 환경변수에도 동일하게 등록되어 있어야 함 — `NEXT_PUBLIC_SITE_URL`만 Vercel URL 로 다름.

---

## 📅 단계별 개발 계획 및 현재 상태

| Step | 내용 | 상태 |
|---|---|---|
| **Step 0** | Supabase 프로젝트 생성, Google OAuth 셋업, GitHub/Vercel 연결, `.env.local` 작성 | ✅ **완료** |
| **Step 1** | Next.js 16 (App Router) + Tailwind v4 + shadcn/ui + 필수 라이브러리 설치 | ✅ **완료** |
| **Step 2** | Supabase 클라이언트(`@supabase/ssr`), 미들웨어 도메인 검증, 로그인/콜백, 헤더(`AuthButtons`) | ✅ **완료** |
| **Step 3** | `users` / `projects` / `reviews` 테이블 + RLS + 트리거 SQL (`docs/03-supabase-schema.sql`) | ✅ **Supabase 적용 완료 (통합본 단일 파일)** |
| **Step 4** | 프로젝트 게시 폼(`ProjectForm`) UI + Insert 로직 | ✅ **End-to-end 게시 동작 확인 완료** |
| **Step 5** | 메인/탐색(Explore) 페이지 + 다중 조건 필터링 | ✅ **DB 연동 완료 + `<ProjectCard />` 추출** |
| **Step 6** | 프로젝트 상세 페이지 + 댓글/별점(Reviews) 기능 | ✅ **완료** |
| **Step 7** | 개발자 프로필 페이지 및 닉네임/자기소개 설정 | ✅ **완료** |
| **Step 8** | 프로젝트 아이콘 직접 업로드 및 폼 유효성 고도화 | ✅ **완료** |
| **Step 9** | UI/UX 폴리싱: 컴팩트 디자인 개편 및 콘솔 이슈 해결 | ✅ **완료** |
| **Step 10** | **온보딩 시스템**: 최초 로그인 시 전용 페이지 리다이렉트, 닉네임/관심분야 설정 | ✅ **완료** |
| **Step 11** | **프리미엄 인터랙션**: 전역 다크모드(시스템 연동), Haptic 피드백, 마이크로 애니메이션 | ✅ **완료** |

---

## 🚀 다음 세션에서 이어서 할 작업 (NEXT UP)

> **이 섹션은 새 Claude Code 세션이 컨텍스트 없이 바로 이어갈 수 있도록 작성됨.**
> 작업 시작 전에 먼저 확인: `npm run dev` 로 dev server 띄우고 `npx tsc --noEmit` 통과 여부 확인.
> 작업 순서는 의존성과 임팩트 순. 위에서부터 진행 권장.

### 작업 1️⃣ — 게시 폼 동작 검증 + `license` 컬럼 정리 ✅ **완료 (2026-06-03)**

- DB 스키마를 통합본(`docs/03-supabase-schema.sql`)으로 재생성. `license` 컬럼은 nullable 로 변경.
- `src/components/projects/project-form.tsx` payload 에서 의미 모호한 `license` fallback 라인 제거.
- `src/lib/types.ts` `projects.license`: `string` → `string | null`.
- `@ts.hs.kr` 계정으로 `/projects/new` end-to-end 게시 1 cycle 통과 확인.

---

### 작업 2️⃣ — 메인/탐색/마이페이지 DB 연동 + `<ProjectCard />` 추출 ✅ **완료 (2026-06-03)**

- `/`, `/explore`, `/me` 3개 페이지 모두 Supabase 쿼리로 동작 (이전 mock 데이터 전부 제거).
- 공통 카드 마크업을 `src/components/projects/project-card.tsx` 로 추출.
  - `ProjectCardData` 타입을 export 해서 페이지 쿼리에서 `.returns<ProjectCardData[]>()` 로 받음.
  - `mode="showcase"` (메인/탐색, 아이콘 헤더) / `mode="manage"` (마이페이지, 수정 버튼) 두 가지.
- 페이지 코드에서 `any` 사용 전부 제거. strict TS + lint 통과.
- `/explore` 는 SSR + 클라이언트 `useMemo` 필터링 유지 (searchParams 기반 SSR 필터는 SEO 이점이 크지 않아 일단 보류).

---

### 작업 7️⃣ — 온보딩 및 프리미엄 인터랙션 구현 ✅ **완료 (2026-06-03)**

- `/onboarding` 전용 페이지 및 폼 구현 (닉네임 중복 체크 + 관심 분야 선택).
- `middleware.ts`를 통한 온보딩 완료 강제화 (닉네임 미설정 시 접근 제한).
- `next-themes` 기반 전역 테마 시스템 구축 및 시스템 설정 연동.
- 모든 버튼/체크박스에 `scale` + `brightness` 기반 프리미엄 애니메이션 적용.
- 로그인 페이지 UI 정제 (뒤로가기 추가, 디자인 간소화).

---

### 작업 4️⃣ — `SiteHeader` 컴포넌트 추출 ✅ **완료 (2026-06-03)**

- `src/components/shared/site-header.tsx` 생성. props: `maxWidth` ('sm'/'md'/'lg' → 3xl/5xl/7xl), `variant` ('sticky'/'transparent'), `back` (discriminated union: `home` | `custom` | `history`), `showLogo`, `pageTitle`, `rightExtra`
- 6개 페이지(`/`, `/explore`, `/me`, `/projects/[id]`, `/projects/new`, `/projects/[id]/edit`) 모두 `<SiteHeader />` 사용
- 홈은 `variant="transparent"` 로 hero 위에 떠 있는 헤더 유지
- `/projects/new` 는 server component 로 전환 (이전 `"use client"` 불필요)
- 기존 `<BackButton />` 컴포넌트는 `back.type === 'history'` 일 때 SiteHeader 내부에서 재사용

---

### 작업 5️⃣ — `<img>` → `next/image` 전환 + 외부 이미지 도메인 화이트리스트 ✅ **완료 (2026-06-03)**

- `next.config.ts` 의 `images.remotePatterns` 에 `www.google.com/s2/favicons/**` + `*.supabase.co` 추가 (기존 `lh3.googleusercontent.com`, `avatars.githubusercontent.com` 유지)
- `src/app/projects/[id]/page.tsx`, `src/components/projects/project-card.tsx` 의 `<img>` 를 `next/image` 의 `<Image />` 로 전환
- lint 의 `@next/next/no-img-element` 경고 사라짐

---

### 작업 6️⃣ — Supabase CLI 로 타입 자동 생성 셋업 ✅ **부분 완료 (스크립트 추가, CLI 셋업은 사용자 작업)**

- `package.json` 에 `"db:types": "supabase gen types typescript --linked --schema public > src/lib/types.generated.ts"` 추가
- 출력 경로를 기존 수동 작성 `types.ts` 가 아닌 `types.generated.ts` 로 분리해 충돌 없이 비교 가능
- 사용자가 별도로 수행해야 할 단계 (인증/환경 필요):
  1. `brew install supabase/tap/supabase`
  2. `supabase login`
  3. `supabase link --project-ref aclcleemnsmxyixcfqro`
  4. `npm run db:types` 실행 → `src/lib/types.generated.ts` 생성 확인
  5. 결과를 검토한 뒤 기존 `types.ts` 를 자동생성 파일 + alias 블록으로 교체 (또는 generated 만 사용)

---

### 📌 작업 시작 전 체크리스트 (새 세션)

1. ✅ `cd /Users/shinmingyu/Project/DSHS_Developer_Platform`
2. ✅ `git status` — clean 인지 확인
3. ✅ `npm run dev` (백그라운드) — `http://localhost:3000` 응답 확인
4. ✅ `npx tsc --noEmit` — 에러 0 확인
5. ✅ `.env.local` 의 값들이 채워져 있는지 확인
6. ✅ 위 작업 1~6 중 어떤 것부터 할지 사용자에게 확인 (기본 권장: 1 → 2 → 3 순서)

### ⚠️ 개인정보 파일 (Git 제외됨)

다음 두 파일은 **학교 구성원의 실명-이메일 매핑**을 담고 있어 `.gitignore` 처리됨. 로컬에만 존재:

- `학생 이름-이메일.txt` — 원본 매핑 데이터
- `src/lib/userEmails.ts` — `USER_EMAIL_MAP: Record<string, string>` export 모듈

**사용 시 주의:**
- ⛔ **클라이언트 컴포넌트(`"use client"`)에서 import 금지** — Next.js 번들러가 브라우저 번들에 포함시키면 사이트 방문자 전원에게 공개됨
- ✅ Server Component / Server Action / Route Handler 에서만 사용
- 더 안전한 대안: 매핑을 Supabase `users` 테이블에 시드해두고 RLS로 보호된 조회로 대체

### 🐛 알려진 이슈 / 주의사항

- **`base-nova` Button 의 `asChild` 미지원** — `<Link className={buttonVariants()}>` 패턴 사용 (이미 코드베이스 전반에 적용됨)
- **shadcn `form` 컴포넌트 없음** — `base-nova` style 에 미포함. `react-hook-form` 직접 사용
- **`@base-ui/react` 의 Select / Dropdown 등은 Radix 와 props 가 다를 수 있음** — 의도대로 동작 안 하면 컴포넌트 파일 (`src/components/ui/`) 의 실제 구현 확인
- **클라이언트 측 `supabase.auth.getSession()` vs 서버 측 `supabase.auth.getUser()`** — getSession은 localStorage 캐시 사용 (빠르지만 검증 안됨), getUser는 토큰 검증 (느리지만 안전). **민감한 권한 체크는 항상 getUser 사용**
- **mock data 카드의 `tags`, `likes` 필드는 DB 에 없음** — 작업 2 진행 시 제거 또는 다른 컬럼 매핑

---

## 🗂️ 현재 디렉토리 구조

```
src/
├── app/
│   ├── auth/
│   │   ├── callback/route.ts             # OAuth 콜백 (code → session 교환 + 도메인 검증)
│   │   └── forbidden/page.tsx            # 도메인 거부 시 안내
│   ├── explore/page.tsx                  # 탐색 (현재 mock data)
│   ├── login/page.tsx                    # 로그인 (Google OAuth)
│   ├── me/page.tsx                       # 마이페이지 (server)
│   ├── projects/
│   │   ├── [id]/
│   │   │   ├── edit/page.tsx             # 수정 (인증 + 소유권 검증)
│   │   │   └── page.tsx                  # 상세 (DB 연동)
│   │   └── new/page.tsx                  # 게시 (ProjectForm 호스팅)
│   ├── page.tsx                          # 메인 (현재 mock data)
│   ├── layout.tsx                        # RootLayout + <Toaster />
│   └── globals.css
├── components/
│   ├── auth/
│   │   └── google-login-button.tsx       # Client Component
│   ├── projects/
│   │   └── project-form.tsx              # 게시/수정 폼 (Client, RHF 미사용)
│   ├── shared/
│   │   ├── auth-buttons.tsx              # 헤더 우측 아바타/로그인 (Client)
│   │   └── back-button.tsx               # 뒤로가기
│   └── ui/                               # shadcn/ui (base-nova)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # createBrowserClient
│   │   ├── server.ts                     # createServerClient (cookies())
│   │   └── middleware.ts                 # updateSession 헬퍼
│   ├── constants.ts                      # 체크리스트 옵션 + isAllowedEmail()
│   ├── types.ts                          # Database 타입 (수동 작성)
│   └── utils.ts                          # cn()
└── middleware.ts                          # 도메인 검증 + 라우트 보호
```

---

## 📝 협업 규칙 (Claude 작업 시)

### 작업 진행
- **단계별 진행 우선:** 한 번에 모든 코드를 작성하지 말고 Step 단위로 사용자 확인 후 다음 단계로 진행
- 각 단계 종료 시 **빌드 에러 없이 테스트 가능한 상태**로 마무리할 것 (`npx tsc --noEmit` 통과)
- UI 작업 시 dev server 실행 → 브라우저 확인 권장

### 코드 스타일
- **TypeScript strict 모드** 준수 — `any` 사용 금지 (대안: `unknown` + 좁히기, 또는 정확한 타입 작성)
- **Server Component 우선**, 상호작용 필요시에만 `'use client'`
- **shadcn/ui 우선 사용** — 직접 컴포넌트 만들기 전에 shadcn 에 있는지 확인
- **Form은 `react-hook-form` + `zod`** 표준 사용 (현재 `project-form.tsx` 는 RHF 미사용 — 추후 마이그레이션 고려)
- **Supabase 호출:**
  - 클라이언트: `@supabase/ssr` 의 `createBrowserClient`
  - 서버: `createServerClient` (쿠키 기반)
  - **`service_role` 키는 서버 사이드에서만**, 클라이언트 절대 노출 금지
- **시각 디자인:** 글래스모피즘 + zinc/blue accent + gradient + rounded-3xl 톤 유지

### 보안
- ⚠️ `.env.local`, `service_role` 키는 절대 Git/클라이언트에 노출 금지
- ⚠️ 모든 DB 쿼리는 **RLS가 켜진 상태**에서 동작하도록 작성
- 도메인 검증(`@ts.hs.kr`)은 **Middleware + 콜백 라우트 + RLS** 모두에서 처리
- OAuth callback 의 `next` 파라미터는 **open redirect 방지** 처리 필수 (`/` 시작 + `//` 차단)

### 문서
- 코드 주석은 **WHY가 비자명할 때만**, 짧게 1줄
- 단계별 가이드/SQL 스크립트는 `docs/` 에 보관
- **CLAUDE.md를 항상 최신 상태로 유지** — 외부 서비스 정보, 진행 상황, 결정 사항이 바뀌면 즉시 반영

---

## 📚 관련 문서

- [`docs/01-supabase-setup.md`](./docs/01-supabase-setup.md) — Supabase 프로젝트 생성 가이드
- [`docs/02-google-oauth-setup.md`](./docs/02-google-oauth-setup.md) — Google OAuth 연동 가이드
- [`docs/03-supabase-schema.sql`](./docs/03-supabase-schema.sql) — **단일 통합 스키마** (drop + recreate). users / projects / reviews 테이블 + RLS + 트리거 + auth.users 백필
- [`.env.local.example`](./.env.local.example) — 환경 변수 템플릿
