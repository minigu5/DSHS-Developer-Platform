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

---

## 🔐 인증 및 권한

### 인증 방식
- **Google OAuth 단일 지원** (Supabase Auth 경유)
- **`@ts.hs.kr` 도메인 제한** — 3단 검증:
  1. Google `hd` 파라미터 (UX 필터)
  2. Next.js Middleware 세션 검사 (라우트 보호)
  3. Supabase RLS 정책 (DB 레벨 최종 방어)

### 권한 계층

| Role | 권한 |
|---|---|
| **Guest** (비로그인) | Public 프로젝트 열람, 검색/필터링 |
| **User** (로그인) | 위 + 프로젝트 게시/수정/삭제, 댓글/별점 작성. Private 프로젝트는 소유자 및 허용된 사용자만 접근 |

---

## 🧩 핵심 기능 — 프로젝트 체크리스트

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

- **Source of Truth:** `docs/03-supabase-schema.sql` (통합 스키마)
- **Type Definition:** `src/lib/types.ts`

### 주요 테이블
- `users`: 사용자 프로필 (닉네임, 자기소개, 관심분야 포함)
- `projects`: 프로젝트 메타데이터 및 설정
- `reviews`: 별점(1-5) 및 서술형 리뷰
- `student_mappings`: 학생 실명-이메일 보안 매핑 테이블

---

## 🌐 외부 서비스 정보

- **GitHub:** https://github.com/minigu5/DSHS-Developer-Platform
- **Vercel:** https://dshs-developer-platform.vercel.app/
- **Supabase:** Northeast Asia (Seoul) Region

---

## 📅 개발 진행 상황

| Step | 핵심 작업 내용 | 상태 |
|---|---|---|
| **Step 0** | 기초 인프라 및 환경 변수 설정 (Supabase, OAuth, GitHub/Vercel) | ✅ 완료 |
| **Step 1** | 프로젝트 초기화 및 UI 프레임워크 셋업 (Next.js 16, Tailwind v4, shadcn) | ✅ 완료 |
| **Step 2** | 인증 시스템 및 도메인 검증 미들웨어 구현 | ✅ 완료 |
| **Step 3** | DB 스키마 설계 및 RLS 보안 정책 적용 | ✅ 완료 |
| **Step 4** | 프로젝트 게시 및 수정 폼(`ProjectForm`) 기능 구현 | ✅ 완료 |
| **Step 5** | 메인/탐색 페이지 및 다중 조건 필터링 시스템 구현 | ✅ 완료 |
| **Step 6** | 상세 페이지 및 리뷰/별점 시스템 구축 | ✅ 완료 |
| **Step 7** | 개발자 프로필 및 최초 로그인 온보딩 시스템 구현 | ✅ 완료 |
| **Step 8** | 프로젝트 아이콘 직접 업로드 및 스토리지 연동 | ✅ 완료 |
| **Step 9** | 개인정보 보안 강화 (실명 매핑 DB 이관 및 RLS 적용) | ✅ 완료 |
| **Step 10** | **UI/UX 폴리싱**: 전역 레이아웃 폭 통일, 가독성 개선, 시력 보호 색상 적용 | ✅ 완료 |
| **Step 11** | **라이선스 고도화**: 허용 권한 및 제한 사항 세분화 표시 구현 | ✅ 완료 |

---

## 🚀 다음 세션 작업 가이드

1. **타입 자동화**: Supabase CLI를 활용하여 `src/lib/types.generated.ts` 자동 생성 및 연동.
2. **검색 고도화**: 타이핑 시 실시간 검색(Debounce) 및 결과 하이라이팅 적용.
3. **통계 시스템**: 프로젝트별 조회수 또는 인기도 기반 정렬 로직 추가.

---

## 📝 협업 및 코드 규칙

- **TS Strict**: `any` 사용을 금지하고 정확한 인터페이스 정의.
- **Server First**: 가능한 서버 컴포넌트를 사용하고, 필요한 경우에만 `"use client"` 사용.
- **Security**: 모든 DB 쿼리는 RLS가 활성화된 상태에서 수행. 서비스 롤 키 노출 엄금.
- **Design**: 글래스모피즘, Zinc/Blue 포인트, 부드러운 애니메이션(`scale`, `spring`) 기조 유지.
