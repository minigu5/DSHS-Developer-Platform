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
| **Hosting** | Cloudflare Workers (`@opennextjs/cloudflare`, 도메인 `dshs.dev`) — 2026-10-24 `dshs.dev` 연결 완료(옛 Vercel 주소는 마지막 배포 그대로 남음 — 2026-10-25 `vercel.json`으로 push 자동 배포 꺼서 Vercel CI 없음). 순서·설정: `docs/19-cloudflare-workers.md` |
| **추가 라이브러리** | `@supabase/ssr`, `react-hook-form`, `zod`, `lucide-react`, `date-fns`, `sonner`, `next-themes`, `react-markdown` + `remark-gfm` (바이브 코딩 가이드 렌더링), `cloudinary` (이미지 업로드) |

> ⚠️ shadcn `base-nova` style 의 Button 은 **`asChild` 미지원**. Link 에 `buttonVariants()` 클래스를 입혀 사용.

---

## 📚 기능별 문서 (`.claude/rules/`)

기능 하나에만 해당하는 내용은 이 파일이 아니라 `.claude/rules/<파일>.md`에 있다(2026-11-02 분리, 토큰 절약). 각 파일 맨 위 `paths:`에 맞는 파일을 Read·Edit하면 Claude Code가 그 문서를 자동으로 불러온다 — **Grep만 해서는 안 불러오므로, 그 기능을 고치기 전에 문서가 안 보이면 직접 Read할 것.** 새 결정·변경은 해당 파일에 적고, 여러 기능에 걸친 규칙만 이 파일에 적는다. 새 기능 문서를 만들면 `paths:`를 달고 아래 표에 한 줄 추가(`paths:` 없는 파일은 매 세션 불러와서 절약이 안 됨).

| 파일 | 내용 |
|---|---|
| `projects.md` | 등록·수정 폼 UX(README·라이선스 가져오기, 이탈 경고, 등록 직후 권유, 팀원), 상세·카드, 팀 수정 권한·삭제 확인, 댓글·하트 |
| `domains.md` | 도메인 마련하기 전체(확인 먼저, 호스트 프리셋, 바로가기, 대곽나루, DB 함수, 매일 점검, 비공개 전환 시 반납) |
| `guide.md` | 바이브 코딩 가이드(위저드·스테퍼·조각 표기·설치 링크 규칙), 가이드 위키 편집 |
| `community.md` | 개발 팁(공용 `Markdown` 렌더 포함)·해줘!·공지사항·홈 공지 티커 |
| `explore.md` | 탐색 검색·필터·주소 쿼리 |
| `profile.md` | 개발자 프로필 페이지·연락처 |
| `privacy.md` | 개인정보 처리방침·동의 팝업·탈퇴 — **새 개인정보 수집·외부 위탁을 추가할 때도 읽을 것**(본문을 고치면 전원 재동의) |
| `performance.md` | 온보딩 쿠키, `next.config.ts`(staleTimes·이미지·optimizePackageImports), Cloudinary 업로드, API 캐시 헤더, preconnect |
| `home.md` | 홈 구성·섹션·아이콘 나열·로딩 시퀀스·스크롤 리빌 |
| `nav.md` | `PageNav`/`MobileNav`·활성 판정·섹션 색·커뮤니티 탭 |

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
| **User** (로그인) | 위 + 프로젝트 게시/수정/삭제, 댓글 작성·하트(즐겨찾기). Private 프로젝트는 작성자 또는 `allowed_users`에 포함된 사용자만 접근 |

### 보호 라우트 (`src/middleware.ts`)
- `/projects/new`, `/projects/[id]/edit`, `/tips/new`, `/haejwo/new`, `/me`, `/guide-wiki/[key]/edit`, `/domains`(관리자 화면 `/domains/admin` 포함)
- 비로그인 시 `/login?next=<원래경로+쿼리>` 로 리다이렉트 (쿼리 보존 — 가이드 편집기의 `?from=` 복귀용)
- 이미 로그인된 사용자가 `/login` 진입 시 홈으로

---

## 🧩 핵심 기능 — 프로젝트 체크리스트

프로젝트 게시·검색 시 사용하는 표준 분류 항목. 옵션 값은 `src/lib/constants.ts` 에 정의됨.

| 항목 | 키 | 값 |
|---|---|---|
| **프로그램 종류** | `types` | 웹사이트, 앱, 확장프로그램, CLI, 라이브러리 (다중 선택, 최소 1개 — 2026-10-24 단일 `type`에서 변경) |
| **지원 플랫폼** | `platforms` | Web, iOS, Android, Windows, macOS, Linux (다중 선택) |
| **소스코드** | `source_type` | `open`(`repo_url` 필수) / `closed` |
| **라이선스 권한** | `license_features` | 상업적 이용, 수정, 배포, 개인적 이용, 법적 책임, 보증 (다중 선택) |
| **공개 여부** | `visibility` | `public` / `private` |
| **작성자 형태** | `author_role` | `individual` / `team` / `anonymous`(2026-10-31, 아래 「익명 프로젝트」) |
| **아이콘** | `icon_type` | `auto` (URL favicon 자동 추출) / `link` (이미지 업로드 또는 URL 직접 입력) |

### 익명 프로젝트 (2026-10-31 사용자 요청)
- 등록·수정 폼 "만든 사람"이 개인 / 팀 / **익명** 3칸. 익명은 팀 이름·팀원 없음(DB CHECK `projects_anonymous_no_team`). 수정 화면에서 팀원(소유자 아님)은 익명으로 못 바꾼다(화면만).
- 사용자 결정: 소유자는 DB(`author_id`)에 그대로, 남에게는 **모든 프로젝트 목록·상세·홈에 '익명'(`ANONYMOUS_AUTHOR`)으로만** 보이고 **프로필 목록·작성자 이름 검색·작성자 링크에는 절대 안 나온다** — 화면만이 아니라 **DB에서 막는다**(migration `20261031100000_projects_anonymous.sql`).
  - `projects.author_id`는 anon/authenticated가 **읽을 수 없다**(칸 단위 GRANT). `select('*')`도 막히므로 사용자 키로는 칸을 적어 읽는다 — 상세·수정은 `PROJECT_COLUMNS`(`src/lib/projects/columns.ts`). **projects에 새 칸을 만들면 migration에서 `GRANT SELECT (새 칸) ON public.projects TO anon, authenticated`와 `PROJECT_COLUMNS` 추가 필수.** 서비스 키·SECURITY DEFINER 함수는 그대로 `author_id`를 쓴다.
  - 화면의 작성자는 자동 계산 칸 `public_author_id`(익명이면 NULL)로만: 링크 `/developers/<public_author_id>`, 사용자 붙이기는 **`users!projects_public_author_id_fkey(...)`**(관계가 둘이라 이름 필수 — 그냥 `users(...)`는 PGRST201).
  - 내 프로젝트(익명 포함)는 `rpc('my_project_ids')`(본인 것만, authenticated 전용) — 수정 페이지 소유자 판정, 상세 "수정하기"(이제 서버에서 판단, `EditButton`은 링크만), 본인 프로필 목록(익명도 '익명'으로 보임), `/domains` 목록.
  - 댓글(`project_comments`, 옛 reviews) 조회 정책은 다른 표의 `author_id`를 읽으면 권한 오류라 `EXISTS (SELECT 1 FROM projects WHERE id = project_id)`(= projects RLS에 맡김)로 바꿈.
  - 해줘 "구현완료" 연결은 익명 프로젝트를 받지 않고(`public_author_id = 나`만), 연결 뒤 익명으로 바꾼 프로젝트는 해줘 목록·상세에서 숨긴다(글쓴이 = 만든 사람이라 익명이 풀림).
  - 한계: 설명·저장소 링크(GitHub 아이디)·사이트 내용으로는 알 수 있음(폼 안내 문구). 개발자 계정도 화면에서는 '익명'으로 본다(DB에서 확인).

## 🗄️ 데이터베이스 스키마 (Supabase PostgreSQL)

> 실제 SQL: `docs/03-supabase-schema.sql` (통합본 단일 source of truth)
> TypeScript 타입: `src/lib/types.ts` (수동 작성)

### 주요 테이블 구조
- **`users`**: `id`, `email`, `full_name`, `nickname`, `bio`, `interests`, `avatar_url`, `contacts`(JSONB, `docs/14-supabase-users-contacts.sql` 적용 필요)
- **`projects`**: `id`, `author_id`, `title`, `description`, `types`(text[], `docs/17` 1·2단계 모두 운영 적용 — 옛 `type` 칸은 2026-10-27 migration `20261027120000`으로 삭제), `platforms`, `source_type`, `repo_url`, `url`, `license_features`, `visibility`, `allowed_users`, `icon_url`, `readme_sync`·`readme_etag`·`readme_synced_at`(`docs/20-supabase-projects-readme-sync.sql`, 적용 완료)
- **`project_comments`**(옛 `reviews`, 2026-11-05 별점 삭제·1인 여러 개): `id`, `project_id`, `user_id`(사용자 키로 못 읽음), `content`, `is_author`, `public_user_id`(익명 프로젝트 소유자 댓글이면 NULL — 화면은 `users!project_comments_public_user_id_fkey`로만 사람을 붙임 — `(count)` 집계·`select=*` 금지, 수는 `project_comments(id)` 길이), `created_at`. 자세히는 `.claude/rules/projects.md` 「댓글·하트」
- **`project_hearts`**: PK(`project_id`,`user_id`), `created_at`, `by_anonymous_owner` — 하트 = 즐겨찾기, 누가 눌렀는지 공개(만든 사람이 자기 익명 프로젝트에 누른 것만 남에게 숨김). 나중 팔로잉 피드용 인덱스 `(user_id, created_at DESC)`

### RLS 정책 요약
- **`users`**: 누구나 조회 가능, 본인만 수정 가능.
- **`projects`**: Public은 누구나, Private은 소유자 및 허용된 사용자만. 생성/삭제는 소유자만. **수정은 소유자 또는 `team_members`에 이메일이 포함된 팀원**도 가능(`docs/13-supabase-projects-team-edit.sql` 적용 후).
- **`project_comments`·`project_hearts`**: 프로젝트 접근 권한자만 조회 가능, 본인만 생성/삭제(댓글은 글만 수정). 볼 수 없는 프로젝트엔 하트를 못 누름.

## 🌏 인프라 및 배포 설정

| 항목 | 설정값 |
|---|---|
| **Cloudflare Worker** | `dshs-developer-platform` (`wrangler.jsonc`), 배치 힌트 `aws:ap-northeast-2`로 DB 가까이 실행 |
| **Vercel 배포 리전** (전환 전까지) | `icn1` (서울, ap-northeast-2) |
| **Supabase DB 리전** | `ap-northeast-2` (서울) — DB·인증은 Supabase 유지(2026-10-24 사용자 결정, D1 이전 안 함) |

> 서버 → DB 왕복 레이턴시를 줄이려고 서버를 DB(서울) 가까이에 둔다.

### Cloudflare Workers 주의 (`docs/19-cloudflare-workers.md`)
- **파일 시스템 없음**: 런타임 `fs` 읽기 금지. 가이드 조각은 `scripts/gen-guide-fragments.mjs`가 `postinstall`·`predev`·`prebuild`에서 `src/content/guides/fragments.generated.ts`(커밋 안 함)로 묶고, 운영은 그것을 읽는다(개발은 md 직접).
- **`node:dns` 불안정**: `ssrf-guard.ts`는 `lookup` 실패 시 DoH(fetch)로 대체. 또 Workers의 `lookup`은 CNAME인 이름(학생 서브도메인 → Vercel 등)에서 **CNAME 대상 이름까지 `address`로 돌려준다**(2026-10-25 실측 — 로컬 workerd에선 안 나오고 `wrangler dev --remote`에서만 재현). 그대로 두면 `isBlockedIp`(IP가 아니면 막음)가 "resolves to private ip"로 막아 도메인 확인이 전부 실패하므로 `ipAddressesOnly`로 IP만 남긴다(테스트 `ssrf-guard.test.ts`).
- **ISR 캐시 없음**: `revalidate` 페이지도 쿠키를 읽어 실제로는 동적(ƒ). `open-next.config.ts`는 정적 자산 캐시만. 쿠키 없는 ISR 페이지를 만들면 R2 캐시로 바꿀 것.
- **무료 요금제 CPU 10 ms/요청** — 넘으면 빈 본문 503(`wrangler tail`의 `outcome: exceededCpu`), 사이트 전체에서 간헐적으로 났다(2026-11-01, 24시간 987건 중 53건). 사용자 결정: 결제 전에 최적화부터 — **보안과 상관없는 표시 작업은 브라우저로**(마크다운 렌더, 공개 데이터만 쓰는 홈 목록). 권한 판단·서비스 키·비공개 필터는 서버에 둔다. 남는 해결책은 Workers Paid($5/월, 계정 단위).
- **한국 접속은 LAX 경유**(무료 망): 첫 응답 0.8~2초(Vercel icn1은 0.1~0.4초). 무료로는 못 고친다 — 체감은 로딩 뼈대로 가린다(아래 「로딩 뼈대」).
- `wrangler.jsonc` `keep_names: false` 필수 — 켜 두면 esbuild `__name()`이 next-themes 인라인 스크립트에 섞여 브라우저에서 `__name is not defined`.
- Worker 배치는 `placement.region: aws:ap-northeast-2`(Supabase 옆, smart 모드는 트래픽이 쌓여야 작동).
- `wrangler types` 결과(`cloudflare-env.d.ts`)는 두지 않는다 — 런타임 타입이 브라우저 `Response.json()`을 `unknown`으로 덮어 `tsc`가 깨짐.
- `src/middleware.ts` 유지(OpenNext가 Next 16 `proxy.ts`를 아직 인식 못 한다는 보고). Next는 16.4.1 이상 필요(OpenNext peer).

---

## ⚡ 캐시·로딩 (나머지 성능 설정은 `.claude/rules/performance.md`)

### 페이지별 캐시 전략
- 홈(`/`): `force-static`(2026-11-01) — 빌드 때 만든 틀만 내려주고, 목록(공지 띠·아이콘 나열·최근 프로젝트·이렇게 써요 예시·요즘 글·도메인 현황·마무리 아이콘)은 `home-slots.tsx`의 슬롯들이 `home-data.ts`(`useHomeData`, 요청 하나를 나눠 씀, 30초 캐시)로 브라우저에서 anon 키로 읽는다. 받기 전엔 같은 크기 회색 자리. `RevealObserver`는 나중에 붙는 `.reveal`도 MutationObserver로 잡는다.
- 팁 목록·상세(`/tips`, `/tips/[id]`), 해줘 목록(`/haejwo`): `revalidate = 30` (ISR, 30초)
- 탐색(`/explore`), 프로젝트 상세(`/projects/[id]`): `force-dynamic` — RLS 기반 사용자별 콘텐츠(개발자 계정은 비공개 프로젝트까지 조회)이므로 서버 캐시 사용 불가

### 로딩 뼈대 (`loading.tsx` + `src/components/shared/page-skeleton.tsx`, 2026-10-24)
- 문제: Cloudflare 무료 망은 한국 접속이 LAX를 거쳐 서버 왕복이 0.8~2초 — 링크를 누르면 1초쯤 아무 반응이 없었다.
- 해결: 경로마다 `loading.tsx`가 실제 틀(PageHero 높이·카드 격자·글 레이아웃)과 같은 **회색 블록 뼈대**를 즉시 보여 준다(반짝임·펄스 없음). 메뉴(`PageNav`/`MobileNav`)는 누른 순간 활성 표시가 옮겨간다(`useOptimisticActive`).
- `loading.tsx`는 그 폴더 아래 모든 하위 페이지를 감싸므로, 목록·상세가 같은 폴더인 곳은 **route group**으로 나눴다: `tips|haejwo|announcements/(list)/`, `…/[id]/(detail)/`, `projects/[id]/(detail)/`. 새 하위 페이지를 만들 때 엉뚱한 뼈대가 뜨지 않게 이 구조를 따른다.
- 측정(dshs.dev, 데스크탑, 2026-11-04 전 — 그땐 보이는 링크를 다 미리 받았음): 메뉴 이동 0.05~0.1초, 공지 상세는 뼈대 0.05초 → 내용 0.8~2.4초. 첫 접속(주소 직접 입력)은 망 문제라 그대로.

## 📱 반응형 / 모바일 최적화

> 원칙: **데스크탑(`sm:` 640px 이상) 디자인은 그대로 두고, 모바일(기본 브레이크포인트)에서만 보강**한다. 모든 반응형 클래스는 `기본값(모바일) + sm:기존값(데스크탑 동일)` 패턴으로 작성해 데스크탑 레이아웃이 픽셀 단위로 동일하게 유지되도록 한다.

- **좌우 여백**: 페이지 `<main>`/섹션은 **모든 폭에서 `px-6`(24px)** — 2026-10-24 "모바일 16px은 너무 좁다" 피드백으로 `px-4 sm:px-6`을 폐기. 헤더(`SiteHeader`) 컨테이너도 동일. 카드 안 여백(20px)은 그대로.
- **헤더 우측 버튼**: 좁은 폰에서 오버플로우 방지를 위해 라벨을 반응형 처리. 예) tips의 "팁 작성"은 모바일 "작성"/데스크탑 "팁 작성"(`<span className="hidden sm:inline">`). 모바일 헤더는 로고·공지 벨·프로필만 표시(다크모드는 프로필 메뉴 안, `PageNav`는 하단 탭바로 분리). 헤더 오른쪽 묶음은 모바일 `gap-1` / 데스크탑 `gap-2`.
- **목록 도구줄**: 커뮤니티 탭 줄처럼 왼쪽·오른쪽 컨트롤을 한 줄에 두는 곳은 `flex flex-wrap justify-between gap-x-4 gap-y-3` — 모바일에선 오른쪽 요소가 아래로 내려가 가로 스크롤이 생기지 않는다.
- **모바일 하단 탭바**: `MobileNav`(`sm:hidden`)가 뷰포트 바닥에 고정. 아이콘 전용, 활성 항목은 원형 컬러 배경+흰색 아이콘으로 강조. 콘텐츠가 가려지지 않도록 `(nav)/layout.tsx`에서 `pb-16 sm:pb-0` 여백 처리.
- **큰 제목**: 모바일에서 한 단계 작게. 홈 히어로 `text-3xl sm:text-6xl`, 페이지 머리(`PageHero`) h1 `text-3xl sm:text-[40px]`(compact `text-2xl sm:text-[28px]`). 모바일 머리는 설명 문장을 숨긴다.
- **카드/섹션 패딩**: `p-6 sm:p-8` (모바일 24px, 데스크탑 32px).
- **세로 스택 전환**: 좁은 폭에서 잘리는 행은 `flex-col sm:flex-row`로 전환 (예: 상세 댓글 칸의 "로그인이 필요해요" 행).
- **섹션 헤더 정렬**: `flex-col sm:flex-row justify-between` 컨테이너에서 `items-start sm:items-end` 패턴 사용 — 모바일(`flex-col`)에서 `items-end`를 쓰면 콘텐츠가 오른쪽으로 붙어버림.
- **홈 CTA 버튼**: 모바일에서 `max-w-[280px] sm:max-w-none` 제한 — `w-full`만 두면 전체 너비로 늘어나 이상해 보임.
- **홈 섹션별 카드 수**: 모바일에서 최대 3개만 표시. 프로젝트 fetch는 6개(데스크탑 3열 채움)이나 index ≥ 3 항목에 `hidden sm:block` 적용.
- **대화창(`ui/dialog.tsx`)**(2026-11-02): 공용 `DialogContent`가 `max-h-[calc(100dvh-2rem)] overflow-y-auto` + 자식 `min-w-0` — 화면보다 긴 창은 안에서 스크롤돼 저장 버튼까지 닿는다(프로필 설정 창이 위아래·오른쪽으로 잘려 버튼을 못 눌렀음). 창 안의 `flex-1` 입력칸에는 `min-w-0`을 같이 줄 것(없으면 입력칸 기본 폭 때문에 창 밖으로 밀림).
- **헤더 로고 글자 숨김 폭**(2026-11-02): 360px 미만(벨·로그인과 겹침)과 `showNav`일 때 640~767px(가로 폰 — 인라인 `PageNav`가 오른쪽 버튼 밑으로 파고듦)에서 로고 글자를 `sr-only`로(아이콘만 보임, 링크 이름은 유지). 내비 칸·라벨을 늘리면 이 폭에서 다시 겹치는지 확인.
- **가로 스크롤 줄 안에 드롭다운 금지**: `overflow-x-auto` 상자 안의 `absolute` 메뉴는 잘린다 — 탐색 모바일 필터 바의 정렬 버튼은 스크롤 상자 밖 오른쪽에 둔다.
- 신규 페이지/컴포넌트 작성 시에도 위 패턴을 따를 것.

## 🧱 하위 페이지 공통 톤 (2026-10-24 통일)

설계: `docs/superpowers/specs/2026-10-24-subpage-tone-design.md`, 계획: `docs/superpowers/plans/2026-10-24-subpage-tone.md`. 홈을 제외한 모든 페이지가 아래 규칙을 따른다.

- **바탕**: `bg-white dark:bg-zinc-950`. 보조 구간만 `bg-zinc-50 dark:bg-zinc-900/40` + `border-t` 띠(프로필 프로젝트). `bg-zinc-50` 페이지 바탕 금지.
- **페이지 머리 `PageHero`** (`src/components/shared/page-hero.tsx`): 홈 히어로의 축소판 — 모눈 배경 + 가운데 세로 스택(섹션 색 아이콘 타일 → h1 Plex → 한 줄 설명 → 알약 버튼 → 추가 요소). `variant="compact"`(에디터·위저드: 타일 36px + 제목만), `avatar`(프로필), `maxWidth="lg"`(탐색), `children`(검색창·세그먼트). 머리 요소만 `.rise` 0/60/120/180ms로 한 번 등장; 카드·목록은 애니메이션 없음. **모바일은 설명 문장을 숨긴다.**
- **섹션 색 `SECTION_COLORS`** (`src/lib/section-colors.ts`): 쓰는 곳은 세 군데만 — 머리 아이콘 타일(연한 배경), 페이지의 주 버튼, 활성 칩(필터·세그먼트·내비). 나머지는 zinc. 개발 팁은 `tip-*` 토큰(분홍).
- **다중 선택 폼은 무채색**: 프로젝트 등록·수정, 온보딩 관심 분야처럼 선택이 많은 폼은 선택 상태에 섹션 색을 쓰지 않는다 — `SelectCard`/`ToggleChip`/`ChoiceRow`(`src/components/forms/`) 기본 `tone="neutral"` = zinc-900 반전(다크 흰색). 한 화면에서 하나만 고르는 위저드(가이드·해줘 등록)는 `tone="guide"|"haejwo"`로 섹션 색.
- **등록 폼** `ProjectForm`: `FormSection` 카드 5장(기본 정보 → 상세 설명 → 분류 → 소스코드·라이선스 → 공개 범위·만든 사람) + 수정 페이지 소유자만 "위험 구역"(rose). 데스크탑(`lg:`)은 오른쪽 `FormRail` 목차(완료 체크, "필수 항목 N / 6"(앱이면 플랫폼까지 7 — `handleSubmit` 검사와 같음), IntersectionObserver 강조, 클릭 스크롤). emerald는 머리 타일과 "등록하기/저장하기" 버튼에만.
- **글 상세**(팁·해줘·공지): `ArticleHeader` + `ReadingSurface`. 다크에서 긴 글은 바탕(zinc-950)보다 밝은 zinc-900 카드 위에 올린다("눈 아프다" 피드백). 본문 글자 라이트 zinc-700 / 다크 zinc-300.
- **에디터**: `EditorTabs`(작성/분할/미리보기 세그먼트, `showSplit`) + `TITLE_INPUT_CLASS`(밑줄만 있는 Plex 제목 입력). 팁·공지·프로젝트·해줘 에디터가 공유.
- **프로젝트 아이콘 = 스티커**: 어디서나 `rounded-[22%]`; 상세 112px·등록 폼 미리보기 72px·프로필 아바타는 홈 나열과 같은 `ring-[3px] ring-white dark:ring-zinc-950` + 그림자.
- **모눈 물결** (`globals.css` `.paper-grid`): 모눈은 `::before` 레이어(요소는 `relative isolation-isolate`, 내용 래퍼에 `relative z-10` 필요). 라인 `#f0f0f3`(다크 `#18181c`). 모눈 전체가 10초에 한 칸(24px) 대각선으로 흐르고(`grid-drift`), `mask-image` 3층으로 "잘 보이는 구역" 두 덩이가 28초 주기로 지나가 일부는 또렷·일부는 흐림(`grid-wave`, 바탕 가시도 38%). 색 블롭이 아니라 모눈 가시도만 바뀌는 것. 동작 줄이기면 전역 규칙으로 정지.
- **로그인 계열** `AuthShell`(`src/components/auth/auth-shell.tsx`): 헤더 없는 독립 화면(로그인·온보딩·접근 거부). 모눈 물결이 화면 전체, 가운데 스택(데스크탑 620px / 모바일 400px), 로고 스티커 또는 rose 방패 타일, `AuthNote` 안내 상자. 로그인 버튼은 흰 알약 + Google 로고 "Google로 계속하기". 온보딩은 단계 알약 "1 / 2단계" + `ToggleChip` 관심 분야, 고정 다크 배경 제거.
- **버튼**: `rounded-full`, 주 h-11 / 보조 h-9 / 작은 h-7. `transition-all` 금지.
- **콘텐츠 너비**: 목록·상세 `max-w-5xl`, 탐색만 `max-w-6xl`, 글·에디터 `max-w-3xl`.

## 🚫 Claude 토큰 절약 (읽지 않을 파일)

Claude Code는 `.claudeignore`를 읽지 않는다(2026-11-02 삭제). 대신 두 가지로 막는다.
- **Grep·Glob**: `.gitignore`를 따른다 — `node_modules`·`.next`·`.open-next`·`.wrangler`·`fragments.generated.ts`·`.claude/worktrees/`는 검색에 안 걸림.
- **Read 차단** `.claude/settings.json` `permissions.deny`: 빌드 산출물(`.next`·`.open-next`·`.wrangler`), 락 파일, 로그, `supabase/.temp`, `fragments.generated.ts`(md 조각 묶음 — 원본 `src/content/guides/*.md`를 읽을 것), 이미지·폰트·영상, 비밀 파일(`.env`·`.env.local`·`.dev.vars`·`*.pem`·`*.key`·`*.crt`)과 실명 데이터(`student_mappings*`·`*real_names*`). **고쳐야 할 수 있는 파일은 넣지 않는다** — Read가 막히면 Edit도 못 한다. 화면 확인 스크린샷은 프로젝트 밖(`/tmp`·scratchpad)에 저장해야 열 수 있다.
- **필요할 때만 읽기**(차단 아님): `src/components/ui/`(shadcn 생성, 주의사항은 Tech Stack), `src/lib/types.generated.ts`(기준은 `types.ts`), `docs/01`·`docs/02`(사람용 셋업 가이드), `public/`.
- **이 파일은 짧게**: 기능 하나에만 해당하는 내용은 「📚 기능별 문서」의 `.claude/rules/` 파일에 적는다(이 파일은 매 세션 통째로 불러온다).

---

## 📌 작업 시작 전 체크리스트
1. `npm run dev` 실행 및 `http://localhost:3000` 확인.
2. `npx tsc --noEmit` 실행하여 타입 에러 0 확인.
3. `.env.local` 환경 변수 설정 확인 — 비밀 값이 담겨 Read는 막혀 있다(`settings.json`). 이름만 `grep -o "^[A-Z_]*=" .env.local`로 볼 것, 값은 출력하지 않는다.

### 필수 환경변수 목록 (`.env.local` · Cloudflare 설정 — `NEXT_PUBLIC_*`는 빌드 변수, 나머지는 `wrangler secret`/`vars`, `docs/19-cloudflare-workers.md`)

| 변수명 | 출처 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 위 동일 |
| `SUPABASE_SERVICE_ROLE_KEY` | 위 동일 |
| `NEXT_PUBLIC_SITE_URL` | 로컬: `http://localhost:3000`, 프로덕션: 배포 URL |
| `ALLOWED_EMAIL_DOMAIN` | `ts.hs.kr` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary → Dashboard |
| `CLOUDINARY_API_KEY` | 위 동일 |
| `CLOUDINARY_API_SECRET` | 위 동일 |
| `CLOUDFLARE_DNS_API_TOKEN` | Cloudflare 계정 토큰(`cfat_…`) — `dshs.dev` 존 **DNS 편집만**. 도메인 마련하기용. Workers는 `wrangler secret put`, Actions는 저장소 Secrets |
| `CLOUDFLARE_ZONE_ID` | `c9fac6d72c704d4836b837590f18e144`(dshs.dev). Workers `vars`, Actions Secrets |
| `CLOUDFLARE_LISTS_API_TOKEN` | 바로가기 주소용 별도 계정 토큰 — **Account Filter Lists · Edit + Mass URL Redirects · Write**(범위 Entire Account — 목록·Bulk Redirects는 계정 리소스라 도메인 범위로는 안 됨, 사용자가 망설이다 동의). Workers `wrangler secret put`, Actions Secrets |
| `CLOUDFLARE_ACCOUNT_ID` | dshs.dev가 있는 Cloudflare 계정 id(비밀 아님). Workers `vars`, Actions Secrets |
| `CLOUDFLARE_REDIRECT_LIST_ID` | Bulk Redirect 목록 `dshs_subdomain_redirects`의 id(`node scripts/create-redirect-list.mts`가 출력). Workers `vars`, Actions Secrets |

## ⚠️ 보안 및 주의사항
- **학생 주소(`*.dshs.dev`)와 같은 사이트(same-site)**: 학생 사이트 JS가 `.dshs.dev` 쿠키를 심을 수 있다. 그래서 운영 세션 쿠키는 `__Host-sb-auth`·`__Host-ds_onboarded`(`src/lib/supabase/cookie-options.ts`, 세 Supabase 클라이언트 공통 — 개발은 `sb-dev-auth`). **본 사이트는 `Domain=.dshs.dev` 쿠키를 절대 쓰지 않는다.** SameSite=Lax가 막아 주지 않으므로 쿠키로 인증하는 상태 변경 Route Handler는 `isSameOrigin()`(`src/lib/same-origin.ts`) 검사 필수(`/api/upload` 적용). 서버 액션은 Next가 Origin을 검사. 학생 JS가 큰 쿠키를 심어 `dshs.dev`를 431로 막는 "쿠키 폭탄"은 서버에서 못 막는다 — 관리자 회수로 대응.
- **실명 파생**: `student_mappings` 테이블은 삭제됨. 이제 `users.full_name`은 로그인 시 이메일(입학연도)과 구글 계정명(숫자4자리+이름)에서 자동 파생 — `src/app/auth/callback/route.ts` 참고.
- **Supabase Client**: 서버 사이드에서는 `createServerClient`, 클라이언트에서는 `createBrowserClient` 사용. 민감한 작업은 항상 `getUser()`로 검증. 서버에서 `getSession()`은 쿠키 값을 검증 없이 돌려주므로 권한 판단(특히 `createAdminClient()` 사용 여부)에 쓰지 않는다(2026-10-26 프로젝트 수정 페이지를 `getUser()`로 교체).
- **사용자 키로 못 바꾸는 칸**(2026-10-27, migration `20261027100000_lock_identity_columns.sql`): 학생이 API로 `users.email`을 관리자·다른 학생 이메일로 바꿔 비공개 열람·남의 프로젝트 수정이 되던 구멍을 막음. 트리거가 `current_user`가 `anon`/`authenticated`일 때만 거절한다 — `users`의 `id`·`email`·`full_name`·`created_at`(같은 값 다시 쓰기는 허용, 프로필 upsert가 email을 같이 보냄), `projects`의 `id`·`author_id`·`click_count`·`created_at`(INSERT 땐 `click_count=0`), 공지의 `is_pinned`·`admin` 카테고리(관리자 제외). 서비스 키·SECURITY DEFINER 함수는 그대로 쓴다. `users.email` UNIQUE. RLS 정책은 `public.users.email` 대신 `auth.jwt() ->> 'email'`, 관리자는 `is_admin()`(auth.users 기준) — **새 정책도 public.users.email로 권한을 판단하지 말 것**. `track_project_click`은 service_role 전용(`/api/track`이 `createAdminClient()`로 부름, IP는 `cf-connecting-ip` 우선). 익명 클릭은 User-Agent만 바꿔도 새 사람으로 보이므로 **프로젝트마다 하루 30번까지만** 센다(`track_project_click`, migration `20261027120000` — 해시 방식은 그대로라 처리방침 안 바뀜). 로그인 클릭은 사람마다 하루 1번, 상한 없음.
- **DB 정리**(2026-10-27, migration `20261027110000_db_hardening.sql`): NOT VALID 제약 전부 VALIDATE, 외래 키마다 인덱스, 함수 search_path 고정(SECURITY DEFINER는 `''`), RLS의 `auth.uid()`·`is_admin()`은 `(select …)`로 감쌈 — **새 정책·함수도 같은 규칙으로**.
- **보안 헤더**(2026-10-26): `next.config.ts` `headers()`가 모든 응답에 `X-Frame-Options: DENY`·CSP `frame-ancestors 'none'`(클릭재킹 차단)·`nosniff`·`Referrer-Policy`·`Permissions-Policy`(카메라·마이크·위치 끔)를 붙이고 `poweredByHeader: false`. OpenNext에서도 적용됨을 `wrangler dev`로 확인. 우리 화면을 iframe에 넣는 기능이 생기면 여기를 고칠 것. HSTS는 `.dev`가 브라우저 preload 목록이라 안 둠. 스크립트 CSP는 아직 없음.

---

## 🗂️ 현재 디렉토리 구조
```
src/
├── app/                  # App Router 레이어 (auth, projects, developers, explore, guide, tips 등)
│   ├── api/              # API 라우트
│   │   ├── upload/       # POST /api/upload — Cloudinary 이미지 업로드
│   │   ├── favicon/      # GET /api/favicon — 파비콘 추출
│   │   └── resolve-image/ # GET /api/resolve-image — ibb.co URL 변환
│   ├── guide/            # 바이브 코딩 가이드 (page=위저드, [...slug]=결과 페이지)
│   ├── tips/             # 개발 팁 블로그 (page=목록, new, [id], [id]/edit)
│   ├── haejwo/           # 해줘! 아이디어 요청 (page=목록, new, [id])
│   └── announcements/    # 공지사항 (page=목록, new, [id], [id]/edit)
├── components/
│   ├── community/        # community-tabs(개발 팁 | 해줘! 탭 세그먼트)
│   ├── shared/           # site-header, page-nav, announcements-link(헤더 공지 벨), page-hero, article-header, reading-surface, editor-tabs, markdown, image-upload-input, announcement-ticker 등
│   ├── forms/            # select-card, toggle-chip, choice-row(선택 UI, tone="neutral"|섹션 키), form-section, form-rail(등록 폼 카드·목차)
│   ├── auth/             # google-login-button, auth-shell(로그인·온보딩·접근 거부 공통 틀)
│   ├── home/             # icon-shelf, reveal-observer, section-header, home-project-card, how-it-works, recent-posts, guide-teaser, domain-teaser, closing-cta, site-footer
│   ├── projects/         # project-card, project-form, project-icon, project-comments, heart-button, stat-strip 등
│   ├── explore/          # explore-client, mobile-filter-bar
│   ├── guide/            # guide-wizard, guide-viewer(스테퍼), guide-step-body(단계 렌더러), guide-chapter-tools
│   ├── guide-wiki/       # 가이드 위키 편집: editor/(카드 편집기·reducer), history-list, revert-dialog, step-diff-view, doc-render, stale-banner
│   ├── privacy/          # privacy-gate(동의 팝업, 루트 레이아웃), withdraw-button(동의 철회·탈퇴)
│   ├── domains/          # 도메인 마련하기: domain-list, domain-steps, host-picker, admin-domain-table
│   ├── tips/             # tip-card, tip-editor, tip-like-button, tip-comments 등
│   ├── haejwo/           # haejwo-wizard, haejwo-card, haejwo-status-tabs, haejwo-owner-actions, haejwo-complete-button
│   ├── announcements/    # announcement-card, announcement-editor, announcement-owner-actions, announcement-pin-button
│   └── ui/               # shadcn 컴포넌트
├── content/guides/       # 가이드 조각 18개 (<key>.md, 작성법 README.md)
├── lib/                  # 유틸리티 및 설정 (supabase, constants, types, utils, guide, guide-markup, guide-content, guide-wiki, haejwo, announcements, privacy, cloudinary, section-colors, type-icons, announcement-colors)
└── middleware.ts         # 세션 관리 및 도메인 검증
```

## ♿ 키보드 접근성 규칙

### 전역 접근성 장치
- **본문 건너뛰기 링크**: `SiteHeader` 첫 요소(`sr-only focus:not-sr-only`) → `#main-content`. `(nav)/layout.tsx` 콘텐츠 래퍼와 홈 `<main>`에 `id="main-content" tabIndex={-1}`.
- **포커스 표시 기본값**: `globals.css`에서 `:where(a, button, [role="button"], summary, [tabindex]):focus-visible`에 파란 outline. 개별 컴포넌트의 `focus-visible:ring-*`이 있으면 그쪽이 우선.
- **동작 줄이기**: `prefers-reduced-motion: reduce`면 전역 애니메이션·트랜지션 사실상 0. 장식 애니메이션 추가 시 `motion-reduce:` 변형도 고려.
- **색 대비**: 흰 글자 배경색은 WCAG AA(4.5:1) 충족 색만 사용 — blue-600, purple-600, emerald-700, tip-600(#db2777), orange-700, sky-700 이상. (Tailwind v4 `pink-600`은 oklch라 대비가 경계선이어서 팁 색은 hex 토큰으로 고정.) `*-500` 배경 + 흰 글자 금지. 회색 본문은 `text-zinc-500` 이상(밝은 배경), `text-zinc-400`은 장식 아이콘에만.
- **내비게이션**: `PageNav`/`MobileNav` 각 링크에 `aria-label`(아이콘 전용 대비) + 현재 페이지 `aria-current="page"`, `<nav aria-label="주요 메뉴">`.
- **아이콘**: 장식 아이콘은 `aria-hidden`, 아이콘 전용 버튼은 한국어 `aria-label`. 이름 옆 아바타 이미지는 `alt=""`.
- **토글/펼침 버튼**: 선택형 칩은 `aria-pressed`, 접이식·드롭다운 트리거는 `aria-expanded`. 접힌 영역은 `invisible`로 Tab 순서에서 제외.
- **위저드 단계 전환**: `GuideWizard`는 단계가 바뀌면 새 질문 제목(h2, `tabIndex={-1}`)으로 포커스 이동.
- **폰트**: `globals.css` `@theme inline`의 `--font-sans`는 `var(--font-geist-sans)` + 한글 시스템 폰트 스택. `var(--font-sans)` 자기참조로 두면 순환 참조로 무효화돼 Times(세리프)로 렌더링됨(실제 발생했던 버그).

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
- **Design System**: Zinc/Blue 포인트, `rounded-3xl` 카드, 불투명 표면. **제목(h1·h2)과 로고는 IBM Plex Sans KR**(600/700, `next/font`의 `--font-plex-kr`, `font-heading` 유틸리티), 본문은 Geist + 한글 시스템 폰트. 프로젝트 아이콘은 `rounded-[22%]`(앱 아이콘 모양)로 통일, 아이콘 없는 프로젝트는 제목 첫 글자 + 제목 해시로 고른 색 타일(`ProjectIcon` 폴백). 개성은 홈 히어로(아이콘 나열·로딩 시퀀스)에 집중하고 나머지는 차분하게 유지. 모눈종이 배경(`.paper-grid`)은 **홈 히어로·모든 페이지 머리(`PageHero`)·로그인 계열 화면(`AuthShell`)**에 쓰고 그 외에는 쓰지 않는다(2026-10-24 하위 페이지 톤 통일 — 아래 「🧱 하위 페이지 공통 톤」 참고). 아래 "AI 템플릿 느낌" 요소는 쓰지 않는다 (2026-10 전면 제거):
  - 배경 블러 블롭(`blur-[120px]` 원), 그라디언트 텍스트, 파랑→보라 그라디언트 아바타, 글래스모피즘(`bg-white/70 backdrop-blur`)
  - hover 시 확대(`hover:scale-*`)·떠오름(`hover:-translate-y-*`)·컬러 글로우 그림자(`shadow-blue-500/20`), 섹션마다 거는 스크롤 리빌. 예외: 홈 중간·하단의 `RevealObserver` 리빌(2026-10-24 사용자 요청) — 다른 페이지엔 넣지 않는다
  - 제목 위 아이콘+섹션명 알약(eyebrow), `uppercase tracking-wider` 라벨, ✨ 환영 배지, 이모지 안내문, 마케팅 문구("새로움을 창조하세요")
  - `transition-all` 금지 — 바뀌는 속성만 지정(`transition-colors`, `transition-[color,background-color,border-color,scale]`)
- **링크는 `@/components/shared/link`**(2026-11-04): `next/link`를 직접 import하지 않는다 — 화면에 보이는 링크를 다 미리 받아 학교 IP가 Cloudflare 속도 제한에 걸렸다. 공용 `Link`는 hover·터치·포커스 때만 미리 받는다(`.claude/rules/performance.md`).
- **카피**: 기능을 쉬운 말로 설명하는 해요체. 빈 상태엔 다음 행동 링크 제공. 로딩 문구는 `…`(말줄임표 문자).
- **반응형**: 모든 페이지는 모바일에서도 최적화돼야 함. 데스크탑(`sm:`+)은 유지하고 모바일만 보강 (자세한 규칙은 「📱 반응형 / 모바일 최적화」 참고).
- **Documentation**: `CLAUDE.md`·`.claude/rules/*.md` 및 `AGENTS.md`를 항상 최신 상태로 유지(기능별 내용은 해당 rules 파일에). — 외부 서비스 정보, 진행 상황, 결정 사항이 바뀌면 즉시 반영
