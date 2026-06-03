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
| **지원 플랫폼** | `platforms` | Web, iOS, Android, Windows, macOS, Linux (다중 선택) |
| **소스코드** | `source_type` | `open`(`repo_url` 필수) / `closed` |
| **라이선스 권한** | `license_features` | 상업적 이용, 수정, 배포, 개인적 이용, 법적 책임, 보증 (다중 선택) |
| **공개 여부** | `visibility` | `public` / `private` |
| **작성자 형태** | `author_role` | `individual` / `team` |
| **아이콘** | `icon_type` | `auto` (URL favicon) / `upload` (직접 업로드) |

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

---

## 📅 단계별 개발 진행 상황

| Step | 핵심 내용 | 상태 |
|---|---|---|
| **Step 0-3** | 인프라 셋업, 인증(Google OAuth), 도메인 미들웨어, DB 스키마 및 RLS 구축 | ✅ 완료 |
| **Step 4-6** | 프로젝트 게시/수정 폼, 메인/탐색 페이지 필터링, 상세 페이지 및 리뷰 시스템 | ✅ 완료 |
| **Step 7-9** | 개발자 프로필, 프로젝트 아이콘 업로드, UI/UX 컴팩트 디자인 개편 | ✅ 완료 |
| **Step 10-12** | 온보딩 시스템, 다크모드/애니메이션, 보안 마이그레이션(실명 매핑 DB 이관) | ✅ 완료 |
| **Step 13** | **UI/UX 고도화**: 카드 가독성 개선, 텍스트 넘침 처리, 시력 보호 배경색 적용 | ✅ 완료 |
| **Step 14** | **레이아웃 통일**: 모든 페이지 가로 폭(`max-w-5xl`) 통일 및 라이선스 상세 표시 개선 | ✅ 완료 |

---

## 🚀 다음 세션 작업 가이드 (NEXT UP)

### 작업 1️⃣ — Supabase CLI 타입 자동 생성 셋업
- `package.json`의 `db:types` 스크립트 실행 환경 구축 및 `src/lib/types.generated.ts` 연동.

### 작업 2️⃣ — 실시간 검색 및 성능 최적화
- 타이핑 시 Debounce 처리된 검색 기능 및 결과 하이라이팅.
- 이미지 및 폰트 로딩 최적화.

---

## 📌 작업 시작 전 체크리스트
1. `npm run dev` 실행 및 `http://localhost:3000` 확인.
2. `npx tsc --noEmit` 실행하여 타입 에러 0 확인.
3. `.env.local` 환경 변수 설정 확인.

## ⚠️ 보안 및 주의사항
- **개인정보 매핑**: `student_mappings` 테이블을 사용하며, 실명 데이터가 포함된 로컬 파일은 절대 Git에 포함하거나 클라이언트 사이드에서 import하지 말 것.
- **Supabase Client**: 서버 사이드에서는 `createServerClient`, 클라이언트에서는 `createBrowserClient` 사용. 민감한 작업은 항상 `getUser()`로 검증.

---

## 🗂️ 현재 디렉토리 구조
```
src/
├── app/                  # App Router 레이어 (auth, projects, developers, explore 등)
├── components/           # UI 컴포넌트 (shared, projects, auth, ui/shadcn)
├── lib/                  # 유틸리티 및 설정 (supabase, constants, types, utils)
└── middleware.ts         # 세션 관리 및 도메인 검증
```

## 📝 협업 및 코드 스타일 규칙
- **TS Strict**: `any` 사용 금지, 인터페이스 명확히 정의.
- **Server First**: 상호작용이 필요한 경우에만 `"use client"` 사용.
- **Design System**: 글래스모피즘, Zinc/Blue 포인트, `rounded-3xl` 스타일 유지.
- **Documentation**: `CLAUDE.md` 및 `AGENTS.md`를 항상 최신 상태로 유지.
