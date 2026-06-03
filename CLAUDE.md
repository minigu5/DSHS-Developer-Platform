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
| **추가 라이브러리** | `@supabase/ssr`, `react-hook-form`, `zod`, `lucide-react`, `date-fns`, `sonner` |

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

> 실제 SQL: `docs/03-supabase-schema.sql` + `docs/04-supabase-alter.sql` + `docs/05-supabase-alter-2.sql`
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
| `license` | `text` | 호환성 컬럼 (`license_features[0]` 또는 'custom') |
| `license_features` | `text[]` | 허용 항목 다중 선택 |
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
| **Step 3** | `users` / `projects` / `reviews` 테이블 + RLS + 트리거 SQL (`docs/03~05.sql`) | ✅ **Supabase 적용 완료** |
| **Step 4** | 프로젝트 게시 폼(`ProjectForm`) UI + Insert 로직 | ⚠️ **컴포넌트 작성됨 / End-to-end 게시 동작 검증 필요** |
| **Step 5** | 메인/탐색(Explore) 페이지 + 다중 조건 필터링 | ⚠️ **UI 완성 / mock data → 실제 DB 호출 전환 필요** |
| **Step 6** | 프로젝트 상세 페이지 + 댓글/별점(Reviews) 기능 | ⚠️ **상세 페이지 DB 연동 완료 / Reviews 미구현** |

---

## 🚀 다음 세션에서 이어서 할 작업 (NEXT UP)

> **이 섹션은 새 Claude Code 세션이 컨텍스트 없이 바로 이어갈 수 있도록 작성됨.**
> 작업 시작 전에 먼저 확인: `npm run dev` 로 dev server 띄우고 `npx tsc --noEmit` 통과 여부 확인.
> 작업 순서는 의존성과 임팩트 순. 위에서부터 진행 권장.

### 작업 1️⃣ — 게시 폼 동작 검증 + `license` 컬럼 정리 (우선순위: 🔴 높음)

**현재 상태:**
- `src/components/projects/project-form.tsx` 가 클라이언트에서 `supabase.from('projects').insert([payload])` 직접 호출
- `payload.license` 에 fallback 로직 (`hasCustomLicense ? licenseCustom : (licenseFeatures.length > 0 ? licenseFeatures[0] : 'none')`) 이 들어있어서 의미가 모호함
- DB schema 에서 `license` 는 `not null` 인데 실질 데이터는 `license_features` 배열에 들어감

**해야 할 일:**
1. **End-to-end 게시 테스트** — `@ts.hs.kr` 계정으로 로그인 후 `/projects/new` 에서 폼 작성 → 제출 → 상세 페이지로 이동되는지 확인
2. **에러 발생 시 진단** — 브라우저 콘솔 + Supabase 대시보드 → Authentication → Logs / Table Editor → projects 에서 INSERT 결과 확인
3. **`license` 컬럼 운용 결정 (택 1):**
   - **Option A (권장):** alter SQL 추가로 `license` 를 nullable 로 변경 + form payload 에서 제거
     ```sql
     -- docs/06-supabase-alter-3.sql
     ALTER TABLE public.projects ALTER COLUMN license DROP NOT NULL;
     ```
     그리고 `src/lib/types.ts` 의 `projects.license: string` → `string | null` 로 수정, form payload 에서 `license` 필드 삭제
   - **Option B:** `license` 에 항상 `'feature-based'` 같은 sentinel 값 넣고 실 데이터는 `license_features` 만 사용. 더 간단하지만 의미 불명확

**검증:** 폼 → DB INSERT → 상세 페이지 표시 까지 1 cycle 통과

---

### 작업 2️⃣ — 메인/탐색/마이페이지 mock data → 실제 DB 호출 교체 (우선순위: 🔴 높음)

**현재 상태:**
- `src/app/page.tsx` — `FEATURED_PROJECTS` 하드코딩 mock (라인 11~45)
- `src/app/explore/page.tsx` — `DEMO_PROJECTS` mock + 클라이언트 사이드 필터링 (`useMemo`)
- `src/app/me/page.tsx` — `MY_PROJECTS` 단일 mock (라인 12~24)

**교체 패턴:**

#### `/` (메인)
```tsx
// Server Component 로 유지하고 createClient (server) 사용
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: featured } = await supabase
    .from('projects')
    .select('id, title, short_description, type, platforms, icon_url, author_id, features, users(full_name)')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(3);
  // ...
}
```

#### `/explore`
- 현재 `"use client"` + `useMemo` 필터링 → **Server Component 로 전환** 후 URL search params (`?type=&platform=&q=`) 로 필터 상태 유지
- 클라이언트 필터링 코드는 따로 `<FilterSidebar />` 클라이언트 컴포넌트로 분리, URL 업데이트는 `router.replace` 또는 `<form>` GET 으로
- 또는 SSR 유지 + 클라이언트 측 `useMemo` 필터링을 **서버 사이드 쿼리**로 옮기되 초기 데이터만 SSR, 추후 필터는 `router.replace(?...)` 로 리렌더
- 권장: **Server Component + searchParams 기반 필터링** (SEO + 캐싱 이점)
- Supabase 쿼리:
  ```ts
  let query = supabase.from('projects').select('*, users(full_name)').eq('visibility', 'public');
  if (searchParams.q) query = query.or(`title.ilike.%${q}%,short_description.ilike.%${q}%`);
  if (searchParams.type) query = query.eq('type', searchParams.type);
  if (searchParams.platform) query = query.contains('platforms', [searchParams.platform]);
  ```

#### `/me`
```tsx
// 이미 server component. user.id 로 본인 프로젝트만 조회 추가
const { data: myProjects } = await supabase
  .from('projects')
  .select('*')
  .eq('author_id', user.id)
  .order('created_at', { ascending: false });
```

**주의:**
- `ProjectRow` 의 `users` join 결과 타입은 자동 추론 안 됨 → 필요 시 `as any` 임시 또는 별도 타입 정의 (`type ProjectWithAuthor = ProjectRow & { users: Pick<UserRow, 'full_name'> | null }`)
- mock 의 `tags`, `likes` 필드는 DB 에 없음 — 제거하거나 `features` 로 대체 (`tags`), `likes` 는 추후 별도 컬럼/테이블 (이번 작업 범위 밖)
- 클라이언트 카드 컴포넌트로 `<ProjectCard />` 를 `src/components/projects/project-card.tsx` 로 추출 (메인+탐색+마이페이지 카드 형태 거의 동일)

**검증:** 폼으로 등록한 프로젝트가 메인 / 탐색 / 마이페이지에 실제로 나타나는지 확인

---

### 작업 3️⃣ — `reviews` (댓글 + 별점) CRUD UI 구현 (우선순위: 🟡 중간)

**현재 상태:**
- `reviews` 테이블 + RLS 정책 이미 생성됨 (`docs/03-supabase-schema.sql`)
- `src/app/projects/[id]/page.tsx` 에 Reviews 영역이 아직 없음
- 타입: `src/lib/types.ts` 의 `ReviewRow` 사용

**구현 위치:** `src/app/projects/[id]/page.tsx` 하단에 추가, 또는 별도 `<ProjectReviews projectId={id} />` 클라이언트 컴포넌트로 분리

**필요 컴포넌트:**

1. **`src/components/projects/review-form.tsx`** (Client)
   - 별점 선택 (1~5, lucide `Star` 채움/빈 토글)
   - `Textarea` 로 댓글
   - `react-hook-form` + `zod` 권장:
     ```ts
     const schema = z.object({
       rating: z.number().int().min(1).max(5),
       comment: z.string().min(1, '댓글을 입력해주세요').max(500),
     });
     ```
   - 제출 시 `supabase.from('reviews').insert({ project_id, user_id: session.user.id, rating, comment })`
   - 비로그인 사용자에게는 "로그인 후 작성" 버튼 (→ `/login?next=/projects/${id}`)

2. **`src/components/projects/review-list.tsx`** (Server Component 또는 Client)
   - `supabase.from('reviews').select('*, users(full_name, avatar_url)').eq('project_id', projectId).order('created_at', { ascending: false })`
   - 각 리뷰: 아바타 + 이름 + 별점 시각화 + 댓글 + 작성일 (date-fns 의 `formatDistanceToNow`)
   - **본인 리뷰만** 우측에 수정/삭제 dropdown (`session.user.id === review.user_id`)

3. **수정/삭제:**
   - 수정: 다이얼로그(`Dialog`) 안에 review-form 재사용. `supabase.from('reviews').update().eq('id', reviewId)`
   - 삭제: 확인 dialog → `supabase.from('reviews').delete().eq('id', reviewId)`

4. **상세 페이지 통합:**
   - 평균 별점 + 리뷰 개수를 Project 헤더에 표시 (현재 mock 의 `<Star />` 자리)
   - 집계는 `supabase.rpc` 또는 클라이언트 측 계산
   - 또는 DB view 생성: `CREATE VIEW project_stats AS SELECT project_id, AVG(rating) avg_rating, COUNT(*) review_count FROM reviews GROUP BY project_id;`

**RLS 확인:**
- INSERT 정책이 `auth.uid() = user_id` 이므로 클라이언트에서 `user_id` 를 세션의 user.id 로 정확히 넣어야 함
- 동일 사용자가 같은 프로젝트에 여러 리뷰 작성 가능 (의도된 거면 OK, 아니면 unique constraint 추가: `ALTER TABLE reviews ADD CONSTRAINT one_review_per_user UNIQUE (project_id, user_id);`)

**검증:** 로그인 → 리뷰 작성 → 페이지 새로고침 시 표시 → 수정 → 삭제

---

### 작업 4️⃣ — `SiteHeader` 컴포넌트 추출 (우선순위: 🟡 중간)

**현재 상태:**
- `<AuthButtons />` 가 다음 4개 페이지에서 각각 마운트됨:
  - `src/app/page.tsx`
  - `src/app/explore/page.tsx`
  - `src/app/me/page.tsx`
  - `src/app/projects/[id]/page.tsx`
  - `src/app/projects/new/page.tsx`
  - `src/app/projects/[id]/edit/page.tsx`
- 각 페이지마다 헤더 마크업이 살짝씩 다름 (max-w-7xl vs max-w-5xl vs max-w-3xl, 좌측 BackButton 여부 등)

**리팩터 방안:**

1. **`src/components/shared/site-header.tsx`** 생성
   ```tsx
   interface SiteHeaderProps {
     maxWidth?: 'sm' | 'md' | 'lg';  // max-w-3xl/5xl/7xl 매핑
     showBack?: boolean;
     backHref?: string;
     title?: string;  // 가운데 또는 우측 페이지명
   }
   ```
   안에 `<AuthButtons />` + `<BackButton />` 통합

2. **라우트 그룹 활용 (선택):**
   - `src/app/(main)/layout.tsx` 만들고 `<SiteHeader />` 거기에 두기
   - `(main)` 그룹 안으로 `page.tsx`, `explore/`, `me/`, `projects/` 이동
   - `/login`, `/auth/*` 는 그룹 밖이라 헤더 노출 안 됨 (현재와 동일)
   - 단, 페이지마다 max-w 가 다르므로 그룹 layout 에서는 max-w 를 그대로 두기 어려움. 옵션:
     - SiteHeader 에 maxWidth prop 으로 페이지별 override
     - 또는 layout 에서는 헤더만 풀너비, 그 아래 main의 max-w는 페이지가 직접 결정

3. **변경 후 dev server 띄워서 모든 페이지의 헤더가 동일하게 보이는지 확인**

**검증:** 페이지 6곳 헤더 외관 일관성, 로그인 상태 변경이 모든 페이지에 반영

---

### 작업 5️⃣ — `<img>` → `next/image` 전환 + 외부 이미지 도메인 화이트리스트 (우선순위: 🟢 낮음)

**현재 `<img>` 사용 위치:**
- `src/app/projects/[id]/page.tsx` — `project.icon_url` 표시

**문제:**
- Next.js dev console 에서 LCP / 최적화 경고
- `icon_type='auto'` 일 때 `icon_url = "https://www.google.com/s2/favicons?domain=${url}&sz=128"` — 외부 URL
- 사용자 직접 업로드 (`icon_type='upload'`) 는 아직 구현 안 됨 (Supabase Storage 미사용)

**작업:**
1. `next.config.ts` 에 `images.remotePatterns` 추가:
   ```ts
   const nextConfig = {
     images: {
       remotePatterns: [
         { protocol: 'https', hostname: 'www.google.com', pathname: '/s2/favicons/**' },
         { protocol: 'https', hostname: '*.supabase.co' },  // upload 대비
         { protocol: 'https', hostname: 'lh3.googleusercontent.com' },  // Google OAuth avatar
       ],
     },
   };
   ```
2. `<img src={project.icon_url}>` → `<Image src={...} width={128} height={128} alt="..." />`

**검증:** `next.config.ts` 변경 후 dev server 재시작 필수. 콘솔 경고 사라짐.

---

### 작업 6️⃣ — Supabase CLI 로 타입 자동 생성 셋업 (우선순위: 🟢 낮음, 권장)

**왜 권장:**
- 현재 `src/lib/types.ts` 는 수동 작성 → 스키마 변경 시 수동 동기화 필요
- CLI 자동 생성으로 alter SQL 실행 후 한 명령으로 타입 갱신 가능

**셋업 단계:**

1. Supabase CLI 설치:
   ```bash
   brew install supabase/tap/supabase
   ```
2. 로그인:
   ```bash
   supabase login
   ```
3. 프로젝트 link:
   ```bash
   supabase link --project-ref aclcleemnsmxyixcfqro
   ```
4. `package.json` 에 스크립트 추가:
   ```json
   "scripts": {
     "db:types": "supabase gen types typescript --linked --schema public > src/lib/types.ts"
   }
   ```
5. 실행 후 결과를 기존 alias (`UserRow`, `ProjectRow`, ...) 와 합치기. 자동 생성 파일은 alias 가 없으므로 파일 하단에 alias 블록만 보존:
   ```ts
   // ... (자동 생성된 Database 타입)

   export type UserRow = Database['public']['Tables']['users']['Row'];
   export type ProjectRow = Database['public']['Tables']['projects']['Row'];
   // ...
   ```

**검증:** `npm run db:types` 실행 후 `npx tsc --noEmit` 통과

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
- [`docs/03-supabase-schema.sql`](./docs/03-supabase-schema.sql) — 초기 테이블 + RLS + 트리거
- [`docs/04-supabase-alter.sql`](./docs/04-supabase-alter.sql) — projects 컬럼 확장 (short_description, url, author_role, team_*, icon_*, license_features, license_custom)
- [`docs/05-supabase-alter-2.sql`](./docs/05-supabase-alter-2.sql) — `allowed_users`, `feature_custom` + private 정책 변경
- [`.env.local.example`](./.env.local.example) — 환경 변수 템플릿
