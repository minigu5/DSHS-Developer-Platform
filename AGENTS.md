# AGENTS.md

> 이 파일은 Codex가 본 프로젝트를 작업할 때 참고하는 컨텍스트 문서입니다.
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
| **Framework** | Next.js (**App Router 필수**, TypeScript) |
| **Styling** | Tailwind CSS + shadcn/ui |
| **BaaS (DB & Auth)** | Supabase (PostgreSQL + Supabase Auth) |
| **Hosting** | Vercel |
| **추가 라이브러리** | `@supabase/ssr`, `react-hook-form`, `zod`, `lucide-react`, `date-fns` |

---

## 🔐 인증 및 권한

### 인증 방식
- **Google OAuth 단일 지원** (Supabase Auth 경유)
- **`@ts.hs.kr` 도메인 제한** — 3단 검증으로 차단:
  1. Google `hd` 파라미터 (1차, UX 필터)
  2. Next.js Middleware에서 `session.user.email` 검사 (2차, 라우트 보호)
  3. Supabase RLS 정책 (3차, DB 레벨 최종 방어선)

### 권한 계층

| Role | 권한 |
|---|---|
| **Guest** (비로그인) | Public 프로젝트 열람, 검색/필터링 |
| **User** (로그인) | 위 + 프로젝트 게시/수정/삭제, 댓글/별점 작성. Private 프로젝트는 허용된 사용자만 접근 |

---

## 🧩 핵심 기능 — 프로젝트 체크리스트 (필터링 기준)

프로젝트 게시·검색 시 사용하는 표준 분류 항목.

| 항목 | 키 | 값 |
|---|---|---|
| **프로그램 종류** | `type` | 웹사이트, 응용프로그램(App), 확장프로그램 등 |
| **지원 플랫폼** | `platforms` (`text[]`) | iOS, Android, Windows, macOS, Linux 등 — 다중 선택 |
| **소스코드 공개 여부** | `source_type` | Open Source(`repo_url` 필수), Closed Source |
| **라이선스** | `license` | MIT, GPL, Apache, Custom 등 |
| **기능/카테고리** | `features` (`text[]`) | 문서 편집, AI 활용, 학습 도구, 유틸리티, 게임 등 — 다중 선택 |
| **공개 여부** | `visibility` | `public` / `private` |

---

## 🗄️ 데이터베이스 스키마 (Supabase PostgreSQL)

> Step 3에서 SQL로 작성 예정. RLS 정책 필수 적용.

### `users`
| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `uuid` (PK) | `auth.users.id`와 연결 |
| `email` | `text` | `@ts.hs.kr` 도메인만 |
| `full_name` | `text` | 학교 이름/학번 기반 매핑 |
| `nickname` | `text` | 사용자 설정 표시 이름 (Step 7) |
| `bio` | `text` | 사용자 자기소개 (Step 7) |
| `avatar_url` | `text` | |
| `created_at` | `timestamptz` | |

### `projects`
| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `uuid` (PK) | |
| `author_id` | `uuid` (FK → users.id) | |
| `title` | `text` | |
| `description` | `text` | |
| `type` | `text` | 체크리스트 참조 |
| `platforms` | `text[]` | |
| `source_type` | `text` | `open` / `closed` |
| `repo_url` | `text` | source_type=open일 때 필수 |
| `license` | `text` | |
| `features` | `text[]` | |
| `visibility` | `text` | `public` / `private` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `reviews`
| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `uuid` (PK) | |
| `project_id` | `uuid` (FK → projects.id) | |
| `user_id` | `uuid` (FK → users.id) | |
| `rating` | `int` | 1~5 |
| `comment` | `text` | |
| `created_at` | `timestamptz` | |

### RLS 정책 요약

#### `projects`
- **SELECT:** `visibility='public'`은 모두 허용 / `visibility='private'`은 작성자(+허락된 사용자)만
- **INSERT/UPDATE/DELETE:** `author_id = auth.uid()`인 경우만

#### `reviews`
- **SELECT:** 해당 프로젝트가 SELECT 가능한 사용자만
- **INSERT:** 로그인 사용자 (`auth.uid()` 일치)
- **UPDATE/DELETE:** 작성자 본인만

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
- `NEXT_PUBLIC_SITE_URL` (로컬: `http://localhost:3000`)
- `ALLOWED_EMAIL_DOMAIN=ts.hs.kr`

> Vercel 환경변수에도 동일하게 등록되어 있어야 함 (배포 시).

---

## 🗂️ 권장 디렉토리 구조 (Step 1 이후)

```
src/
├── app/
│   ├── (auth)/login/
│   ├── (main)/
│   │   ├── page.tsx              # 메인 (홈)
│   │   ├── explore/              # 탐색 + 필터링
│   │   └── projects/
│   │       ├── new/              # 게시
│   │       ├── [id]/             # 상세
│   │       │   └── edit/         # 프로젝트 수정
│   ├── auth/callback/            # OAuth 콜백 (이름 동기화 포함)
│   ├── developers/
│   │   ├── [id]/                 # 개발자 개인 프로필
│   │   └── actions.ts            # 프로필 업데이트 서버 액션
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn/ui
│   ├── auth/
│   ├── projects/
│   └── shared/
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # 브라우저용
│   │   ├── server.ts             # 서버용
│   │   └── middleware.ts
│   ├── constants.ts              # 체크리스트 옵션 (type/platforms/license/features)
│   ├── types.ts                  # DB 타입 (자동생성 권장)
│   └── utils.ts
└── middleware.ts                 # 라우트 보호 + 도메인 검증
```

---

## 📝 협업 규칙 (Codex 작업 시)

### 작업 진행
- **단계별 진행 우선:** 한 번에 모든 코드를 작성하지 말고 Step 단위로 사용자 확인 후 다음 단계로 진행
- 각 단계 종료 시 **테스트 가능한 상태**로 마무리할 것 (빌드 에러 없이)
- UI 작업 시 dev server 실행 → 브라우저 확인 권장

### 코드 스타일
- **TypeScript strict 모드** 준수
- **Server Component 우선**, 상호작용 필요시에만 `'use client'`
- **shadcn/ui 우선 사용** — 직접 컴포넌트 만들기 전에 shadcn에 있는지 확인
- **Form은 `react-hook-form` + `zod`** 표준 사용
- **Supabase 호출:**
  - 클라이언트: `@supabase/ssr`의 `createBrowserClient`
  - 서버: `createServerClient` (쿠키 기반)
  - **`service_role` 키는 서버 사이드에서만**, 클라이언트 절대 노출 금지

### 보안
- ⚠️ `.env.local`, `service_role` 키는 절대 Git/클라이언트에 노출 금지
- ⚠️ 모든 DB 쿼리는 **RLS가 켜진 상태**에서 동작하도록 작성
- 도메인 검증(`@ts.hs.kr`)은 **Middleware + RLS 모두**에서 처리

### 주요 기술 결정 사항
- **프로젝트 아이콘:** 512x512 이하, 1:1 비율의 PNG/JPEG 이미지만 허용. Supabase Storage(`project-assets`)에 저장.
- **폼 유효성 검사:** 누락된 항목이 있을 경우 페이지 상단부터 순차적으로 검증하며, 해당 필드로 부드러운 스크롤 이동(UX 개선).
- **디자인 컨셉:** "Compact & Focused". 불필요한 배경을 제거하고 프로젝트 아이콘을 제목 옆에 배치하여 정보 밀도 향상.
- **성능 및 안정성:** 브라우저용 Supabase 클라이언트에 싱글톤 패턴 적용, Hydration 오류 방지를 위한 클라이언트 사이드 가드(mounted check) 사용.

### 문서
- 코드 주석은 **WHY가 비자명할 때만**, 짧게 1줄
- 단계별 가이드/스크립트는 `docs/`에 보관
- **AGENTS.md를 항상 최신 상태로 유지** — 외부 서비스 정보, 진행 상황, 결정 사항이 바뀌면 즉시 반영

---

## 📚 관련 문서

- [`docs/01-supabase-setup.md`](./docs/01-supabase-setup.md) — Supabase 프로젝트 생성 가이드
- [`docs/02-google-oauth-setup.md`](./docs/02-google-oauth-setup.md) — Google OAuth 연동 가이드
- [`docs/03-supabase-schema.sql`](./docs/03-supabase-schema.sql) — 기본 테이블 스키마 및 RLS
- [`docs/04-supabase-alter.sql`](./docs/04-supabase-alter.sql) — 컬럼 추가 (icon_url 등)
- [`docs/05-supabase-alter-2.sql`](./docs/05-supabase-alter-2.sql) — 접근 권한 및 커스텀 기능 관련 컬럼 추가
- [`docs/06-supabase-alter-users.sql`](./docs/06-supabase-alter-users.sql) — users 테이블 닉네임, 자기소개 컬럼 추가
- [`.env.local.example`](./.env.local.example) — 환경 변수 템플릿
