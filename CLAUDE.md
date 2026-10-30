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

### 프로젝트 등록 폼 UX (`src/components/projects/project-form.tsx`)
- **프로그램 종류 선택**: `<Select>` 드롭다운 대신 다른 항목들과 동일한 **카드 그리드 UI** (다중 선택, 최소 1개). 5개 항목, 2~3열 배치. 저장 시 `PROJECT_TYPES` 순서로 정렬.
- **플랫폼 자동 선택**: `types`에 `website`가 포함되면 `useEffect`로 모든 플랫폼을 자동 선택하고 카드를 비활성화(`pointer-events-none`). "웹사이트는 모든 플랫폼의 브라우저에서 열 수 있어서 전체 플랫폼이 자동으로 선택돼요." 안내 표시. 웹사이트를 빼면 잠금 해제. `app`이 포함되면 플랫폼 1개 이상 필수.
- 플랫폼 힌트 문구(웹사이트 제외)는 제거됨 — 사용자가 직접 선택.
- **아이콘 link 모드**: `ImageUploadInput` 컴포넌트 사용 — 파일 드래그·선택 업로드 + URL 직접 입력 폴백. 업로드된 이미지는 Cloudinary에 자동 저장.
- **키보드 접근성**: 카드 그리드 UI(`div` 기반)에 `tabIndex={0}` · `role="button"` · `onKeyDown`(Enter/Space) · `focus-visible:ring-2` 적용. Tab 키로 모든 카드 포커스 이동, Enter/Space로 선택 가능. 웹사이트 타입 선택 시 비활성화된 플랫폼 카드는 `tabIndex={-1}`로 Tab 순서에서 제외.
- **상세 설명 마크다운 에디터**: `<Textarea>` 대신 작성 / 분할 / 미리보기 3탭 UI. Tab 키 두 칸 들여쓰기(Shift+Tab으로 해제) 지원. `Markdown` 컴포넌트로 실시간 미리보기.
- **저장 안 한 변경 이탈 경고**(2026-10-25 사용자 요청): 등록·수정 중 값이 처음과 달라지면(`formSnapshot`을 첫 렌더 값과 비교 — 배열은 정렬해 순서 차이 무시) `useUnsavedWarning`(`src/lib/use-unsaved-warning.ts`)이 켜진다. 새로고침·탭 닫기·바깥 사이트는 `beforeunload`(브라우저 기본 경고), 사이트 안 링크(헤더·로고 등 클라이언트 이동)는 `beforeunload`가 안 떠서 document 캡처 단계에서 `<a>` 클릭을 가로채 `window.confirm`. 뒤로 가기(popstate)는 막지 않는다. 저장·삭제 성공 뒤 `router.push` 직전에 `allowLeave()`로 경고를 끈다. 같은 틀을 다른 폼에 쓰려면 이 훅에 `dirty`만 넘기면 됨(가이드 위키 편집기는 자체 구현 유지). 한계: 팀원에 본인이 없는 팀 프로젝트는 열자마자 본인 자동 추가 이펙트가 값을 바꿔 경고가 켜질 수 있다(웹사이트 전체 플랫폼·비공개 소스 라이선스 비우기는 첫 값에서 처리하고, 비공개 팀의 팀원은 접근 허용 목록에 화면·저장 때만 합쳐서 경고를 켜지 않는다 — 2026-10-26).
- **GitHub README 가져오기**(2026-10-24): 상세 설명 카드 맨 위에 "GitHub에서 가져오기" 줄 — 저장소 링크 입력 + "README 가져오기" 버튼(Enter도 동작). `GET /api/github-readme?url=`(로그인 필요, 라우트 `src/app/api/github-readme/route.ts`)이 GitHub API `/repos/{o}/{r}/readme`를 부르고, 한도(403/429)·실패면 `raw.githubusercontent.com/.../HEAD/README.md` 계열로 대체. 호스트가 고정이고 owner/repo를 정규식으로 제한해서 SSRF 가드는 쓰지 않음. 변환·파싱 순수 로직은 `src/lib/github-readme.ts`(테스트 `github-readme.test.ts`): 상대 이미지·링크를 `raw.githubusercontent.com`/`github.com/.../blob/HEAD/` 절대 주소로, `Markdown` 컴포넌트가 raw HTML을 못 그리므로 `<img>`·`<a>`·`<h1~6>`·`<br>` 등을 마크다운으로 바꾸고 나머지 태그는 제거(코드 블록·인라인 코드 안은 그대로), 길이 제한 없이 전부 가져옴(2026-10-25 사용자 요청 — 예전엔 3만 자에서 자름). 이미 쓴 설명이 있으면 shadcn `Dialog`로 덮어쓰기 확인. 입력칸은 아래 "저장소 링크"와 같은 `repoUrl` 상태를 공유. 비공개 저장소·`.rst` 등 비마크다운 README는 오류 안내. 선택 환경변수 `GITHUB_TOKEN`(없어도 동작 — API 한도는 IP당 시간당 60회, 있으면 한도 완화).
  - **README 자동 동기화**(2026-10-24): 같은 줄 아래 `ToggleChip` "README와 자동 동기화". **"README 가져오기"가 성공하면 소스코드가 `open`일 때 자동으로 켜진다**(2026-10-25 사용자 요청 — 기본값 켜짐; 덮어쓰기 확인 취소·실패면 꺼 둔 채, 사용자가 칩을 꺼도 다시 가져오면 또 켜짐). 칩을 직접 눌러 켜는 것도 같은 가져오기 흐름. 켜져 있으면 상세 설명 칸은 읽기 전용(다음 동기화가 덮어쓰므로)이고, 소스코드가 `closed`면 칩이 잠기고 저장 시 `readme_sync=false`.
  - DB: `projects.readme_sync`(기본 false)·`readme_etag`·`readme_synced_at` + CHECK `projects_readme_sync_needs_repo`(동기화는 `source_type='open'` + `repo_url` 필수). `docs/20-supabase-projects-readme-sync.sql` — 운영에는 `supabase/migrations/20261024140000_projects_readme_sync.sql`로 `supabase db push` 적용 완료.
  - 실행: `.github/workflows/sync-readmes.yml`이 **매일 03:00 KST**(UTC 18:00 cron, 수동 `workflow_dispatch` + `dry_run` 입력)에 `scripts/sync-readmes.mts`를 돌린다. 서비스 롤 키로 `readme_sync=true` 프로젝트를 읽고 GitHub API를 `If-None-Match`(저장한 ETag)로 불러 304면 건너뜀, 바뀌었으면 `description`·`readme_etag`·`readme_synced_at` 갱신. 판단 로직은 `src/lib/readme-sync.ts`(테스트 `readme-sync.test.ts`, 네트워크는 주입). 빈 README로 설명을 지우지 않고, 실패가 하나라도 있으면 exit 1(Actions가 빨갛게 → 메일 알림), 호출 한도(403/429)면 그 자리에서 멈추고 다음 날 이어서. Actions 내장 `GITHUB_TOKEN`을 써서 한도 걱정 없음.
  - ⚠️ **GitHub 저장소 Secrets 필요**: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. 워크플로는 `schedule`·`workflow_dispatch`에서만 돈다(PR에서 안 돌아 키 노출 없음). 공개 저장소는 60일간 활동이 없으면 예약 실행이 자동 중지됨. **저장소가 PUBLIC이라 Actions 로그도 공개** — 스크립트는 비공개 프로젝트 제목을 찍지 않고 `비공개 프로젝트 <id 앞 8자>`로만 표시(새 로그를 추가할 때도 지킬 것).
  - 로컬 점검: `node scripts/sync-readmes.mts --dry-run`(`.env.local` 사용, DB 안 바꿈).
- **GitHub 라이선스 자동 채우기**(2026-10-25 사용자 요청 — 등록할 때 라이선스를 다시 확인하기 귀찮아서): "소스코드·라이선스" 카드의 저장소 링크 입력칸을 벗어날 때(또는 "README 가져오기" 성공 뒤) 소스코드가 `open`이면 `GET /api/github-license?url=`(로그인 필요, `src/app/api/github-license/route.ts`)이 `/repos/{o}/{r}/license`로 라이선스를 알아내고 `/licenses/{key}`의 `permissions`를 칩에 맞춘다. 순수 로직 `src/lib/github-license.ts`(테스트 `github-license.test.ts`): `commercial-use→commercial`·`modifications→modify`·`distribution→distribute`·`private-use→private` 4개만 켜고, **법적 책임·보증은 GitHub가 `limitations`로만 분류하므로 켜지 않는다**(상세 페이지에 "제한"으로 나옴). 라이선스 파일 없음(404)·`other`/`NOASSERTION`(예: 예외 조항 붙은 GPL)·한도(403/429)면 칩은 그대로 두고 칩 아래에 "직접 골라 주세요" 안내(rose). 성공하면 "MIT License: GitHub 정보로 채웠어요…" 한 줄. **덮어쓰기 규칙**: 폼의 `licenseOriginRef`가 `user`(수정 화면에서 값이 이미 있거나 칩·기타를 직접 건드림)면 가져오지 않고, `auto`(우리가 채운 값)면 다른 저장소로 바뀔 때 다시 채운다. 같은 저장소는 한 번만(`licenseRepoRef`, 수정 화면은 원래 저장소를 미리 넣어 둠), 한도·서버 오류는 재시도 가능. DB 변경 없음 — 칩 값(`license_features`)만 저장하고 라이선스 이름(MIT 등)은 저장·표시하지 않는다. `GITHUB_TOKEN`이 있으면 README 가져오기와 같이 한도가 완화됨(요청 한 번에 GitHub API 2번 호출).
- **등록 직후 도메인 마련하기 권유**(2026-10-26 사용자 요청): 새 등록(수정 아님)이 성공했고 종류에 웹사이트가 있으며 방문 주소가 `detectHost()`로 잡히는 호스트 무료 주소(.vercel.app·.netlify.app·.pages.dev·.github.io·.gitlab.io·.onrender.com·.up.railway.app + 바로가기 호스트 .workers.dev·.web.app·.firebaseapp.com — `HOST_PRESETS`에 있는 9개)면, 프로젝트 페이지로 가기 전에 `Dialog` "등록했어요! 짧은 주소도 받을까요?"가 뜬다. "도메인 마련하기"(teal) → `/domains?project=<id>`, "나중에"·Esc → 원래대로 `/projects/<id>`(창을 닫아도 폼에 남지 않음 — 이미 저장돼서 다시 누르면 중복 등록). 비공개로 등록했거나 살아 있는 주소가 이미 3개면(브라우저 클라이언트로 `subdomains` count, RLS 본인 SELECT) 묻지 않는다. 프리셋에 없는 호스트(Surge 등)는 묻지 않음 — 2026-10-26 바로가기 주소로 workers.dev·Firebase가 `HOST_PRESETS`에 들어가 자동 포함됐다.
- **프로필에 GitHub 추가 권유**(2026-10-26 사용자 요청): 새 등록(수정 아님)·작성자 형태 `individual`·소스코드 `open`이고 내 프로필 연락처(`users.contacts`)에 GitHub가 없을 때, 저장소 링크 칸을 벗어나거나 "README 가져오기"가 성공하면 저장소 링크 칸 바로 아래에 "프로필에도 GitHub를 추가할까요?"(`github.com/<owner>`) 상자가 뜬다. "추가하기"는 서버 액션 `addGithubToProfile(repoUrl)`(`src/lib/profile/actions.ts`, `(nav)` 밖)이 `parseGithubRepo`로 owner를 뽑아 `{ type: 'github', value: owner }`를 연락처 끝에 더한다 — 폼에서 이동하지 않고 그 자리에서 "프로필에 GitHub를 추가했어요" 한 줄로 바뀐다(사용자 결정). 같은 아이디가 이미 있으면 그대로 성공, 연락처 8개(`updateProfile`과 같은 한도)면 거절. "괜찮아요"는 이 화면에서 다시 안 묻는다. 저장소 owner가 조직이어도 그대로 물어본다(사용자가 고름). 팀으로 바꾸면 상자가 사라진다. DB 변경 없음(RLS 본인 UPDATE).
- **팀 프로젝트 팀원 관리**:
  - 이메일 입력 시 `@ts.hs.kr` 도메인 확인 후 `users` 테이블에서 **실제 가입 여부를 검증** (미가입이면 "가입되지 않은 사용자입니다." 에러).
  - `authorRole === 'team'` 전환 시 `useEffect`로 현재 로그인 사용자를 자동 추가. 자신은 X 버튼이 없어 삭제 불가.
  - 편집 모드 진입 시 기존 `team_members` 이메일로 프로필을 일괄 로드.
  - 팀원 목록 표시: 이메일 pill → **아바타 + 닉네임/실명 + 이메일 세로 카드** 형태.

### 프로젝트 상세 (`src/app/(nav)/projects/[id]/(detail)/page.tsx`)
- **머리(2026-10-24)**: "← 모든 프로젝트" → 아이콘 **스티커 112px**(모바일 72px, `ring-[3px]` + 그림자) + 종류 배지·태그 → h1(Plex) → 한 줄 설명 → 작성자 줄("· 개인/팀 프로젝트 · 등록일") → 알약 버튼(방문 blue / GitHub 보조 / 수정 ghost).
- **수치 띠** `StatStrip`(`src/components/projects/stat-strip.tsx`): 별점(리뷰 0이면 "–"/"아직 리뷰가 없어요") · 방문(`url` 없으면 칸 생략 → 3칸) · 플랫폼(웹사이트+전체면 "Web / 모든 브라우저") · 소스코드("허용 N개"). 모바일 2열.
- **본문**: `ReadingSurface`(마크다운) + 사이드 카드 3개 — 개발자(또는 팀+팀원), 라이선스(허용/제한), 정보(종류·플랫폼·공개 여부·등록일·최근 수정). 옛 "환경 및 플랫폼" 카드는 정보 카드로 합쳐짐.
- **리뷰**: 카드 바깥 제목 "리뷰 N"(Plex) → 작성 폼 카드(별점 선택은 머리 오른쪽, 버튼 "리뷰 남기기") → 리뷰마다 카드.

### 프로젝트 상세 팀 정보
- `author_role === 'team'`이면 `team_members` 이메일 배열로 `users` 테이블을 `.in('email', ...)` 쿼리해 프로필 일괄 조회.
- 팀원 표시: 이메일 chip → **아바타 + 닉네임 세로 목록**. 각 항목은 `/developers/[id]` 로 링크됨.
- `EditButton`에 `teamMembers` prop 전달 — 팀원에게도 "수정하기" 버튼 노출.
- **상세 설명 렌더링**: `project.description`을 `Markdown` 컴포넌트로 렌더링 (기존 `split('\\n')` 방식 대체).

### 프로젝트 카드 UI (`src/components/projects/project-card.tsx`)
- **플랫폼 표시**: 작은 둥근 칩 형태(`rounded-full bg-zinc-100`). `PLATFORMS` 상수에서 value → label 변환 후 전체 표시.
- **종류 배지**: `projectTypeLabels(types, true)`(`src/lib/constants.ts`, 짧은 이름)로 종류마다 배지 하나씩. 카드·홈 카드·상세 머리·정보 카드 공통.
- **웹사이트 + 전체 플랫폼**: `types`에 `website`가 있고 모든 플랫폼이 선택된 경우 카드에서는 "Web" 하나만 표시 (DB 실제 값은 유지).
- **아이콘**: `mt-[5px]`로 텍스트 영역보다 5px 아래에 위치.
- **별점/리뷰 수**: 쿼리에 `reviews(rating)` 포함 시 플랫폼 칩 옆에 평균 별점(`Star` 아이콘 + 소수 1자리)과 리뷰 수(`MessageSquare` 아이콘)를 작게 표시. rating=null 리뷰는 별점 평균 계산에서 제외.

### 익명 프로젝트 (2026-10-31 사용자 요청)
- 등록·수정 폼 "만든 사람"이 개인 / 팀 / **익명** 3칸. 익명은 팀 이름·팀원 없음(DB CHECK `projects_anonymous_no_team`). 수정 화면에서 팀원(소유자 아님)은 익명으로 못 바꾼다(화면만).
- 사용자 결정: 소유자는 DB(`author_id`)에 그대로, 남에게는 **모든 프로젝트 목록·상세·홈에 '익명'(`ANONYMOUS_AUTHOR`)으로만** 보이고 **프로필 목록·작성자 이름 검색·작성자 링크에는 절대 안 나온다** — 화면만이 아니라 **DB에서 막는다**(migration `20261031100000_projects_anonymous.sql`).
  - `projects.author_id`는 anon/authenticated가 **읽을 수 없다**(칸 단위 GRANT). `select('*')`도 막히므로 사용자 키로는 칸을 적어 읽는다 — 상세·수정은 `PROJECT_COLUMNS`(`src/lib/projects/columns.ts`). **projects에 새 칸을 만들면 migration에서 `GRANT SELECT (새 칸) ON public.projects TO anon, authenticated`와 `PROJECT_COLUMNS` 추가 필수.** 서비스 키·SECURITY DEFINER 함수는 그대로 `author_id`를 쓴다.
  - 화면의 작성자는 자동 계산 칸 `public_author_id`(익명이면 NULL)로만: 링크 `/developers/<public_author_id>`, 사용자 붙이기는 **`users!projects_public_author_id_fkey(...)`**(관계가 둘이라 이름 필수 — 그냥 `users(...)`는 PGRST201).
  - 내 프로젝트(익명 포함)는 `rpc('my_project_ids')`(본인 것만, authenticated 전용) — 수정 페이지 소유자 판정, 상세 "수정하기"(이제 서버에서 판단, `EditButton`은 링크만), 본인 프로필 목록(익명도 '익명'으로 보임), `/domains` 목록.
  - reviews 조회 정책은 다른 표의 `author_id`를 읽으면 권한 오류라 `EXISTS (SELECT 1 FROM projects WHERE id = project_id)`(= projects RLS에 맡김)로 바꿈.
  - 해줘 "구현완료" 연결은 익명 프로젝트를 받지 않고(`public_author_id = 나`만), 연결 뒤 익명으로 바꾼 프로젝트는 해줘 목록·상세에서 숨긴다(글쓴이 = 만든 사람이라 익명이 풀림).
  - 한계: 설명·저장소 링크(GitHub 아이디)·사이트 내용으로는 알 수 있음(폼 안내 문구). 개발자 계정도 화면에서는 '익명'으로 본다(DB에서 확인).

### 팀 프로젝트 수정 권한
- **팀원도 프로젝트 수정 가능**: `team_members` 배열에 이메일이 있는 사용자는 수정 페이지 접근·저장 가능.
- **되돌리기 어려운 작업은 프로젝트 이름 입력**(2026-10-27 사용자 요청): 프로젝트 삭제·비공개 전환으로 주소 반납·"주소 닫기"(수정 폼)와 `/domains`의 "이 주소 반납하기" 확인 창에 `ConfirmNameInput`(`src/components/shared/confirm-name-input.tsx`) — 저장된 프로젝트 이름을 똑같이 적어야(앞뒤 공백만 무시, `nameMatches` `src/lib/confirm-name.ts`) 버튼이 켜진다. `deleteProject(id, confirmTitle)`은 서버에서도 이름을 다시 확인, 반납·주소 닫기는 화면에서만 막는다.
- **삭제는 소유자(author)·개발자 계정만 가능**: `edit/page.tsx`에서 `isAuthor` 여부를 계산해 `ProjectForm`에 `canDelete` prop으로 전달. 팀원(`canDelete=false`)에게는 "위험 구역" 섹션 미노출.
- RLS(`projects_update_own`)가 `author_id = uid OR email = ANY(team_members)` 조건으로 DB 레벨에서도 팀원 UPDATE를 허용.

---

## 🧭 바이브 코딩 가이드 (`/guide`)

만들고 싶은 것에 맞춰 "AI한테 일 시키는 법 → 만들고 돌려 보기 → 인터넷에 올리기 → 이 사이트에 등록"을 한 단계씩 안내하는 기능. 2026-10-24 전면 재작성 — 설계 `docs/superpowers/specs/2026-10-24-guide-rewrite-design.md`.
- **왜 이렇게 생겼나**(사용자): 학생들은 설치는 하지만 ① 채팅이 아니라 에이전트로 들어가기(예: Claude 앱의 Chat 탭에서 만지작거림 — Code 탭으로 가야 함) ② 인터넷에 올리기(GitHub·Vercel·Supabase)에서 막힌다. "이거부터 이렇게 하면 돼"라고 정해 주면 해낸다. 그래서 설치 매뉴얼식·조합별 복붙·선택지 나열 금지, 추천 경로 하나 + 됐다는 신호.

### 위저드 (`src/components/guide/guide-wizard.tsx`, 질문 정의 `src/lib/guide.ts` `GUIDE_STEPS`)
- 질문: **뭘 만들어요(website/app/extension/tool) → (앱이면) 플랫폼(android/apple/mac/windows) → (웹사이트면) 로그인·저장(yes/no/unsure) → AI(claude/chatgpt/gemini/none) → 컴퓨터(windows/mac)**. 터미널 질문·Linux 없음. 옵션 값은 `src/lib/constants.ts` `GUIDE_*`.
- 잠금: apple·mac 앱 → Windows 잠금(Xcode), windows 앱 → Mac 잠금(.NET/WPF). 데스크톱 앱 기술은 Mac=SwiftUI, Windows=C#/.NET WPF.
- `ai=none` → ChatGPT(Codex) 조각으로 추천. Gemini는 옵션에 "만 18세 이상" 표기(Antigravity 연령 제한) + 1장에서 ChatGPT로 바꾸는 링크.
- 동작: 답 스택으로 "이전", "질문 N" 알약, 고른 답 칩, 질문 바뀌면 h2로 포커스. 다 답하면 `/guide/<보이는 답 '/' 연결>`. 홈 `GuideTeaser`의 `/guide?type=`은 `initialType`으로 1번 질문을 미리 답함.
- 가이드 페이지 머리: 흰 바탕 + `.paper-grid` 가운데 스택(purple-600 `BookOpen` 타일 → Plex 제목 → 설명, 모바일은 설명 숨김). 하위 페이지 톤 계획서(Task 9 Step 7)에서 가이드는 빠지고 이 재작성이 직접 반영.

### 결과 스테퍼 (`src/app/(nav)/guide/[...slug]/page.tsx` + `src/components/guide/guide-viewer.tsx`)
- **한 화면에 단계 하나**, 버튼으로 넘김(문서처럼 스크롤 금지 — 사용자 결정). 위 진행 막대 = 장 4칸(누르면 그 장 첫 단계), 장 이름 줄 "N장 · 이름 — i / n", 새 장 첫 단계에 "○○ 끝! 이제 ○○ 차례예요." 띠, 카드 머리 "N-i" 번호 + (3장) 경로 알약 줄, 주 버튼 문구는 단계의 `[!next]`(없으면 "다음"/"N장으로"). 마지막 단계에 "내 프로젝트 등록하기"·"해줘! 둘러보기" 고정 버튼(위키로 편집 안 되게 코드에 둠).
- 진행은 `localStorage['guide-progress:<경로>']`(useSyncExternalStore로 복원, 범위 밖이면 0). 옛 슬러그·잘못된 주소는 `redirect('/guide')`.
- 단계 바뀌면 새 h2로 포커스, 카드가 화면 위로 벗어나 있으면 카드 머리로 스크롤.

### 콘텐츠 = 조각 (`src/content/guides/<key>.md`, 작성법 `src/content/guides/README.md`)
- 장 4개 = 조각 18개: `agent-{claude,chatgpt,gemini}` · `build-{website,extension,tool,app-android,app-apple,app-mac,app-windows}` · `ship-{website,website-data,extension,app-android,app-apple,app-desktop,tool}` · `register`. 답 → 조각 매핑은 `planGuide()`, 표시 이름은 `FRAGMENT_TITLES`. 여러 조합이 같은 조각을 공유하고, OS·데이터 차이는 파일을 나누지 않고 `[!only]` 블록으로.
- 형식: `---` 한 줄로 단계 구분, 모든 단계는 `## 제목`으로 시작, `#` 제목·frontmatter·HTML 없음.
- 표기(`src/lib/guide-markup.ts`): `> [!say]`(AI에게 보낼 문장+복사), `> [!ok]`(됐다는 신호), `> [!warn]`, `> [!more] 요약`(접힘), `> [!only os=mac data=no,unsure]`(조건), `> [!next] 문구`, `> [!route] 칸`, 링크 `[글](guide:ai=chatgpt)`(답 하나만 바꾼 가이드, 막힌 조합이면 글자만).
- 렌더러 `GuideStepBody({ body, answers?, aiLabel?, hideTitle? })`(`src/components/guide/guide-step-body.tsx`, 클라이언트 가능). `answers` 없으면(편집기 미리보기) `[!only]`를 "조건: …" 점선 상자로 다 보여 줌.
- **설치 링크 규칙**: 앱/도구 설치 안내 시 "앱스토어에서 검색 후 설치" 식의 텍스트 대신 **반드시 직접 링크**를 제공한다. 주요 링크:
  - Xcode: `[Mac App Store](https://apps.apple.com/us/app/xcode/id497799835?l=ko&mt=12)`
  - Windows Terminal: `[Microsoft Store](https://aka.ms/terminal)`
  - Android Studio: `[developer.android.com/studio](https://developer.android.com/studio)`
- **Claude Code(macOS) 설치 블록 표준**: Homebrew 미설치 환경을 고려해 `brew` 명령 사용 금지. 모든 macOS 가이드에서 아래 블록을 동일하게 사용한다(`[!more] 터미널이 편하면` 안).
  ```bash
  # Node.js가 없다면 먼저 설치
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  source ~/.zshrc
  nvm install --lts && nvm use --lts

  # Claude Code 설치
  npm install -g @anthropic-ai/claude-code
  ```

### 가이드 위키식 편집 (`/guide-wiki/[key]/…`, 2026-10-24)
- 설계: `docs/superpowers/specs/2026-10-24-guide-wiki-editing-design.md`, 시안 https://claude.ai/artifact/7Wh7o1TxSvSjf24CK1K3zc (편집기 = 2-B 카드 세로 스택 + 미리보기).
- **누구나 수정**: 로그인한 `@ts.hs.kr` 사용자 누구나 가이드 조각을 고치고 즉시 반영. 관리자 잠금·승인 없음 — 장난 수정은 다른 학생이 되돌린다(사용자 결정).
- **버전**: `public.guide_revisions`(`docs/18-supabase-guide-revisions.sql`, 운영 적용 완료 — migration `20261024120000`·`20261024130000`). 버전은 쓰면 안 바뀐다(RLS SELECT만, 쓰기 정책 없음). 저장은 `save_guide_revision` 함수로만, **EXECUTE는 `service_role` 전용** — 서버 액션(`src/lib/guide-wiki/actions.ts`)이 `getUser()` 확인 후 `createAdminClient()`로 부른다. 작성자 이메일은 `author_email`에 스냅샷.
- ⚠️ `docs/18`은 DROP TABLE을 포함하므로 운영 DB에 다시 실행 금지. 함수 수정은 새 migration으로. 동작 확인은 `docs/18-supabase-guide-revisions-verify.sql`(항상 롤백).
- **원본과 버전 번호**: DB 기록이 없으면 저장소 원본을 버전 0으로 보여 주고, 첫 저장 때 원본을 버전 1(`kind='seed'`)로 남긴 뒤 수정본이 버전 2. 되돌리기는 옛 내용을 새 버전(`kind='revert'`)으로 저장, 원본 가져오기는 `kind='sync'`. 저장소 원본이 바뀌어도 DB 최신이 이기고, 안내 띠로 "원본 가져오기"를 제안.
- **충돌**: 저장 시 `baseRev`가 최신과 다르면 `{ conflict }` — 편집 내용은 유지하고 바뀐 점 보기 / 내 내용으로 저장 선택.
- **화면**: `edit`(보호, 카드 스택·작성/나란히/미리보기·전체 미리보기·하단 저장 바·요약 필수), `history`(작성자·요약·글자 수·"버전 K로 되돌림"/"버전 R에서 되돌려짐" 칩·되돌리기 Dialog), `diff?from&to`(단계 단위 + 줄 diff, `?source=1`은 최신 vs 저장소 원본), `rev/[n]`(옛 버전 보기). 모두 `force-dynamic`.
- **가이드 연결점**: 가이드 조각(`src/content/guides/<key>.md`)과는 `src/lib/guide-wiki/source.ts` 한 파일로만 닿는다 — `loadSourceDoc` = `getFragment`, `listUsages` = `guide-content.ts`의 역색인 (개발에서는 `dev-sample` 조각도 추가). `loadGuide`는 장마다 `getLatestDoc(key)`(DB 최신 ?? 원본)와 `getDocMeta(key)`를 읽고, 결과 화면의 `GuideChapterTools`가 장 이름 줄 오른쪽에 "고치기"(`/guide-wiki/<key>/edit?from=<현재 경로>`)·"기록" 링크와 "마지막 수정" 정보를 단다. 단계 본문 렌더는 `src/components/guide-wiki/step-body.tsx` → `GuideStepBody`(answers 없이 → `[!only]`는 조건 상자로 다 보임).
- 순수 로직(`steps`·`diff`·`params`·`schema`·`format`·편집기 `reducer`)은 상대 `.ts` import만 쓰고 `npm test`(`node --test`)로 검증.

---

## 📝 개발 팁 블로그 (`/tips`)
- **목록** `/tips`(`revalidate=30`): 카드 그리드(커버·태그·작성자·좋아요/댓글 수·상대시간). 머리 버튼은 "팁 작성" 하나, 머리 아래 도구줄에 커뮤니티 탭(개발 팁 | 해줘!) + 팁 개수.
- **작성** `/tips/new` · **수정** `/tips/[id]/edit`: 페이지는 `PageHero variant="compact"`(타일 + 제목만). `TipEditor`(`src/components/tips/tip-editor.tsx`) — 카드 2장: ① 큰 밑줄 제목 입력(`TITLE_INPUT_CLASS`) + 2열(한 줄 요약/태그) + 대표 이미지, ② 본문(`EditorTabs` 작성/분할/미리보기, Tab 들여쓰기). 제출 버튼은 섹션 색(`SECTION_COLORS.tips.button`) "팁 발행"/"저장". 둘 다 보호 라우트(미들웨어). 수정은 작성자만. 공지 작성(`AnnouncementEditor`)도 같은 틀 — 카드 ① 맨 위에 카테고리 카드 선택(단일 선택이라 sky 유지).
- **상세** `/tips/[id]`(`revalidate=30`): 글 레이아웃 — `ArticleHeader`("← 개발 팁" 줄 + 태그 + h1 + 요약 + 작성자 줄) → 커버 16:9 → `ReadingSurface`(마크다운, 하단에 `TipLikeButton` 알약 + "도움이 됐다면 눌러 주세요") → `TipComments`(카드 없이 "댓글 N" 제목 + 행 목록). 작성자에게만 수정/삭제 노출(`TipOwnerActions`). 팁·해줘·공지 상세가 같은 틀을 쓴다.
- 서버 액션: **`src/lib/tips/actions.ts`**(`createTip`/`updateTip`/`deleteTip`). 라우트 그룹 밖에 위치 — `(nav)` 경로에 두면 Turbopack에서 client→server action 바인딩이 깨지는 문제 있음.
- 팁 작성 필수 필드: 제목, **한 줄 요약(최대 30자)**, **대표 이미지 (파일 업로드 또는 URL)**, 본문.
- 삭제 확인창은 `window.confirm` 대신 shadcn `Dialog` 컴포넌트 사용(팁 삭제·댓글 삭제 모두).
- Supabase join 시 `users` 테이블 관계가 모호하면 PGRST201 오류 발생 → `author:users!tips_author_id_fkey(...)` 처럼 **FK 이름을 명시**해야 함.
- 마크다운 렌더 공용 컴포넌트: `src/components/shared/markdown.tsx`(팁·가이드 공유). `table`/`thead`/`tbody`/`tr`/`th`/`td` 커스텀 컴포넌트로 표 테두리·구분선·헤더 배경 스타일 적용(다크모드 포함). 바깥 테두리는 `rounded-xl` 컨테이너로 감싸 오버플로우 처리.
- **상세 페이지 작성자 링크**: `/tips/[id]`에서 작성자 아바타+이름 영역을 `<Link href="/developers/[author_id]">` 로 감쌈 — 클릭 시 프로필 페이지 이동.

---

## 🔎 탐색/검색 (`/explore`)
- `src/components/explore/explore-client.tsx`: 클라이언트 측 필터링.
- 검색 대상: 프로젝트 제목·설명·태그(`features`) + **작성자 닉네임·실명·팀 이름**.
- **머리(2026-10-24 톤 통일)**: `PageHero`(section=explore, `maxWidth="lg"`) 안에 큰 검색창(`rounded-full`, 최대 640px)이 들어간다 — 이 페이지의 히어로. 검색창은 `ExploreClient`가 렌더(상태 공유).
- **사이드바 필터** (데스크탑, `md:` 이상): **프로그램 종류 → 카테고리 → 플랫폼** 접이식 3그룹(다중 선택). 체크박스 없이 아이콘+라벨 토글 버튼으로 구성. 선택 시 파란 배경+파란 텍스트로 강조. 컨테이너는 `max-w-6xl`(사이드바 224px + 카드 **최대 2열**).
  - `aside` 자체에 `sticky top-24 self-start` 적용 — `self-start`가 없으면 flex 컨테이너 높이를 따라 늘어나 필터 적용 시 프로젝트 수가 줄어들 때 사이드바 위치가 흔들리는 버그 발생.
  - 아이콘 매핑은 `src/lib/type-icons.ts`(`TYPE_ICONS`·`PLATFORM_ICONS`·`CATEGORY_ICONS`) — 해줘 카드·등록 폼·위저드와 공유.
- **모바일 필터**(`src/components/explore/mobile-filter-bar.tsx`): 머리 아래 `sticky` 가로 스크롤 바 — [종류 ▾][카테고리 ▾][플랫폼 ▾] 드롭다운 알약 + 선택된 값은 파란 칩(× 해제) + 오른쪽 정렬. 드롭다운은 `absolute top-full` 패널(바깥 클릭·Esc로 닫힘, `aria-expanded`). 결과 줄은 "N개 · 필터 적용" + 정렬(데스크탑).
- 헤더 우측 버튼은 제거됨 — 전역 `PageNav`로 이동.
- 로그인 페이지(`/login`) 뒤로가기 링크는 `/`가 아닌 `/explore`로 이동.

---

## 🌐 도메인 마련하기 — 서브도메인 빌려주기 (`/domains`, 2026-10-25)

웹사이트 프로젝트 소유자가 `<이름>.dshs.dev`를 받아 자기 호스트(Vercel·Netlify·GitHub Pages·Render)에 연결한다. 우리는 서버를 빌려주지 않고 Cloudflare에 **CNAME(+필요하면 TXT)만** 만든다. 설계 `docs/superpowers/specs/2026-10-25-subdomain-lending-design.md`, 계획 `docs/superpowers/plans/2026-10-25-subdomain-lending.md`, 시안 B(내 프로젝트 줄마다 "도메인 마련하기" → 그 자리에서 3단계).
- **이름**(2026-10-25 사용자 요청 — "내 집 마련" 느낌): 화면에 보이는 기능 이름·내비 칸·버튼은 **"도메인 마련하기"**(처음엔 "주소 받기"). 안쪽 설명·단계 안내는 쉬운 말 "주소"를 그대로 쓴다. 옛 설계·계획 문서(`docs/superpowers/`)와 migration·`docs/22` 주석에는 옛 이름이 남아 있다(적용된 기록이라 안 고침).
- **사용자 결정**: 등록된 웹사이트 프로젝트에만, 프로젝트당 1개·**계정당 3개**, 신청·연결·반납은 **소유자만**(팀원 불가), 관리자 **강제 회수**, 이름은 자유·선착순, 연결돼도 방문 주소는 자동으로 안 바꾸고 **제안 띠 + "바꾸기"**, 비로그인은 로그인 화면으로, **소유 확인 토큰 필수**(아래), 권한은 "매우 엄격하게".
- **이름 문구·내 도메인 표시**(2026-10-26 사용자 요청): ① `xn--`로 시작하는 이름(한글 등을 바꾼 punycode — 모양 비슷한 글자로 공식 주소를 흉내 낼 수 있어 계속 막음)은 `validateName`이 `reserved`가 아닌 `idn`으로 돌려주고 "한글 같은 영어가 아닌 이름(xn--로 시작)은 아직 쓸 수 없어요…"로 안내한다(예전엔 "사이트에서 쓰려고 남겨 둔 이름"으로 보여 헷갈림). DB 함수는 둘을 구분하지 않으므로 `name_reserved` 문구는 두 경우를 함께 적음. ② 내 웹사이트 프로젝트의 방문 주소가 호스트 기본 주소가 아니라 이미 내 도메인(예: `https://dshs.dev`)이면 `DomainList` 줄에 teal 알약 "내 도메인 사용 중"(`customDomainOf`, `src/lib/domains/hosts.ts`)이 붙는다 — 도메인 마련하기로 받은 주소가 있는 줄·`*.dshs.dev`·localhost·IP·프리셋/`OTHER_DEFAULT_HOST_SUFFIXES`(workers.dev·web.app 등) 호스트 기본 주소는 제외. 모르는 무료 호스트는 내 도메인으로 잘못 표시될 수 있다(목록에 추가). **알약이 붙은 줄은 "도메인 마련하기" 버튼을 숨기고 알약만 둔다**(2026-10-26 사용자 요청 — 이미 도메인을 쓰는데 새 주소를 또 받으라는 건 어색함). 방문 주소가 도메인 마련하기로 받지 않은 `*.dshs.dev`(직접 DNS를 만든 `xn--…dshs.dev` 등)여도 `dshsAddressOf`(`hosts.ts`)가 잡아 같은 알약·버튼 숨김. 받은 주소가 있는 줄은 그대로 "관리".
- **확인 먼저, 연결은 그다음**(2026-10-26 사용자 요청 — 3단계 연결 확인을 안 했는데도 주소가 그냥 열려서 확인 없이 쓰고 있었음): 단계 순서가 **① 이름 → ② 내 사이트에 확인 코드 넣기 → ③ 호스트에 연결하기**. CNAME이 DNS only라 요청이 우리를 안 거쳐서 헤더·경고를 끼울 수 없으므로, **확인 전에는 진짜 연결을 만들지 않는다**. 설계 `docs/superpowers/specs/2026-10-26-domain-verify-first-design.md`, 계획 `docs/superpowers/plans/2026-10-26-domain-verify-first.md`.
  - ① 예약 직후 **자리표시**(`createPlaceholder`, `activate.ts`): proxied AAAA + Bulk Redirect `<이름>.dshs.dev/` → `https://dshs.dev/pending-domain/<이름>`(경로·쿼리 안 붙임, 302). 경고 페이지 `src/app/(nav)/pending-domain/[name]/page.tsx`는 공개·noindex·DB 안 읽음(주인·프로젝트 안 드러냄). 최선 노력 — 못 만들면 주소가 DNS부터 안 풀릴 뿐. id는 `cf_record_ids`에(`subdomain_set_placeholder_records`), 반납·③ 연결 때 같이 지워짐.
  - ② "내 사이트 원래 주소"(프로젝트 방문 주소로 미리 채움) → `setSiteAddress` → `subdomain_set_site`(바뀌면 확인 기록 지움) → 토큰을 **원래 주소에서** 확인(`verifySubdomain`이 `site_verified_at` 없으면 원래 주소를 봄, 자동 확인 포함) → `subdomain_verify_site`. 원래 주소 판정 `siteAddressFor`(`hosts.ts`) — 프리셋 9곳 기본 주소만, GitHub/GitLab Pages는 경로 유지, `checkSite`는 기준 URL(경로 포함)을 받는다. "AI에게 보낼 글"은 ②로 옮기고 첫 두 줄을 "내 웹사이트(<원래 주소>)에 … 주소를 붙이려고 해. / 먼저 이 사이트가 내 것이라는 걸 확인하는 코드를 넣고 다시 배포해 줘."로 바꿈(사용자 확인).
  - ③ `connectHost`: `site_verified_at` 없으면 거절, 호스트는 ②의 `site_host`로 고정. 대상이 곧 사이트인 호스트(`targetBoundToSite` — Netlify·Cloudflare Pages·GitHub/GitLab Pages·Render·Workers·Firebase)는 CNAME 값(바로가기는 보낼 곳)이 확인한 사이트 호스트 이름이어야 함(입력칸 읽기 전용). Vercel·Railway는 묶을 수 없어 연결 뒤 실제 주소 확인이 최종 판정(남는 틈). 자리표시를 지운 뒤 CNAME·TXT를 만들고, **바로가기도 여기서 바로 만든다**(옛 "토큰이 처음 확인될 때 켜기" 없어짐). 바로가기 행에 `redirect:` 항목이 없으면 토큰이 보여도 연결됨으로 안 침(`connectionLive`). DB `subdomain_connect`가 `not_verified`·`host_mismatch`·`target_mismatch`로 같은 규칙을 강제하고 `connected_at`을 기록.
  - 연결된 적 없는 주소의 7일 반납은 `max(created_at, connected_at)`부터 센다. 목록 알약: 확인 기다림/연결 기다림/설정 중 + "N일 뒤 자동 반납".
  - DB: migration `20261026120000_subdomains_verify_first.sql`(`site_url`·`site_host`·`site_verified_at`·`connected_at` + 함수, 기존 `ever_active` 행은 확인된 것으로 백필). 없는 목록 항목 삭제는 Cloudflare가 성공으로 답함(2026-10-26 실측).
- **화면**: `/domains`(보호, `force-dynamic`, 섹션 색 teal-700·`Globe`) — `DomainList`(줄·상태 알약: 설정 중/연결됨/끊김 N일 뒤 자동 반납/회수됨) → `DomainSteps`(① 이름 `[ ].dshs.dev` 400ms 디바운스 확인 ② `HostPicker` 호스트 카드 7개(프로젝트 url로 미리 고름) + 프리셋 안내·설정 링크 + CNAME + TXT(프리셋 `txt` — Vercel `_vercel` 선택, GitLab·Railway 필수, 이름은 미리 채움) ③ **"AI에게 보낼 글 복사"**(`src/lib/domains/ai-prompt.ts` `buildVerifyPrompt` — "도메인을 https://dshs.dev 서비스로 ○○.dshs.dev 로 변경했어"로 시작해 meta 한 줄·"서버가 내려주는 HTML에 처음부터 들어 있어야 함(JS로 붙이기 금지)"·구조별 자리(index.html / Next.js metadata)·푸시·재배포·배포 후 페이지 소스 확인까지 한 덩어리, 문구는 2026-10-25 사용자 확정, GitLab Pages만 GitHub 대신 GitLab) + 미리 보기 + 코드 한 줄만 복사(접힘) + "지금 확인하기" + **자동 확인**). url 없는 웹사이트 프로젝트는 회색 줄 + 수정 링크. **비공개 프로젝트**(주소가 아직 없는 것)는 버튼 대신 "비공개 프로젝트는 도메인을 마련할 수 없어요"(수정 링크) — 이미 받은 주소는 계속 관리할 수 있다. 서버 액션 `reserveSubdomain`도 내 프로젝트가 비공개면 같은 문구로 거절한다(남의 프로젝트는 공개 범위를 알려 주지 않으려고 읽지 않고 RPC의 `not_owner`에 맡김). DB 함수 `subdomain_reserve`는 공개 범위를 안 본다 — 서비스 키 전용이라 서버 액션이 유일한 입구. `/domains/admin`(개발자 계정만, 아니면 404) — 전체 표, 회수(이유 필수)·이름 풀기.
- **호스트 프리셋** `src/lib/domains/hosts.ts`: 호스트마다 `detect`·`cnameTarget`(호스트 소유 도메인만, IP·임의 도메인 거부)·안내·`notFound`(호스트의 "사이트 없음" 판별). 호스트: Vercel·Netlify·Cloudflare Pages·GitHub Pages·GitLab Pages·Render·Railway(GitLab·Railway는 2026-10-25 migration `20261025140000`, Cloudflare Pages는 `20261025150000` — 다른 계정 Pages에 DNS only CNAME으로 붙는 것을 시험으로 확인, 미리보기 주소 `*.이름.pages.dev`는 거부). 호스트 추가 = 프리셋 + 새 migration으로 DB `host` CHECK·`subdomain_target_ok()`. **Cloudflare Workers(존이 같은 계정이어야 함)·Firebase(A 레코드 요구)는 연결 대신 바로가기**(아래), **Surge(공용 CNAME 대상이라 가로채기 쉬움)는 제외**. GitLab(로그인으로 302)·Cloudflare Pages(530)는 모르는 주소를 `notFound`로 못 가림("연결 안 됨"으로 보임), Pages 공개 범위가 Everyone이어야 확인됨. GitHub Pages `_github-pages-challenge-*` TXT는 dshs.dev 전체를 확인하므로 **받지 않는다**. TXT는 내 이름 아래(`*.<이름>.dshs.dev`)만, 예외 `_vercel.dshs.dev`는 값이 `vc-domain-verify=<이름>.dshs.dev,`로 시작할 때만.
- **바로가기 주소**(2026-10-26 사용자 요청 — Workers를 쓰는 학생이 실제로 막힘): Cloudflare Workers·Firebase Hosting은 CNAME 연결이 안 돼서 `<이름>.dshs.dev` → 학생 사이트로 **302** 보낸다(`HostPreset.mode: 'redirect'`, 호스트 키 `cloudflare-workers`·`firebase`). 주소창이 workers.dev·web.app으로 바뀌는 건 괜찮다고 사용자가 정함. 설계 `docs/superpowers/specs/2026-10-26-subdomain-redirects-design.md`, 계획 `docs/superpowers/plans/2026-10-26-subdomain-redirects.md`.
  - 보낼 곳은 `워커.계정.workers.dev` / `사이트.web.app`·`firebaseapp.com`만(앱·DB 양쪽, Firebase 미리보기 채널 `--` 거부) — 아무 주소나 받으면 `dshs.dev`가 피싱용 열린 리다이렉터가 된다. TXT 없음.
  - 소유 확인은 **보낼 곳 사이트**에서(`siteHostFor`). (2026-10-26부터는 ②에서 확인한 뒤 ③ 연결하기에서 바로 만든다 — 위 「확인 먼저」. 아래는 옛 흐름 기록) 연결하기는 DB에 host·target만 기록하고, **토큰이 처음 확인될 때** `activateRedirect`(`src/lib/domains/activate.ts`)가 proxied AAAA(`100::`) + Bulk Redirect 목록 항목(`redirects.ts`, 302·경로·쿼리 보존)을 만들고 `subdomain_set_redirect_records`(service_role 전용, 이미 있으면 `records_exist`)로 기록한다. 끊김 동안은 유지(7일 뒤 반납 때 삭제).
  - 목록 항목 id는 `cf_record_ids`에 `redirect:<id>`로 같이 넣고, 지울 때는 `removeCloudflare`(`cleanup.ts`)가 접두어로 나눠 DNS·목록을 지운다 — 반납·회수·재연결·프로젝트 삭제·탈퇴·매일 점검 모두 이것을 쓴다.
  - Bulk Redirects는 우리 Worker를 안 거쳐 요청 한도를 쓰지 않는다(무료 1만 개). 우리 Worker로 학생 사이트를 대신 받아오는 프록시는 **하지 않는다**(Workers 무료 한도는 계정 전체 공유라 넘치면 `dshs.dev`도 1027로 멈춤).
  - 목록 `dshs_subdomain_redirects`(id `f31dbc9f2bbb42deb5aea342330b41b5`)와 그 목록을 쓰는 계정 Bulk Redirect 규칙(`http_request_redirect` 단계)은 `node scripts/create-redirect-list.mts`가 만든다(여러 번 돌려도 같음) — 2026-10-26 생성 완료, 시험 주소로 302·경로·쿼리 보존 실측. 규칙이 없으면 "연결됨"인데 안 넘어가므로 **규칙을 만든 뒤에 배포**. 목록은 같은 source를 덮어쓰고(같은 id), 같은 AAAA는 81058로 거절돼서 AAAA를 먼저 만든다(동시 활성화 방지). 매일 점검이 바로가기 하나를 열어 302를 확인한다(`redirectWorks`). 개발은 메모리 가짜(`[redirect:fake]`).
  - 화면: 호스트 카드 9칸, 바로가기는 "보낼 곳 주소" 한 칸 + "바로가기 만들기", 목록(데스크탑)·상세 "주소" 행에 회색 "바로가기" 알약, "바꾸기" 뒤 `UrlChangedDialog`는 안 띄움(사이트가 원래 주소에서 그대로 돎). Firebase "Site Not Found"(404)는 `notFound`로 가림, 모르는 workers.dev는 DNS부터 안 풀려 "연결 안 됨".
- **소유 확인**(`verify.ts`): 행마다 무작위 `verify_token`. `https://<이름>.dshs.dev/`의 meta 또는 `/.well-known/dshs-verify.txt`가 토큰과 같아야 "연결됨". 리다이렉트는 **같은 호스트로만 3번**, 본문 256KB, 10초(`fetch-site.ts`). 가로챈 사이트·이전 주인 사이트는 토큰이 없어 "끊김"이 된다.
- **DB** `public.subdomains`(`supabase/migrations/20261025100000_subdomains.sql` + `20261025110000_subdomains_lifecycle.sql`, 사본 `docs/22-supabase-subdomains.sql`, 2026-10-25 db push 완료). 연결된 적 있는 주소는 다시 연결 중(pending)이어도 확인 실패면 끊김. "바꾸기" 전 방문 주소는 `previous_url`에 기억했다가 반납·회수 때 되돌린다(프로젝트 url이 아직 이 주소일 때, 기억이 없으면 비움). 탈퇴(`withdraw_account`)는 살아 있는 주소를 먼저 반납한다(`20261025130000` — 안 그러면 삭제 트리거가 CASCADE를 막아 탈퇴 실패), DNS 레코드는 `src/lib/privacy/actions.ts`가 바로 지움: RLS는 SELECT만(본인·`is_admin()`), 쓰기는 `subdomain_reserve/connect/record_check/release/revoke/unblock/set_url` 함수로만 — **EXECUTE는 `service_role` 전용**, 함수 안에서 소유자·관리자(`subdomain_is_developer`) 재확인. 3개 제한은 트리거(사용자별 advisory lock), 이름·프로젝트 중복은 부분 UNIQUE(회수된 이름은 막아 둠, 반납된 이름은 바로 재사용). 살아 있는 주소가 있는 프로젝트는 **삭제 트리거가 막는다** → 프로젝트 삭제는 서버 액션 `src/lib/projects/actions.ts`(`deleteProject`)가 주소 반납·DNS 삭제 후 지운다. 검증 `docs/22-supabase-subdomains-verify.sql`(항상 롤백, "VERIFY OK"). ⚠️ `docs/21`은 재실행 금지, 수정은 새 migration.
- **서버 액션** `src/lib/domains/actions.ts`(`(nav)` 밖): getUser → 학교 계정 → 입력 검사 → 서비스 키 RPC → Cloudflare. 연결은 CF 생성 후 DB 기록, DB 실패면 방금 만든 레코드 삭제(`connect.ts`).
- **DNS** `src/lib/domains/cloudflare.ts`: `proxied:false`, `ttl:1`, `comment: "dshs-subdomain:<행 id>"`. **개발(next dev)은 토큰이 있어도 메모리 가짜**(`[dns:fake]` 로그) — 진짜로 해 보려면 `DOMAINS_REAL_DNS=1`. 운영에서 토큰이 없으면 오류.
- **방문 주소 바꾼 뒤 안내 창**(2026-10-25 사용자 요청): 제안 띠 "바꾸기"(`applyProjectUrl`)가 성공하면 `UrlChangedDialog`(`src/components/domains/url-changed-dialog.tsx`)가 뜬다. ① 내 사이트가 쓰는 DB·로그인 서비스에 적힌 도메인 정보(사이트 주소·리다이렉트/콜백 주소·CORS 허용 주소, 소셜 로그인 허용 주소, 사이트 주소 환경변수)를 새 주소로 바꾸라는 것 ② 기존 도메인은 호스트에서 지우거나 리다이렉트하고 허용 목록의 옛 주소도 지우라는 것 — DB 종류가 많아서 특정 서비스(Supabase 등) 이름은 쓰지 않는다(사용자 결정)(새 주소가 열리고 로그인되는 걸 확인한 뒤) — 각각 "안 하면?" 이유 상자 포함. 옛 방문 주소가 없었으면 ②는 빼고 ①만. 제안 띠는 "바꾸기" 직후 사라져 컴포넌트가 언마운트되므로 열림 상태·옛 주소는 부모 `DomainSteps`가 쥔다(옛 주소는 누르는 순간 `project.url`을 붙잡아 둠). DB·서버 변경 없음, 우리 쪽에서는 학생 DB를 못 건드리니 안내만 한다.
- **자동 연결 확인**(2026-10-25 사용자 요청 — 확인하기를 안 눌러도 되게): `DomainList`가 `useDomainChecks`(`src/components/domains/use-domain-checks.ts`)를 쥐고, 호스트 연결을 마친(`pending`·`broken`) 주소를 **패널이 접혀 있어도** 화면을 열자마자 한 번, 이후 20초마다 `verifySubdomain`으로 확인한다(최대 30회 = 10분, 그 뒤엔 멈추고 "확인하기를 눌러요" 안내). 탭이 숨겨져 있으면 쉬고 회차도 안 센다. 탭이 다시 보이거나 창에 포커스가 오면(호스트 설정 화면에서 돌아온 순간) 바로 한 번(최소 5초 간격). `active`가 되면 토스트 "○○.dshs.dev 연결이 확인됐어요" + `router.refresh()`. 타이머 로직은 React와 분리한 `src/lib/domains/poller.ts`(`startPoller`, 테스트 `poller.test.ts`). 서버 액션은 **상태가 안 바뀌면 `revalidatePath`를 안 부른다**(20초마다 페이지를 다시 그리지 않게). `verifySubdomain`은 `unreachable`일 때 `detail`(예: `status 404`·`redirect to another host`)도 돌려줘 "자세한 이유"로 보여 준다. 수동 버튼은 "지금 확인하기"로 남음(같은 주소를 이미 확인 중이면 건너뜀).
- **매일 점검** `.github/workflows/check-subdomains.yml`(03:30 KST, `workflow_dispatch` + `dry_run`) → `scripts/check-subdomains.mts`: 토큰 확인 → `subdomain_record_check`, 끊긴 지 7일·연결 없이 7일이면 반납(`check.ts` `decide`), comment의 행이 살아 있지 않은 Cloudflare 레코드 삭제. 실패 있으면 exit 1. 바로가기·자리표시 점검은 Actions 의 데이터센터 IP 가 Cloudflare 보안 확인(`cf-mitigated: challenge`, 403 "Just a moment…")에 막히면 실패가 아니라 "건너뜀"(⚠️)으로 처리한다(`blockedByChallenge`, 2026-10-27 — 로컬에서는 302 정상이라 규칙 문제가 아님. 그래서 Actions 점검만으로는 바로가기 규칙이 죽었는지 못 본다). 로그엔 주소 이름만(공개 저장소). 로컬 `node scripts/check-subdomains.mts --dry-run`.
- **연결점**: 내비 5번째 칸(가이드 다음), 홈 `DomainTeaser` 카드·푸터 "만들기" 열, 프로젝트 상세 정보 카드 "주소" 행(연결된 것만), 수정 폼 삭제 확인창 "주소도 반납돼요", 가이드 `register.md` 끝 `[!only type=website]` 안내.
- **`/domains?project=<id>`**(2026-10-26): 등록 직후 권유 창에서 들어오는 주소. 그 프로젝트가 내 목록에 있고 방문 주소가 있으며 아직 주소가 없고 3개 미만이면 `DomainList initialOpen`으로 그 줄을 펼친 채 시작 → 줄로 스크롤 + ① 이름 칸(`name-<id>`)에 포커스. 조건이 안 맞으면 그냥 목록.
- **비공개로 바꾸면 주소도 닫힘**(2026-10-26 사용자 요청): 수정 폼에서 살아 있는 주소(`subdomainName`, 소유자만 받음)가 있는 프로젝트를 공개 → 비공개로 저장하려 하면 ① 공개 범위 칸에 rose 안내 띠 ② 저장 누르면 `Dialog` "비공개로 바꾸면 주소도 닫혀요"(이 주소로 안 열림·이름이 풀려 남이 가져갈 수 있음·방문 주소 되돌림·다시 공개해도 안 돌아옴)가 뜬다. 확인하면 먼저 `projects`를 비공개로 저장한 **뒤** 서버 액션 `closeDomainOfPrivateProject`(`src/lib/projects/actions.ts`)가 `subdomain_release`(사유 `project_private`) + DNS 레코드 삭제 — 저장 때 방문 주소가 이 주소로 같이 쓰이므로 그 뒤에 반납해야 `previous_url`로 되돌아간다. 액션은 DB에 저장된 공개 범위가 비공개일 때만 닫고(공개 프로젝트 주소는 이 경로로 못 닫음), 작성자·개발자 계정만. 반납이 실패하면 비공개 저장은 된 채 오류를 보이고, 다시 저장하면 재시도(수정 폼의 처음 값이 아직 공개라 같은 흐름). 새로 고친 뒤에는 처음 값이 비공개라 그 흐름이 안 타므로, **이미 비공개인데 주소가 살아 있으면** 공개 범위 칸에 rose 띠 "비공개 프로젝트지만 주소가 아직 열려 있어요" + "주소 닫기" 버튼(같은 확인 창, 저장 없이 `closeDomainOfPrivateProject`만)이 뜬다(2026-10-26). 삭제용 반납 로직은 `releaseLiveDomain` 한 함수로 같이 쓰고, 순수 로직은 `src/lib/domains/release.ts`(`releaseLiveDomainWith`, 테스트 있음) — **주소 조회가 실패하면 "없음"으로 보지 않고 실패**(예전엔 성공을 알려 주소가 남았다). **한계**: 팀원은 주소를 못 닫고(`subdomainName`이 소유자에게만 넘어감), 폼을 거치지 않고 API로 비공개로 바꾸면 주소가 남는다 — 매일 점검이 비공개 프로젝트의 주소를 걷어 가진 않는다. 비공개 프로젝트에 새로 주소를 받는 것은 막는다(위 `/domains` 화면 항목).

## 🗄️ 데이터베이스 스키마 (Supabase PostgreSQL)

> 실제 SQL: `docs/03-supabase-schema.sql` (통합본 단일 source of truth)
> TypeScript 타입: `src/lib/types.ts` (수동 작성)

### 주요 테이블 구조
- **`users`**: `id`, `email`, `full_name`, `nickname`, `bio`, `interests`, `avatar_url`, `contacts`(JSONB, `docs/14-supabase-users-contacts.sql` 적용 필요)
- **`projects`**: `id`, `author_id`, `title`, `description`, `types`(text[], `docs/17` 1·2단계 모두 운영 적용 — 옛 `type` 칸은 2026-10-27 migration `20261027120000`으로 삭제), `platforms`, `source_type`, `repo_url`, `url`, `license_features`, `visibility`, `allowed_users`, `icon_url`, `readme_sync`·`readme_etag`·`readme_synced_at`(`docs/20-supabase-projects-readme-sync.sql`, 적용 완료)
- **`reviews`**: `id`, `project_id`, `user_id`, `rating`(nullable — `docs/15` 내용은 2026-10-27 migration `20261027110000`으로 운영 적용, 그 전엔 운영이 NOT NULL이라 별점 없는 리뷰가 저장 실패했음), UNIQUE(`project_id`,`user_id`) — 프로젝트마다 한 사람 1개, `comment`

### RLS 정책 요약
- **`users`**: 누구나 조회 가능, 본인만 수정 가능.
- **`projects`**: Public은 누구나, Private은 소유자 및 허용된 사용자만. 생성/삭제는 소유자만. **수정은 소유자 또는 `team_members`에 이메일이 포함된 팀원**도 가능(`docs/13-supabase-projects-team-edit.sql` 적용 후).
- **`reviews`**: 프로젝트 접근 권한자만 조회 가능, 본인만 생성/수정/삭제 가능.

### 개발자 프로필 페이지 (`src/app/(nav)/developers/[id]/page.tsx`)
- **머리(2026-10-24)**: `PageHero`의 `avatar` 변형 — 아바타 스티커(104px, `ring-[3px]` + 그림자) → 닉네임 h1(없으면 실명) → **실명 알약**(닉네임이 있을 때만, `users.full_name` = "기수 이름" 형식이라 기수도 같이 나옴; 2026-10-24 사용자 요청으로 복구) → 자기소개 → **연락처 알약**(아이콘 + 값) → 관심분야 칩. **이메일 줄은 머리에 두지 않는다**; 이메일은 연락처 알약 하나로 항상 노출(`contacts`에 email이 있으면 그것만, 없으면 학교 이메일). 본인이면 알약 아래 "프로필 설정"(다이얼로그) + "로그아웃"(`sign-out-button.tsx`).
- **아래 구간**: zinc-50 띠 "내 프로젝트/등록한 프로젝트 N"(2열 `ProjectCard`, 본인이면 `manage` 모드 + 점선 "새 프로젝트 등록" 칸). 목록은 `author_id = 프로필 id` **또는** `team_members`에 프로필 이메일이 든 프로젝트(`.or("author_id.eq.…,team_members.cs.{\"이메일\"}")`) — 팀으로 등록된 프로젝트도 팀원 프로필에 나온다(2026-10-25) → 흰 구간 "작성한 글 N"(팁·해줘를 한 목록에 얇은 행, 최근 6개). `/me`는 본인 프로필로 리다이렉트(별도 페이지 없음).
- **연락처**: `users.contacts` JSONB 배열 — `{ type: 'github'|'email'|'instagram'|'discord'|'website', value: string }[]`. 프로필 설정 다이얼로그에서 추가/제거(최대 8개). GitHub·인스타그램은 username만 입력하면 URL 자동 변환. `docs/14-supabase-users-contacts.sql` 실행 필요.
- **프로필 설정 다이얼로그** (`profile-settings-dialog.tsx`): 닉네임·자기소개·아바타·관심분야·연락처 편집. `updateProfile` 서버 액션으로 저장.

### 리뷰 기능 (`src/components/projects/`)
- **별점 선택 선택사항화**: `review-form.tsx`의 rating은 0(선택 안 함) 허용. 라벨 "별점 (선택)" 표시. 같은 별을 다시 클릭하면 해제. rating=0이면 DB에 null로 저장.
- **rating=null 리뷰**: `review-list.tsx`에서 별점 없이 댓글만 표시. `ReviewItem.rating`은 `number | null`.
- **DB**: `reviews.rating` 컬럼 NOT NULL 제거 + CHECK(rating IS NULL OR BETWEEN 1 AND 5) — 운영 적용 완료(2026-10-27 migration `20261027110000`).

### 팁(블로그) 테이블 — `docs/08-supabase-tips.sql`
- **`tips`**: `id`, `author_id`, `title`, `summary`, `content`(마크다운), `cover_url`, `tags[]`, `created_at`, `updated_at`(트리거 자동 갱신).
- **`tip_likes`**: `tip_id`, `user_id`, `created_at`, PK(`tip_id`,`user_id`) — 좋아요 1인 1회.
- **`tip_comments`**: `id`, `tip_id`, `user_id`, `content`, `created_at`.
- RLS: 모두 조회는 누구나, 생성은 로그인, 수정/삭제는 본인만. (좋아요는 수정 없음)
- ⚠️ 새 환경에서는 이 SQL을 Supabase에서 실행해야 함.

---

## 💡 해줘! 아이디어 요청 (`/haejwo`)
- **목적**: 비개발자가 아이디어를 올리고 개발자에게 구현을 요청하는 기능. 기능 이름 "해줘".
- **진입점**: 내비 "커뮤니티" 칸 → 커뮤니티 탭(`CommunityTabs`)의 "해줘!" 탭 → `/haejwo` 목록 페이지. (개발 팁 머리의 "해줘! 둘러보기" 버튼은 2026-10-24 제거)
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
- 색상 포인트: **오렌지** (`orange-700`) — 개발 팁(`tip-*` 분홍)과 구별. 목록 도구줄 오른쪽(커뮤니티 탭 옆) **상태 세그먼트** `HaejwoStatusTabs`(전체·구현 요청 중·완료, `?status=` 링크; `in_progress`는 설정 UI가 없어 세그먼트에 없음). 카드는 `HaejwoCard`(상태 알약·종류 아이콘 칩·카테고리 칩, 완료는 점선 테두리 + 연결 프로젝트 한 줄). 상세는 글 레이아웃(`ArticleHeader` + `ReadingSurface`) + 미완료면 점선 "만들었어요?" 카드, 완료면 emerald 연결 프로젝트 카드.
- ⚠️ 새 환경에서는 `docs/10-supabase-haejwo.sql` → `docs/11-supabase-haejwo-alter.sql` 순서로 Supabase에서 실행해야 함.

---

## 📢 공지사항 (`/announcements`)
- **목적**: 개발자가 프로젝트 홍보, 베타 테스트 모집, 의견 수렴, 업데이트 공지 등을 올리는 게시판.
- **목록** `/announcements`(`revalidate=30`): `PageHero` + 카드 그리드 한 덩어리(고정 공지가 먼저). 카드(`AnnouncementCard`)는 카테고리 알약(`src/lib/announcement-colors.ts` — 티커·상세와 같은 색) + 제목 2줄 + **본문 첫 문단 요약 2줄**(`announcementSummary`, 서버에서 생성해 `summary` prop) + 작성자·시간. **고정 공지는 배경 없이 테두리만 sky** + 오른쪽 끝 핀 "고정".
- **작성** `/announcements/new` (보호 라우트): 카테고리 카드 선택 → 제목 → 마크다운 에디터(작성/분할/미리보기 탭).
- **상세** `/announcements/[id]`(`revalidate=30`): 마크다운 렌더. 작성자·관리자에게만 수정/삭제 버튼 노출. 관리자에게만 "고정/고정해제" 버튼 노출. 상단에 "목록으로" 버튼(`ArrowLeft`) 별도 행으로 배치됨.
- **수정** `/announcements/[id]/edit` (보호 라우트): 작성자 또는 관리자만 접근 가능.
- 댓글 없음. 이미지 없음.
- **카테고리**: `ANNOUNCEMENT_CATEGORIES` — `promotion`(홍보)·`beta`(베타테스트)·`feedback`(의견수렴)·`update`(업데이트)·`general`(일반). `src/lib/constants.ts` 정의.
- **관리자 전용 카테고리**: `ADMIN_ANNOUNCEMENT_CATEGORY` — `admin`(관리자). `src/lib/constants.ts`에 별도 상수로 분리. 에디터(`AnnouncementEditor`)에 `isAdmin` prop이 `true`일 때만 카드가 노출됨. 서버 액션(`actions.ts`)에서도 관리자가 아니면 `admin` 카테고리 저장을 거부. DB `CHECK` 제약에도 `admin` 포함.
- **관리자 고정**: `isDeveloper()` (email=`ts250024@ts.hs.kr`) 체크로 `is_pinned` 토글. 서버 액션 레벨에서도 검증.
- 서버 액션: `src/lib/announcements/actions.ts`(`createAnnouncement`/`updateAnnouncement`/`deleteAnnouncement`/`togglePinAnnouncement`) — `(nav)` 밖에 위치(Turbopack 바인딩 문제 회피).
- 컴포넌트: `src/components/announcements/announcement-card.tsx`, `announcement-editor.tsx`, `announcement-owner-actions.tsx`, `announcement-pin-button.tsx`.
- DB 스키마: `docs/12-supabase-announcements.sql` — `announcements` 테이블 (`id`, `author_id`, `title`, `category`, `content`, `is_pinned`, `created_at`, `updated_at`). `is_admin()` SQL 함수 포함.
- RLS: 조회 누구나, 작성 로그인, 수정/삭제 작성자 또는 관리자.
- 색상 포인트: **스카이블루** (`sky-700`) — 공지 머리 타일·주 버튼·헤더 벨 활성 칩. 입구는 헤더 벨(내비 칸 아님)·홈 티커·푸터 링크.
- ⚠️ 새 환경에서는 `docs/12-supabase-announcements.sql`을 Supabase에서 실행해야 함.
- **공지사항 카드 하단 고정**: `announcement-card.tsx`에서 작성자/시간 영역에 `mt-auto` 적용 — 제목 줄 수에 무관하게 카드 하단에 고정됨.
- **상세 페이지 작성자 링크**: `/announcements/[id]`에서 작성자 아바타+이름 영역을 `<Link href="/developers/[author_id]">` 로 감쌈 — 클릭 시 프로필 페이지 이동.

### 홈 공지사항 티커 (`AnnouncementTicker`)
- 컴포넌트: `src/components/shared/announcement-ticker.tsx` (`"use client"`)
- 홈 페이지(`src/app/page.tsx`) 최상단에 normal flow로 배치 — **스크롤하면 자연히 사라짐** (fixed 아님).
- 위치: `<SiteHeader variant="transparent" />` 다음, `mt-16`(헤더 높이)으로 헤더 아래에 자리잡음.
- 최근 공지사항 최대 10개 fetch (고정 우선, 최신 순). 공지가 0개면 티커 미노출, hero padding도 원래대로 유지.
- CSS-only 무한 스크롤: 아이템을 짝수 세트로 복제 후 `translateX(0) → translateX(-50%)` 루프 (`@keyframes announcement-ticker` in `globals.css`).
- 아이템 수에 따라 duration 자동 조정 (세트당 아이템 수 × 4.5초).
- 디자인: `h-7` 얇은 띠, 불투명 배경(`bg-white`/`dark:bg-zinc-950`), 왼쪽 Bell 아이콘 + 세로 구분선, 좌우 fade-out 그라디언트.
- **접근성**: 우측 일시정지/재생 버튼(`aria-pressed`, 링크 밖에 분리). hover·키보드 포커스 시 자동 정지. `prefers-reduced-motion: reduce`면 애니메이션 없음(정지 버튼도 숨김). 애니메이션은 `.announcement-ticker-track` 클래스(`globals.css`) + `--ticker-duration` 변수.
- **카테고리 pill**: 각 공지 아이템 앞에 `rounded-full` 알약 형태로 카테고리 표시. 카테고리별 은은한 배경색 적용 — promotion=blue, beta=violet, feedback=amber, update=emerald, general=zinc, admin=rose. 배경 투명도 80%(라이트) / 30%(다크)로 subtle하게 유지.

---

## 🔏 개인정보 처리방침·동의·철회 (`/privacy`, 2026-10-25)
- **페이지** `/privacy`(`src/app/(nav)/privacy/page.tsx`, 비로그인 열람 가능): `PageHero`(section=`privacy`, 무채색 zinc) → 로그인했으면 "내 동의 기록" 카드(동의 일시 KST·버전·지난 기록 + "동의 철회하고 탈퇴") → `ReadingSurface`에 본문. 푸터 "이 사이트" 칸·로그인 화면에 링크. 사용자 요청: 팝업 동의, 거부 시 로그아웃, 동의 일시 기록, 철회 가능.
- **본문** `src/lib/privacy/policy.ts`(마크다운 문자열, `Markdown`으로 렌더): **실제 코드가 하는 일을 그대로 적는다** — 수집 항목·공개 범위·위탁(Supabase/Cloudflare/Cloudinary/Google)·국외 이전·쿠키·파기·구제기관. 로그인하지 않은 방문의 `project_clicks.ip_hash`(IP+UA의 SHA-256, 소금 없음)도 항목에 적혀 있다 — 새 수집·위탁이 생기면 여기도 고칠 것. **버전은 자동**: `PRIVACY_POLICY_VERSION`(`src/lib/privacy/version.ts`) = `PRIVACY_EFFECTIVE_DATE`(policy.ts, 시행일 — 문구 고칠 때 같이 고침) + 본문 해시 8자리(`hashText`, FNV-1a 32비트), 예 `2026-10-25-bffa13ce`. **본문을 한 글자라도 고치면 버전이 바뀌어 전원에게 동의 창이 다시 뜬다**(오탈자 수정도 마찬가지 — 배포 전에 꼭 필요한 수정인지 확인). `version.ts`는 본문 문자열이 딸려 오므로 서버 코드(미들웨어·서버 액션·서버 컴포넌트)에서만 import하고 클라이언트에는 prop으로 넘긴다(루트 레이아웃 → `PrivacyGate version`). 문의처 `PRIVACY_CONTACT_EMAIL`은 개발자 계정(`ts250024@ts.hs.kr`) — 사용자 확인 전 제안값. 법률 검토를 받은 문서가 아니라 초안.
- **동의 기록** `public.privacy_consents`(`user_id`, `policy_version`, `consented_at timestamptz`, UNIQUE(user_id, policy_version)): 버전마다 한 줄, 처음 동의한 시각을 유지(upsert ignoreDuplicates). RLS SELECT 본인만, 쓰기 정책 없음 — 서버 액션이 `getUser()` 확인 후 `createAdminClient()`로만 기록(시각을 브라우저가 못 바꿈). IP·User-Agent는 저장하지 않는다. `policy_version`은 `YYYY-MM-DD` 또는 `YYYY-MM-DD-<해시8>`(CHECK). `docs/21-supabase-privacy-consents.sql`(최종 형태) = migration `20261025090000_privacy_consents.sql` + `20261025120000_privacy_consents_version_hash.sql`(CHECK 확장) — 둘 다 운영 적용 완료. 후자는 운영 DB에 서브도메인 작업의 `20261025100000_subdomains`가 로컬에 없어서 `db push`가 막혀 `supabase db query --linked -f`로 적용했다(기록 표에는 없지만 다시 push해도 멱등).
- **팝업** `PrivacyGate`(`src/components/privacy/privacy-gate.tsx`, 클라이언트, **루트 레이아웃**): 로그인했는데 현재 버전 동의가 없으면 shadcn `Dialog`가 뜬다(예전 버전에 동의한 적이 있으면 제목이 "개인정보 처리방침이 바뀌었어요"). 동의 액션은 팝업이 보여 준 버전을 같이 보내고(`acceptPrivacyPolicy(seenVersion)`), 그사이 본문이 바뀌었으면 거절한다 — 읽지 않은 글에 동의시키지 않는다. 닫을 수 없다(`open` 제어 + `onOpenChange` 무시, X 없음). "동의하고 계속"(`acceptPrivacyPolicy`) / "동의하지 않고 로그아웃"(`declinePrivacyPolicy`). `/privacy`에서는 읽을 수 있게 안 띄움. 온보딩 화면에서도 뜬다(루트 레이아웃). 서버에서 쿠키를 읽지 않으므로 홈·목록 ISR을 깨지 않는다 — 판정은 브라우저 supabase 클라이언트로 `privacy_consents`를 조회(AuthButtons와 같은 방식). **UI에서만 막는다**: 서버 액션·API는 동의 여부를 검사하지 않음.
- **쿠키 캐시** `ds_privacy=<버전>`(1년, **httpOnly 아님** — 클라이언트가 읽고 조회를 건너뜀): `src/middleware.ts`가 로그인 사용자의 쿠키가 현재 버전과 다르면 DB를 보고 동의했을 때만 심는다(`ds_onboarded`와 같은 방식). 본문이 바뀌어 버전이 달라지면 자동 무효. 동의 전 사용자는 쿠키가 없어 페이지마다 조회가 한 번 더 간다(일시적).
- **거부** `declinePrivacyPolicy`: `signOut` + `ds_privacy`·`ds_onboarded` 쿠키 삭제. 한 번도 동의한 적 없고 닉네임도 없는 **새 계정은 함께 삭제**(쓴 글이 없고 개인정보를 쥘 이유가 없음). 이미 쓰던 계정은 남긴다.
- **철회 = 탈퇴** `withdrawAccount(confirmText)`(`src/lib/privacy/actions.ts`, 라우트 그룹 밖): 확인 칸에 "탈퇴"를 직접 입력해야 한다(`WithdrawButton`). DB 쪽은 `public.withdraw_account(uuid)`(SECURITY DEFINER, **EXECUTE는 `service_role` 전용**) 한 트랜잭션: 다른 사람 프로젝트의 `team_members`·`allowed_users`에서 내 이메일 제거 → `guide_revisions.author_email`을 `withdrawn-<무작위>`로 바꿈(내용은 위키라 남김) → `project_clicks`의 내 행 삭제(`user_or_ip_required` CHECK 때문에 `user_id` SET NULL이 실패함) → `auth.users` 삭제(users·프로젝트·팁·리뷰·댓글·좋아요·해줘·공지·동의 기록 CASCADE). 반환된 이미지 URL(아바타·프로젝트 아이콘·팁 커버)은 `cloudinaryPublicId`(`src/lib/privacy/format.ts`, 우리 계정의 `dshs/` 폴더만)로 public_id를 뽑아 Cloudinary에서 최선 노력으로 삭제. 팀 프로젝트의 소유자가 탈퇴하면 프로젝트가 팀원에게도 사라진다(다이얼로그가 경고). 함수 수정은 새 migration으로 — 롤백되는 트랜잭션 시험은 `supabase db query --linked -f`로(운영에서 확인함).
- 순수 로직(`format.ts`(`formatKst`·`cloudinaryPublicId`·`hashText`·`policyVersion`)·`config.ts`·`policy.ts`·`version.ts`)은 상대 `.ts` import만 쓰고 `npm test`로 검증(`format.test.ts`).

---

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
- **무료 요금제 CPU 10 ms/요청** — 넘으면 오류 1102, Workers Paid($5/월) 필요.
- **한국 접속은 LAX 경유**(무료 망): 첫 응답 0.8~2초(Vercel icn1은 0.1~0.4초). 무료로는 못 고친다 — 체감은 로딩 뼈대로 가린다(아래 「로딩 뼈대」).
- `wrangler.jsonc` `keep_names: false` 필수 — 켜 두면 esbuild `__name()`이 next-themes 인라인 스크립트에 섞여 브라우저에서 `__name is not defined`.
- Worker 배치는 `placement.region: aws:ap-northeast-2`(Supabase 옆, smart 모드는 트래픽이 쌓여야 작동).
- `wrangler types` 결과(`cloudflare-env.d.ts`)는 두지 않는다 — 런타임 타입이 브라우저 `Response.json()`을 `unknown`으로 덮어 `tsc`가 깨짐.
- `src/middleware.ts` 유지(OpenNext가 Next 16 `proxy.ts`를 아직 인식 못 한다는 보고). Next는 16.4.1 이상 필요(OpenNext peer).

---

## ⚡ 성능 최적화 적용 내역

### 미들웨어 온보딩 쿠키 캐시 (`src/middleware.ts`)
- 문제: 로그인된 사용자의 **모든 페이지 이동마다** Supabase DB에 닉네임 확인 쿼리 발생.
- 해결: 닉네임 확인 성공 시 `ds_onboarded=1` 쿠키(30일)를 발급. 이후 요청은 DB 쿼리 없이 쿠키만 확인.

### 프로젝트 상세 쿼리 병렬화 (`src/app/(nav)/projects/[id]/(detail)/page.tsx`)
- 문제: `project` → `user` → `reviews` 쿼리가 직렬 실행.
- 해결: `Promise.all`로 3개 쿼리 동시 실행.

### 페이지별 캐시 전략
- 홈(`/`): `revalidate = 60` (ISR, 60초)
- 팁 목록·상세(`/tips`, `/tips/[id]`), 해줘 목록(`/haejwo`): `revalidate = 30` (ISR, 30초)
- 탐색(`/explore`), 프로젝트 상세(`/projects/[id]`): `force-dynamic` — RLS 기반 사용자별 콘텐츠(개발자 계정은 비공개 프로젝트까지 조회)이므로 서버 캐시 사용 불가

### 로딩 뼈대 (`loading.tsx` + `src/components/shared/page-skeleton.tsx`, 2026-10-24)
- 문제: Cloudflare 무료 망은 한국 접속이 LAX를 거쳐 서버 왕복이 0.8~2초 — 링크를 누르면 1초쯤 아무 반응이 없었다.
- 해결: 경로마다 `loading.tsx`가 실제 틀(PageHero 높이·카드 격자·글 레이아웃)과 같은 **회색 블록 뼈대**를 즉시 보여 준다(반짝임·펄스 없음). 메뉴(`PageNav`/`MobileNav`)는 누른 순간 활성 표시가 옮겨간다(`useOptimisticActive`).
- `loading.tsx`는 그 폴더 아래 모든 하위 페이지를 감싸므로, 목록·상세가 같은 폴더인 곳은 **route group**으로 나눴다: `tips|haejwo|announcements/(list)/`, `…/[id]/(detail)/`, `projects/[id]/(detail)/`. 새 하위 페이지를 만들 때 엉뚱한 뼈대가 뜨지 않게 이 구조를 따른다.
- 측정(dshs.dev, 데스크탑): 메뉴 이동은 미리 받기 덕에 0.05~0.1초, 공지 상세는 뼈대 0.05초 → 내용 0.8~2.4초. 첫 접속(주소 직접 입력)은 망 문제라 그대로.

### Router Cache (클라이언트 캐시) — `next.config.ts`
- Next.js 15+에서 `staleTimes.dynamic` 기본값이 `0`으로 바뀌어 `force-dynamic` 페이지가 매 이동마다 서버 요청을 발생시키는 문제 해결.
- `experimental.staleTimes: { dynamic: 30, static: 180 }` 설정으로 동적 페이지도 클라이언트 Router Cache에 30초, 정적 페이지는 3분간 캐시.
- Router Cache는 클라이언트·사용자별 독립 저장소이므로 RLS 우회 없음. 서버 액션의 `revalidatePath()` 호출 시 관련 캐시 항목은 자동 무효화됨.

### Cloudinary 이미지 업로드 (`src/app/api/upload/route.ts`)
- 프로필 아바타 · 프로젝트 아이콘 · 팁 커버 이미지를 사이트 내에서 직접 업로드.
- 공용 컴포넌트: `src/components/shared/image-upload-input.tsx` — 파일 드래그·선택 드롭존 + URL 직접 입력 폴백.
- 서버: `POST /api/upload` — 로그인 검증 후 Cloudinary에 업로드, `secure_url` 반환. 최대 10MB, 이미지 포맷만 허용.
- 자동 압축: `quality: "auto:good"`, `fetch_format: "auto"` 변환 적용.
- 환경변수 3개 필요: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (Cloudflare에는 `wrangler secret put`으로 설정).
- `src/lib/parse-image-url.ts`와 `GET /api/resolve-image`는 기존 imgbb URL을 위해 유지.

### 이미지 포맷 최적화 — `next.config.ts`
- `images.formats: ['image/avif', 'image/webp']` 설정으로 브라우저 지원 시 AVIF(WebP 대비 ~50% 작음) → WebP 순으로 자동 변환 제공.
- `images.remotePatterns`에 `i.ibb.co`, `ibb.co`, `res.cloudinary.com` 추가 → 각 이미지 소스도 Next.js 이미지 최적화 파이프라인 적용 가능.

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
- 홈은 2026-10-25부터 `PageNav`·`MobileNav`가 있지만(아래 「적용 방법」), CTA 링크의 `prefetch={true}`는 그대로 둔다 — `/explore`(force-dynamic)를 히어로에서 바로 미리 받기 위해.
- **홈 구성** (2026-10-24 리뉴얼, 같은 날 세로 길이 보강): 히어로(모눈종이 배경 `.paper-grid`, **가운데 정렬 세로 스택** — 큰 2줄 제목 "발견하고, 공유하고, / 만들어요."(2줄째만 단색 blue-600) → 설명 → 알약형 CTA 2개 → **아이콘 나열**) → "최근 올라온 프로젝트"(공개 6개, `HomeProjectCard`) → "이렇게 써요"(zinc-50 띠, `HowItWorks`) → "요즘 올라온 글"(`RecentPosts`) → "직접 만들어 보고 싶다면"(zinc-50 띠, `GuideTeaser` + 아래 `DomainTeaser`) → "다음 아이콘은 내 프로젝트로."(`ClosingCta`) → 푸터(`SiteFooter`, `(nav)` 페이지 전체와 공통). 가운데 정렬 단일 컬럼이라 모바일에서도 구조가 같다 — 데스크탑 좌우 분할(텍스트 | 장식)은 모바일에서 장식이 쪼그라들어 사용자가 거부함(2026-10-23). 헤드라인에 프로젝트 개수는 넣지 않는다(수가 적을 때 빈약해 보임). 그라디언트 글자·블롭·환영 배지는 옛 히어로 구조를 되살릴 때도 쓰지 않는다. 통계 띠("프로젝트 N개")·리뷰 인용 섹션은 콘텐츠가 적어 보류, "프로젝트 말고도" 4열 메뉴 카드는 2026-10-24 제거(사용자 결정 — 역할을 "요즘 올라온 글"·푸터가 대신함). 홈은 모바일 좌우 여백 `px-6`(24px).
- **홈 섹션 공통 머리** (`src/components/home/section-header.tsx`): 제목(`font-heading`) + 한 줄 설명 + 오른쪽 "전체 보기"(선택). 새 홈 섹션은 모두 이 패턴.
- **홈 전용 프로젝트 카드** (`src/components/home/home-project-card.tsx`): 홈의 다른 섹션 카드와 같은 20px 모서리·테두리·그림자 없음·hover 테두리 진해짐. 카드 전체가 링크라 작성자는 링크 없이 표시. 탐색·프로필의 `ProjectCard`(24px, shadow-sm)와 별개 — 사용자가 홈만 통일하기로 함(2026-10-24).
- **이렇게 써요** (`how-it-works.tsx`): 올리기 → 리뷰 → 해줘 3단계 카드. 각 칸 아래 실제 최근 예시 한 줄(가장 최근 공개 프로젝트 / 공개 프로젝트의 최근 리뷰 1개(`reviews` + `projects!inner`, `visibility=public`) / 최근 해줘 1개), 없으면 안내 문구. 한국어 조사(이/가·을/를) 붙이지 말고 `제목 · 작성자 · 종류`처럼 점 구분으로.
- **요즘 올라온 글** (`recent-posts.tsx`): 개발 팁(최근 3, `tips_author_id_fkey`) · 해줘!(최근 3, `ideas_author_id_fkey`) · 공지(티커용 10개 중 앞 4개, 고정 우선) 세 칸. 비면 "첫 글 쓰기" 안내가 칸 하단 점선 위에. 공지 카테고리 색은 티커와 동일.
- **직접 만들어 보고 싶다면** (`guide-teaser.tsx`): 가이드 위저드 첫 질문(`GUIDE_STEPS[0]`, 옵션 4개: 웹사이트·앱·확장프로그램·그 밖의 도구)을 홈에 그대로 노출. 옵션 클릭 시 `/guide?type=<value>` — `GuideWizard`가 `initialType` prop으로 첫 질문을 미리 답한 상태로 시작, `/guide/page.tsx`가 `searchParams.type`을 넘김.
- **도메인 마련하기 소개** (`domain-teaser.tsx`, 2026-10-25 사용자 요청 — 새 기능 홍보): 같은 띠에서 `GuideTeaser` 바로 아래 같은 모양 카드(teal `SECTION_COLORS.domains`). 왼쪽 `Globe` 타일 + "웹사이트를 올렸다면, 짧은 주소도 무료로 받아요" + 설명(등록한 웹사이트 프로젝트·계정당 3개) + teal 주 버튼 "도메인 마련하기"(`/domains`, 비로그인은 로그인 화면). 오른쪽은 주소창 모양 예시 `https://omm.dshs.dev` + 3단계(이름 정하기 → 호스트에 등록 → 연결 확인, `DomainSteps`와 같은 순서). **사용 현황 줄**(2026-10-26 사용자 요청 — 홍보용, 시안 B): 카드 맨 아래 `border-t` 줄에 "벌써 N개 사이트가 무료 주소로 열려요" + 최근 연결된 주소 칩(`이름.dshs.dev`, 눌러 그 프로젝트 상세로, 데스크탑 6개·모바일 3개 + "외 N개"). 제목에도 "무료"가 들어감. 장식 점·알약·teal 띤 바탕은 쓰지 않음(사용자: 점이 "클로드가 디자인한 것 같다") — 칩은 프로젝트 카드 플랫폼 칩과 같은 `bg-zinc-100` 알약. 데이터 `getDomainShowcase()`(`src/lib/domains/read.ts`): 서비스 키로 `status=active` + 프로젝트 `visibility=public`만 세고 읽는다(비공개 프로젝트는 숫자에도 안 셈, 목록 RLS는 그대로). 실패하면 null → 줄만 조용히 빠짐. **연결된 주소가 3개 미만이면 줄을 숨긴다**(`SHOWCASE_MIN`, "벌써 1개"는 오히려 휑해 보여서 — 2026-10-26 운영 DB는 active 1개). 개인정보 처리방침 문구는 안 바꿈(공개 프로젝트 정보라 새 수집 아님 — 바꾸면 전원 재동의).
- **마무리 CTA** (`closing-cta.tsx`): 어두운 단색 카드(라이트 zinc-900 / 다크는 반전 zinc-100) + 아이콘 나열 상위 3개 미니 타일 + "내 프로젝트 등록하기"(blue-600)·"만드는 법부터 보기".
- **푸터** (`site-footer.tsx`): 소개 한 줄 + 메뉴 3열(둘러보기/만들기(도메인 마련하기 포함)/이 사이트: GitHub 저장소·이슈·마이페이지·개인정보 처리방침) + 저작권·로그인 안내. 홈(`src/app/page.tsx`)과 `(nav)/layout.tsx`(콘텐츠 아래, 모바일 탭바에 안 가리게 `pb-16 sm:pb-0` 래퍼 안)에서 같은 컴포넌트를 쓴다 — 모든 `(nav)` 페이지에 동일하게 나옴(2026-10-24 사용자 요청). 로그인 계열(`AuthShell`) 독립 화면에는 없음.
- **아이콘 나열** (`src/components/home/icon-shelf.tsx`): 사이트의 개성을 담당하는 장식 요소. 공개 프로젝트를 **많이 찾는 순**(`click_count` desc, 동률이면 최신 등록) `SHELF_LIMIT`(11)개 + "내 앱 올리기" 칸을 72px(sm 80px) `rounded-[22%]` 아이콘 스티커로 가운데 flex-wrap. 흰 `ring-[3px]`(다크 zinc-950) + 중립 그림자. 이름은 안 보이고 `aria-label`·`title`로만. 모바일(72px, 간격 14px)에서 4칸씩 3줄.
- **로딩 시퀀스** (`globals.css`): 페이지 로드 때 한 번만. 제목·설명·버튼 `.rise`(`--rise-delay` 0/90/180ms) → 아이콘 `.tile-pop`(`--pop-delay` 260ms부터 65ms 간격) → "내 앱 올리기" 칸 `.tile-invite`가 파란 테두리·배경으로 3번 깜빡임(다크는 `tile-invite-dark`). 동작 줄이기 설정이면 전역 규칙이 duration과 **delay**를 0으로 만들어 즉시 표시(delay를 안 지우면 `fill: both` 요소가 지연 동안 안 보이는 버그가 있었음).
- **스크롤 리빌** (`src/components/home/reveal-observer.tsx` + `globals.css` `.reveal`, 2026-10-24 사용자 요청): 히어로 아래 모든 섹션(`SectionHeader`·카드·`GuideTeaser`·`ClosingCta`)이 뷰포트에 15% 들어오면 한 번 올라오며 나타남(opacity 0→1, translate 28px, scale .97, 600ms). `RevealObserver`(클라이언트, UI 없음)가 마운트 시 `<html>`에 `reveal-ready`를 붙이고 IntersectionObserver로 `.is-in`을 추가 — `reveal-ready` 전에는 숨기지 않아 JS가 없어도 내용이 보임. 같은 줄 카드는 `revealOrder(n)`(`--reveal-delay` n×90ms)로 차례. 동작 줄이기면 관찰 없이 전부 `.is-in`. 처음엔 CSS `animation-timeline: view()`로 했으나 로드 때 이미 보이는 섹션은 안 움직이고 Safari/Firefox 지원이 갈려 교체함.
- **CTA 버튼 2개**: "프로젝트 둘러보기"(`/explore`) + "내 프로젝트 등록하기"(`/projects/new`). 두 링크 모두 `prefetch={true}`. hover 확대 효과 없음.
- **홈 섹션 너비 통일**: 모든 섹션이 동일한 구조 — `<section class="px-6">` + `<div class="max-w-5xl mx-auto">` 내부 wrapper(홈은 모바일도 24px 여백). `max-w-5xl mx-auto`를 section에 직접 쓰면 padding이 max-width 안에서 소비돼 실제 콘텐츠 너비가 달라지는 문제 방지.

---

## 🧭 전역 페이지 내비게이션 (`PageNav` / `MobileNav`)

- 파일: `src/components/shared/page-nav.tsx` (`"use client"`, 두 컴포넌트 모두 export)
- **5개 항목**(2026-10-24 6칸에서 병합해 4칸 → 2026-10-25 "도메인 마련하기" 추가): 모든 프로젝트(→ `/explore`), 프로젝트 등록(→ `/projects/new`), 나도 개발해볼래!(→ `/guide`), **도메인 마련하기(→ `/domains`, teal-700)**, **커뮤니티(→ `/tips`)**. 커뮤니티 = 개발 팁 + 해줘!(URL은 `/tips`·`/haejwo` 그대로, 두 목록 사이는 `CommunityTabs`로 오감). **공지사항은 내비 칸이 아니라 헤더 오른쪽 벨 아이콘**(`src/components/shared/announcements-link.tsx`, 프로필 옆, 글자·안 읽음 점 없음, 모바일 포함).
- **모든 Link에 `prefetch={true}`** — `force-dynamic` 페이지 포함 전체 콘텐츠를 뷰포트 진입 시 미리 패치.
- **활성 버튼 판정**:
  - `/explore`, `/projects/*`(등록·수정 제외), `/developers/*` → "모든 프로젝트"
  - `/projects/new`, `*/edit` → "프로젝트 등록"
  - `/guide/*` → "나도 개발해볼래!"
  - `/tips/*`, `/haejwo/*` → "커뮤니티" (활성 키는 `href`인 `"/tips"` — `useOptimisticActive`가 href로 비교)
  - `/announcements/*` → 내비 알약은 모두 꺼지고 헤더 벨이 활성(`SECTION_COLORS.announcements.chip` 연한 sky + `aria-current`)
- **버튼별 고유 색**: `src/lib/section-colors.ts`의 `SECTION_COLORS`에서 가져온다 — 모든 프로젝트=blue-600, 프로젝트 등록=emerald-700, 나도 개발해볼래!=purple-600, **커뮤니티=화면 따라 바뀜: `/tips*`=tip-600(분홍 `#db2777`, `globals.css` `@theme`의 `--color-tip-*` 커스텀 토큰), `/haejwo*`=orange-700**(`pillFor()`, PC 알약은 `background-color`도 transition). 같은 맵이 페이지 머리 타일·주 버튼·활성 칩에도 쓰인다(`tips`·`haejwo`·`announcements` 키는 합치지 않음).
- **커뮤니티 탭 도구줄** (`src/components/community/community-tabs.tsx`, 서버 컴포넌트, `current` prop): `/tips`·`/haejwo` 목록의 머리(`PageHero`) 아래 `main` 맨 위 한 줄 — 왼쪽 탭(개발 팁 | 해줘!, 활성은 섹션 색 칩), 오른쪽은 팁 개수 / 해줘! 상태 세그먼트. `flex-wrap`이라 모바일에선 오른쪽 요소가 아래 줄로. ISR 유지를 위해 탭은 `usePathname`을 안 쓴다. 로딩 뼈대는 `ListPageSkeleton community="count"|"segment"`.

### 데스크탑 (`PageNav`, `sm:` 이상)
- `SiteHeader` 로고 우측에 얇은 구분선(`hidden sm:block w-px h-5`)으로 분리하여 인라인 배치. `<div className="hidden sm:block">` 래퍼로 모바일에서 완전히 숨김.
- **슬라이딩 pill 애니메이션**: `absolute` pill 하나가 활성 버튼 위치로 부드럽게 이동·확장(`transition-all duration-300 ease-out`). `useRef` 배열 + `useEffect`로 활성 항목의 `offsetLeft`/`offsetWidth`를 읽어 `translateX` + `width` 적용.
- **라벨 펼침**: 활성 버튼만 라벨 텍스트 노출, 비활성은 **아이콘만**. 전환 시 부드럽게 slide-in/out.
- **너비 통일**: 모든 버튼 `min-w-9 justify-center` → 비활성 아이콘 크기 균일.

### 모바일 (`MobileNav`, `sm:` 미만)
- **`(nav)/layout.tsx` DOM 최하단**에 `<SiteHeader>` 및 콘텐츠와 분리된 독립 컴포넌트로 배치. 헤더 CSS stacking context 영향 없음.
- `fixed bottom-0 inset-x-0 z-50 flex sm:hidden` — 뷰포트 바닥에 고정.
- **아이콘 전용** (`h-5 w-5`). 활성 항목은 `h-9 w-9 rounded-full` **원형 컬러 배경 + 흰색 아이콘**, 비활성은 배경 없이 zinc 아이콘.
- 모바일 헤더: 로고(아이콘 + 2줄 텍스트) + 공지 벨 + 프로필만 표시(간격 `gap-1`). 다크모드 토글은 폭이 모자라 모바일에선 숨기고 **프로필 드롭다운의 "다크/라이트 모드로 전환" 항목**으로 옮겼다(`auth-buttons.tsx`, matchMedia로 모바일일 때만 렌더 — `sm:hidden` 항목은 데스크탑 화살표 이동에 걸릴 수 있어서). 비로그인 모바일은 토글 없이 시스템 테마. 로고 텍스트는 1줄 "DSHS Developer Platform"(`text-[15px] sm:text-[17px]`, `font-heading` — 360px 비로그인에서 벨에 붙지 않게 모바일 15px, 헤더 두 묶음 사이 `gap-2`) + 2줄 읽는 이름 "대곽 개발자 플랫폼"(`text-[11px]` zinc-600). 공식 이름은 영문(도메인 dshs.dev·옛 dshs-developer-platform.vercel.app과 일치)이고 한글은 부르는 이름일 뿐이라 탭 제목·푸터는 영문만 쓴다.
- **로고 정렬**: 아이콘은 `<Image width={32} height={32} className="block ...">` (fill 미사용 — inline baseline 문제 방지). 텍스트는 `<span>` 2줄 세로 스택(`flex flex-col gap-px`, 각 줄 `leading-[1.1]`), Link의 `items-center`로 아이콘과 중앙 정렬.
- `(nav)/layout.tsx`에서 콘텐츠를 `<div className="pb-16 sm:pb-0">` 로 감싸 탭바(56px)에 가려지지 않도록 여백 확보.

### 적용 방법
- `SiteHeader`에 `showNav` prop → `<SiteHeader showNav />`. 로그인 계열(`AuthShell`)은 미적용. **홈(`/`)도 2026-10-25 사용자 요청으로 적용**: `<SiteHeader variant="transparent" maxWidth="md" showNav />` + 푸터를 `pb-16 sm:pb-0` 래퍼로 감싸고 맨 아래에 `<MobileNav />`(홈은 `(nav)` 레이아웃 밖이라 직접 둠). 홈에서는 활성 항목이 없어 슬라이딩 알약이 숨고 아이콘만 보인다. 이유: 모바일 홈에 메뉴가 전혀 없었고 메뉴가 5칸으로 늘어 가이드·도메인 마련하기·커뮤니티가 푸터까지 내려가야 보였음.
- `(nav)/layout.tsx`: `<SiteHeader showNav />` + 콘텐츠 래퍼 + `<SiteFooter />`(`pb-16 sm:pb-0` 래퍼) + `<MobileNav />` 순서로 배치.

---

## 📱 반응형 / 모바일 최적화

> 원칙: **데스크탑(`sm:` 640px 이상) 디자인은 그대로 두고, 모바일(기본 브레이크포인트)에서만 보강**한다. 모든 반응형 클래스는 `기본값(모바일) + sm:기존값(데스크탑 동일)` 패턴으로 작성해 데스크탑 레이아웃이 픽셀 단위로 동일하게 유지되도록 한다.

- **좌우 여백**: 페이지 `<main>`/섹션은 **모든 폭에서 `px-6`(24px)** — 2026-10-24 "모바일 16px은 너무 좁다" 피드백으로 `px-4 sm:px-6`을 폐기. 헤더(`SiteHeader`) 컨테이너도 동일. 카드 안 여백(20px)은 그대로.
- **헤더 우측 버튼**: 좁은 폰에서 오버플로우 방지를 위해 라벨을 반응형 처리. 예) tips의 "팁 작성"은 모바일 "작성"/데스크탑 "팁 작성"(`<span className="hidden sm:inline">`). 모바일 헤더는 로고·공지 벨·프로필만 표시(다크모드는 프로필 메뉴 안, `PageNav`는 하단 탭바로 분리). 헤더 오른쪽 묶음은 모바일 `gap-1` / 데스크탑 `gap-2`.
- **목록 도구줄**: 커뮤니티 탭 줄처럼 왼쪽·오른쪽 컨트롤을 한 줄에 두는 곳은 `flex flex-wrap justify-between gap-x-4 gap-y-3` — 모바일에선 오른쪽 요소가 아래로 내려가 가로 스크롤이 생기지 않는다.
- **모바일 하단 탭바**: `MobileNav`(`sm:hidden`)가 뷰포트 바닥에 고정. 아이콘 전용, 활성 항목은 원형 컬러 배경+흰색 아이콘으로 강조. 콘텐츠가 가려지지 않도록 `(nav)/layout.tsx`에서 `pb-16 sm:pb-0` 여백 처리.
- **큰 제목**: 모바일에서 한 단계 작게. 홈 히어로 `text-3xl sm:text-6xl`, 페이지 머리(`PageHero`) h1 `text-3xl sm:text-[40px]`(compact `text-2xl sm:text-[28px]`). 모바일 머리는 설명 문장을 숨긴다.
- **카드/섹션 패딩**: `p-6 sm:p-8` (모바일 24px, 데스크탑 32px).
- **세로 스택 전환**: 좁은 폭에서 잘리는 행은 `flex-col sm:flex-row`로 전환 (예: 프로젝트 리뷰의 "이미 작성하셨습니다" 행).
- **섹션 헤더 정렬**: `flex-col sm:flex-row justify-between` 컨테이너에서 `items-start sm:items-end` 패턴 사용 — 모바일(`flex-col`)에서 `items-end`를 쓰면 콘텐츠가 오른쪽으로 붙어버림.
- **홈 CTA 버튼**: 모바일에서 `max-w-[280px] sm:max-w-none` 제한 — `w-full`만 두면 전체 너비로 늘어나 이상해 보임.
- **홈 섹션별 카드 수**: 모바일에서 최대 3개만 표시. 프로젝트 fetch는 6개(데스크탑 3열 채움)이나 index ≥ 3 항목에 `hidden sm:block` 적용.
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
│   ├── projects/         # project-card, project-form, project-icon, project-reviews, stat-strip 등
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
- **카피**: 기능을 쉬운 말로 설명하는 해요체. 빈 상태엔 다음 행동 링크 제공. 로딩 문구는 `…`(말줄임표 문자).
- **반응형**: 모든 페이지는 모바일에서도 최적화돼야 함. 데스크탑(`sm:`+)은 유지하고 모바일만 보강 (자세한 규칙은 「📱 반응형 / 모바일 최적화」 참고).
- **Documentation**: `CLAUDE.md` 및 `AGENTS.md`를 항상 최신 상태로 유지. — 외부 서비스 정보, 진행 상황, 결정 사항이 바뀌면 즉시 반영
