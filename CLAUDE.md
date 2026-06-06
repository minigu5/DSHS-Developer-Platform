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
| **추가 라이브러리** | `@supabase/ssr`, `react-hook-form`, `zod`, `lucide-react`, `date-fns`, `sonner`, `next-themes`, `react-markdown` + `remark-gfm` (바이브 코딩 가이드 렌더링), `cloudinary` (이미지 업로드) |

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
- `/projects/new`, `/projects/[id]/edit`, `/tips/new`, `/haejwo/new`, `/me`
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
- **키보드 접근성**: 카드 그리드 UI(`div` 기반)에 `tabIndex={0}` · `role="button"` · `onKeyDown`(Enter/Space) · `focus-visible:ring-2` 적용. Tab 키로 모든 카드 포커스 이동, Enter/Space로 선택 가능. 웹사이트 타입 선택 시 비활성화된 플랫폼 카드는 `tabIndex={-1}`로 Tab 순서에서 제외.

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
- **설치 링크 규칙**: 앱/도구 설치 안내 시 "앱스토어에서 검색 후 설치" 식의 텍스트 대신 **반드시 직접 링크**를 제공한다. 주요 링크:
  - Xcode: `[Mac App Store](https://apps.apple.com/us/app/xcode/id497799835?l=ko&mt=12)`
  - Windows Terminal: `[Microsoft Store](https://aka.ms/terminal)`
  - Android Studio: `[developer.android.com/studio](https://developer.android.com/studio)`
- **Claude Code(macOS) 설치 블록 표준**: Homebrew 미설치 환경을 고려해 `brew` 명령 사용 금지. 모든 macOS 가이드에서 아래 블록을 동일하게 사용한다.
  ```bash
  # Node.js가 없다면 먼저 설치
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  source ~/.zshrc
  nvm install --lts && nvm use --lts

  # Claude Code 설치
  npm install -g @anthropic-ai/claude-code
  ```

---

## 📝 개발 팁 블로그 (`/tips`)
- **목록** `/tips`(`revalidate=30`): 카드 그리드(커버·태그·작성자·좋아요/댓글 수·상대시간). 헤더 우측 "팁 작성".
- **작성** `/tips/new` · **수정** `/tips/[id]/edit`: `TipEditor`(`src/components/tips/tip-editor.tsx`) — 마크다운 작성/분할/미리보기 3탭, Tab 들여쓰기 지원. 둘 다 보호 라우트(미들웨어). 수정은 작성자만.
- **상세** `/tips/[id]`(`revalidate=30`): `Markdown` 렌더, 좋아요(`TipLikeButton`, 낙관적), 댓글(`TipComments`, 작성/삭제). 작성자에게만 수정/삭제 노출(`TipOwnerActions`).
- 서버 액션: **`src/lib/tips/actions.ts`**(`createTip`/`updateTip`/`deleteTip`). 라우트 그룹 밖에 위치 — `(nav)` 경로에 두면 Turbopack에서 client→server action 바인딩이 깨지는 문제 있음.
- 팁 작성 필수 필드: 제목, **한 줄 요약(최대 30자)**, **대표 이미지 URL**, 본문.
- 삭제 확인창은 `window.confirm` 대신 shadcn `Dialog` 컴포넌트 사용(팁 삭제·댓글 삭제 모두).
- Supabase join 시 `users` 테이블 관계가 모호하면 PGRST201 오류 발생 → `author:users!tips_author_id_fkey(...)` 처럼 **FK 이름을 명시**해야 함.
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

## 💡 해줘! 아이디어 요청 (`/haejwo`)
- **목적**: 비개발자가 아이디어를 올리고 개발자에게 구현을 요청하는 기능. 기능 이름 "해줘".
- **진입점**: `/tips` 페이지 헤더의 "해줘!" 버튼(오렌지 색상) → `/haejwo` 목록 페이지.
- **목록** `/haejwo`(`revalidate=30`): 카드 그리드(종류·카테고리·상태·작성자·상대시간).
- **위저드** `/haejwo/new` (보호 라우트): 단계별 아이디어 작성.
  - 1단계: 프로그램 종류 선택 (`PROJECT_TYPES` 기반 카드 리스트)
  - 2단계: 카테고리 선택 (`FEATURES` 기반 카드 리스트)
  - 3단계: 아이디어 작성 — 제목 + 마크다운 에디터(작성/미리보기 탭). "해줘! 등록" 버튼으로 제출.
- **상세** `/haejwo/[id]`: 마크다운 렌더 + 종류·카테고리·상태 칩 + 작성자 정보. 작성자에게만 삭제 버튼(`HaejwoOwnerActions`).
- 서버 액션: `src/lib/haejwo/actions.ts`(`createIdea`/`deleteIdea`) — `(nav)` 밖에 위치(Turbopack 바인딩 문제 회피).
- DB 스키마: `docs/10-supabase-haejwo.sql` — `ideas` 테이블 (`id`, `author_id`, `title`, `type`, `category`, `content`, `status`(`open`/`in_progress`/`done`), `linked_project_id`(nullable FK → projects), `created_at`, `updated_at`).
- 컴포넌트: `src/components/haejwo/haejwo-wizard.tsx`, `src/components/haejwo/haejwo-owner-actions.tsx`, `src/components/haejwo/haejwo-complete-button.tsx`.
- **구현완료 흐름**: 로그인된 사용자가 상세 페이지 하단 "구현완료" 버튼 클릭 → 다이얼로그에서 내 프로젝트 목록 표시 → 선택 시 `markIdeaDone(ideaId, projectId)` 서버 액션 호출 → `status='done'`, `linked_project_id` 업데이트 → 완료 후 연결된 프로젝트 카드 노출. 프로젝트 미등록 시 "프로젝트 등록하기" 버튼 제공.
- 색상 포인트: **오렌지** (`orange-500`) — 개발 팁(amber)과 구별.
- ⚠️ 새 환경에서는 `docs/10-supabase-haejwo.sql` → `docs/11-supabase-haejwo-alter.sql` 순서로 Supabase에서 실행해야 함.

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

### 페이지별 캐시 전략
- 홈(`/`): `revalidate = 60` (ISR, 60초)
- 팁 목록·상세(`/tips`, `/tips/[id]`), 해줘 목록(`/haejwo`): `revalidate = 30` (ISR, 30초)
- 탐색(`/explore`), 프로젝트 상세(`/projects/[id]`): `force-dynamic` — RLS 기반 사용자별 콘텐츠(개발자 계정은 비공개 프로젝트까지 조회)이므로 서버 캐시 사용 불가

### Router Cache (클라이언트 캐시) — `next.config.ts`
- Next.js 15+에서 `staleTimes.dynamic` 기본값이 `0`으로 바뀌어 `force-dynamic` 페이지가 매 이동마다 서버 요청을 발생시키는 문제 해결.
- `experimental.staleTimes: { dynamic: 30, static: 180 }` 설정으로 동적 페이지도 클라이언트 Router Cache에 30초, 정적 페이지는 3분간 캐시.
- Router Cache는 클라이언트·사용자별 독립 저장소이므로 RLS 우회 없음. 서버 액션의 `revalidatePath()` 호출 시 관련 캐시 항목은 자동 무효화됨.

### Cloudinary 이미지 업로드 (`src/app/api/upload/route.ts`)
- 프로필 아바타 · 프로젝트 아이콘 · 팁 커버 이미지를 사이트 내에서 직접 업로드.
- 공용 컴포넌트: `src/components/shared/image-upload-input.tsx` — 파일 드래그·선택 드롭존 + URL 직접 입력 폴백.
- 서버: `POST /api/upload` — 로그인 검증 후 Cloudinary에 업로드, `secure_url` 반환. 최대 10MB, 이미지 포맷만 허용.
- 자동 압축: `quality: "auto:good"`, `fetch_format: "auto"` 변환 적용.
- 환경변수 3개 필요: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (Vercel에도 동일하게 설정 필요).
- `src/lib/parse-image-url.ts`와 `GET /api/resolve-image`는 기존 imgbb URL을 위해 유지.

### 이미지 포맷 최적화 — `next.config.ts`
- `images.formats: ['image/avif', 'image/webp']` 설정으로 브라우저 지원 시 AVIF(WebP 대비 ~50% 작음) → WebP 순으로 자동 변환 제공.
- `images.remotePatterns`에 `i.ibb.co`, `ibb.co` 추가 → ibb.co 이미지도 Next.js 이미지 최적화 파이프라인 적용 가능.

### 패키지 import 최적화 — `next.config.ts`
- `experimental.optimizePackageImports: ['lucide-react', 'date-fns']` 설정.
- lucide-react는 1000개 이상의 아이콘을 포함하나 이 설정으로 실제 사용하는 아이콘만 번들에 포함됨 (JS 크기 대폭 감소).

### API 라우트 캐시 헤더
- `/api/favicon`: `Cache-Control: public, s-maxage=86400, stale-while-revalidate=3600` — 엣지에서 1일 캐시, 이후 1시간 stale 허용.
- `/api/resolve-image`: 동일한 캐시 헤더 추가 (기존엔 없었음). ibb.co URL 변환 결과를 엣지에 캐시해 반복 요청 제거.

### preconnect / dns-prefetch — `src/app/layout.tsx`
- `<link rel="preconnect" href="https://aclcleemnsmxyixcfqro.supabase.co" />` — 모든 페이지 요청 전 Supabase DNS·TCP·TLS 핸드셰이크를 미리 수행.
- `<link rel="preconnect" href="https://lh3.googleusercontent.com" />` — 구글 프로필 사진 도메인 사전 준비.
- `<link rel="dns-prefetch" />` — preconnect 미지원 구형 브라우저 대응.

### 홈 페이지 CTA 프리패치 — `src/app/page.tsx`
- 홈 페이지는 PageNav가 없어 `/explore`(force-dynamic) 등 동적 페이지가 자동 프리패치되지 않음.
- 3개 CTA 링크(`/explore`, `/projects/new`, `/guide`)에 `prefetch={true}` 추가 — 사용자가 히어로 섹션을 읽는 동안 백그라운드에서 미리 로드.

---

## 🧭 전역 페이지 내비게이션 (`PageNav`)

- 컴포넌트: `src/components/shared/page-nav.tsx` (`"use client"`, `usePathname()` + `useRef` + `useEffect` 사용)
- **표시 위치**: `SiteHeader` 로고·프로필과 **동일한 h-16 행** 안, 로고 우측에 얇은 구분선(`w-px h-5`)으로 분리하여 인라인 배치.
- **5개 버튼**: 모든 프로젝트(→ `/explore`), 프로젝트 등록(→ `/projects/new`), 나도 개발해볼래!(→ `/guide`), 개발 팁(→ `/tips`), 해줘!(→ `/haejwo`)
- **모든 Link에 `prefetch={true}`** — `force-dynamic` 페이지 포함 전체 콘텐츠를 뷰포트 진입 시 미리 패치.
- **활성 버튼 판정**:
  - `/explore`, `/projects/*`(등록·수정 제외), `/developers/*` → "모든 프로젝트"
  - `/projects/new`, `*/edit` → "프로젝트 등록"
  - `/guide/*` → "나도 개발해볼래!"
  - `/tips/*` → "개발 팁"
  - `/haejwo/*` → "해줘!"
- **슬라이딩 pill 애니메이션**: `absolute` pill 하나가 활성 버튼 위치로 부드럽게 이동·확장(`transition-all duration-300 ease-out`). `useRef` 배열 + `useEffect`로 활성 항목의 `offsetLeft`/`offsetWidth`를 읽어 `translateX` + `width` 적용.
- **라벨 펼침**: 활성 버튼만 라벨 텍스트 노출(`max-w-[160px] opacity-100`), 비활성은 **아이콘만**(`max-w-0 opacity-0`). 전환 시 부드럽게 slide-in/out.
- **버튼별 고유 색**: 모든 프로젝트=blue, 프로젝트 등록=emerald, 나도 개발해볼래!=purple, 개발 팁=amber, 해줘!=orange.
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

## 🚫 Claude 컨텍스트 제외 목록 (`.claudeignore`)

토큰 절약을 위해 자동 읽기/인덱싱에서 제외된 항목. 필요 시 직접 `Read` 도구로는 접근 가능.

| 경로 | 이유 |
|---|---|
| `src/components/ui/` | shadcn/ui 자동 생성. API는 학습 데이터에 포함. 주의사항은 위 Tech Stack 섹션 참고 |
| `src/lib/types.generated.ts` | Supabase CLI 자동 생성 타입. Source of truth는 `src/lib/types.ts` |
| `supabase/migrations/` | 원격 스키마 자동 스냅샷. Source of truth는 `docs/03-supabase-schema.sql` |
| `docs/01-supabase-setup.md`, `docs/02-google-oauth-setup.md` | 초기 환경 구성용 인간용 가이드 |
| `README.md`, `AGENTS.md`, `LICENSE` | 인간/다른 AI 대상 문서 |
| `public/` | 정적 SVG 에셋 (이미 `*.svg` 패턴으로 차단) |
| `scripts/` | 일회성 유틸 스크립트 (`backfill-favicons.mts` 등) |
| `eslint.config.mjs`, `postcss.config.mjs`, `components.json` | 빌드·설정 파일 |

---

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
│   ├── tips/             # 개발 팁 블로그 (page=목록, new, [id], [id]/edit, actions.ts)
│   └── haejwo/           # 해줘! 아이디어 요청 (page=목록, new, [id])
├── components/
│   ├── shared/           # site-header, page-nav, auth-buttons, back-button, markdown 등
│   ├── projects/         # project-card, project-form, project-icon, project-reviews 등
│   ├── explore/          # explore-client
│   ├── guide/            # guide-wizard, guide-viewer
│   ├── tips/             # tip-card, tip-editor, tip-like-button, tip-comments 등
│   ├── haejwo/           # haejwo-wizard, haejwo-owner-actions
│   └── ui/               # shadcn 컴포넌트
├── content/guides/       # 가이드 마크다운 콘텐츠 (.md, 직접 작성)
├── lib/                  # 유틸리티 및 설정 (supabase, constants, types, utils, guide, guide-content, haejwo)
└── middleware.ts         # 세션 관리 및 도메인 검증
```

## ♿ 키보드 접근성 규칙

카드 그리드 UI처럼 `<div onClick>` 기반의 클릭 가능한 요소에는 반드시 아래 속성을 추가해야 Tab 키 내비게이션이 동작한다.

```tsx
tabIndex={0}
role="button"
onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); /* 액션 */; } }}
className={cn("... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2")}
```

- 비활성(disabled) 카드는 `tabIndex={-1}` + `aria-disabled={true}`로 Tab 순서에서 제외.
- 이미 `<button>` 요소를 사용하는 곳(`guide-wizard`, `haejwo-wizard`, `profile-settings-dialog`, `review-form`, `tip-editor`)은 기본 키보드 접근성이 보장되므로 별도 처리 불필요.
- 다크 배경 모달/카드의 경우 `focus-visible:ring-offset-zinc-900`을 추가로 지정.

---

## 📝 협업 및 코드 스타일 규칙
- **TS Strict**: `any` 사용 금지, 인터페이스 명확히 정의.
- **Server First**: 상호작용이 필요한 경우에만 `"use client"` 사용.
- **Design System**: 글래스모피즘, Zinc/Blue 포인트, `rounded-3xl` 스타일 유지.
- **반응형**: 모든 페이지는 모바일에서도 최적화돼야 함. 데스크탑(`sm:`+)은 유지하고 모바일만 보강 (자세한 규칙은 「📱 반응형 / 모바일 최적화」 참고).
- **Documentation**: `CLAUDE.md` 및 `AGENTS.md`를 항상 최신 상태로 유지. — 외부 서비스 정보, 진행 상황, 결정 사항이 바뀌면 즉시 반영
