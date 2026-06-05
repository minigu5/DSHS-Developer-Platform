# DSHS Developer Platform

> 대구과학고등학교 학생들이 개발한 프로그램을 공유·검색·피드백하는 교내 전용 포트폴리오 플랫폼

## 주요 기능

| 기능 | 설명 |
|---|---|
| **프로젝트 탐색** | 프로그램 종류·플랫폼별 필터링, 작성자 닉네임 검색 |
| **프로젝트 등록** | 웹사이트·앱·확장프로그램·CLI·라이브러리 등록, 공개/비공개 설정 |
| **바이브 코딩 가이드** | 만들고 싶은 프로그램에 맞는 단계별 시작 가이드 추천 위저드 |
| **개발 팁** | 마크다운 기반 개발 노하우 블로그 (좋아요·댓글) |
| **해줘!** | 비개발자가 아이디어를 올리고 개발자에게 구현을 요청하는 기능 |

## 기술 스택

| 계층 | 기술 |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript strict) |
| Styling | Tailwind CSS v4 + shadcn/ui (base-nova) |
| BaaS | Supabase (PostgreSQL + Auth + RLS) |
| Hosting | Vercel (서울 리전 `icn1`) |

## 시작하기

### 1. 환경 변수 설정

`.env.local` 파일을 생성하고 아래 변수를 채워주세요.

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### 2. Supabase 스키마 적용

`docs/` 폴더의 SQL 파일을 Supabase SQL 에디터에서 순서대로 실행합니다.

```
docs/03-supabase-schema.sql        # 기본 테이블 (users, projects, reviews)
docs/06-supabase-alter-users.sql   # users 컬럼 추가
docs/07-supabase-onboarding.sql    # 온보딩
docs/08-supabase-tips.sql          # 개발 팁 (tips, tip_likes, tip_comments)
docs/09-supabase-developer-role.sql
docs/10-supabase-haejwo.sql        # 해줘! (ideas)
docs/11-supabase-haejwo-alter.sql  # ideas.linked_project_id 추가
```

### 3. 의존성 설치 및 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인합니다.

## 인증

- **Google OAuth** 단일 방식 (Supabase Auth 경유)
- **`@ts.hs.kr` 도메인 전용** — Google `hd` 파라미터 → Middleware → Supabase RLS 3단 검증

## 디렉토리 구조

```
src/
├── app/
│   ├── (nav)/
│   │   ├── explore/        # 프로젝트 탐색
│   │   ├── projects/       # 프로젝트 등록·수정·상세
│   │   ├── guide/          # 바이브 코딩 가이드 위저드 + 결과
│   │   ├── tips/           # 개발 팁 블로그
│   │   └── haejwo/         # 해줘! 아이디어 요청
│   ├── auth/               # OAuth 콜백·forbidden
│   ├── me/                 # 내 프로필
│   └── onboarding/         # 닉네임 설정
├── components/
│   ├── shared/             # SiteHeader, PageNav, Markdown 등
│   ├── projects/           # 프로젝트 카드·폼
│   ├── guide/              # 가이드 위저드·뷰어
│   ├── tips/               # 팁 에디터·카드·댓글
│   └── haejwo/             # 해줘 위저드·완료 버튼
├── content/guides/         # 가이드 마크다운 파일
└── lib/
    ├── supabase/           # 서버·클라이언트 헬퍼
    ├── tips/actions.ts     # 팁 서버 액션
    ├── haejwo/actions.ts   # 해줘 서버 액션
    ├── constants.ts        # 옵션 상수
    ├── types.ts            # Supabase 타입
    └── guide.ts            # 가이드 위저드 로직
```

## 라이선스

이 프로젝트는 대구과학고등학교 재학생·졸업생 전용 내부 서비스입니다.
