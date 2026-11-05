# 관리자 대시보드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin` 한 페이지에서 오늘 확인할 것·사이트 현황·최신 글(비속어 표시)·차단 목록·주소 관리를 보고, 줄에서 바로 지우기·차단·회수한다. 차단은 DB 트리거로 강제한다.

**Architecture:** DB는 migration 2개 — ① 차단(`user_bans` + `is_banned` + 쓰기 가드 트리거)·확인함·관리 기록, ② 대시보드 읽기 RPC(현황 숫자·최신 글 UNION·몰아 올리기). 읽기 RPC와 관리 표는 `service_role` 전용이고, 서버(`src/lib/admin/`)가 `getUser()` + `isDeveloper()` 확인 뒤 `createAdminClient()`로 부른다. 판단 로직(비속어·오늘 확인할 것 조립·차단 기간)은 순수 `.ts`로 분리해 `node --test`로 검증한다.

**Tech Stack:** Next.js 16 App Router, Supabase Postgres(RLS·트리거·SECURITY DEFINER), Tailwind v4 + shadcn base-nova, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-05-admin-dashboard-design.md`

## Global Constraints

- 관리자 = `isDeveloper(user.email)`(`src/lib/constants.ts`, `ts250024@ts.hs.kr`) / DB `public.is_admin()`. 관리자 아니면 `notFound()`.
- 서버 권한 판단은 `getUser()`만(`getSession()` 금지). 서버 액션은 라우트 그룹 밖 `src/lib/admin/actions.ts`, 액션마다 다시 확인.
- 새 SECURITY DEFINER 함수: `SET search_path = ''`, 테이블은 `public.` 접두어, RLS 정책·함수 안 `auth.uid()`는 `(select auth.uid())`. 관리 표는 RLS 켜고 정책 없음 + `REVOKE ALL ... FROM anon, authenticated`. 읽기 RPC `EXECUTE`는 `service_role` 전용.
- 권한 판단에 `public.users.email` 금지 — `auth.users`·`auth.jwt()` 기준.
- 익명 프로젝트(`author_role='anonymous'`)와 작성자가 가려진 댓글(`project_comments.public_user_id IS NULL`)은 화면에 '익명'(`ANONYMOUS_AUTHOR`). 작성자 id는 서버에만 두고 차단 액션이 서버에서 찾는다.
- 차단 기간 선택지: 1일 / 7일 / 30일 / 무제한(`until = NULL`). 차단은 **등록·수정·프로필 닉네임/소개 변경**만 막는다. 하트·좋아요·즐겨찾기·삭제·로그인은 그대로.
- 날짜 경계는 KST(`Asia/Seoul`).
- 목록은 한 번에 50개, "더 보기"(키셋 `created_at`).
- 디자인: `PageHero`, `bg-white dark:bg-zinc-950`, `max-w-5xl`, `px-6`, 버튼 `rounded-full`, `transition-all` 금지, 흰 글자 배경은 AA 색만(rose-700 이상). 링크는 `@/components/shared/link`. 해요체.
- 모바일: 기본=모바일, `sm:`=데스크탑. 넓은 표는 모바일에서 카드.
- 관리자 삭제 확인은 확인 창 한 번(이름 입력 없음).
- 로그·공개 저장소에 비공개 프로젝트 제목·이메일을 남기지 않는다.

## Review Focus

1. **팀원이 차단됨**: 차단된 팀원이 남의(소유자 정상) 팀 프로젝트를 수정 → 거절돼야 함(UPDATE는 `auth.uid()` 기준). Task 1 검증 SQL에 포함.
2. **로그인 때 프로필 upsert**: 차단된 사람이 로그인 → 콜백·미들웨어의 `users` 쓰기가 실패하면 안 됨(닉네임·소개가 실제로 바뀔 때만 거절). Task 1 검증 SQL에 포함.
3. **관리자가 차단된 사람의 프로젝트를 비공개로 바꿈**(서비스 키 UPDATE) → 통과해야 함. Task 1 검증 SQL에 포함.
4. **탈퇴 후 같은 이메일로 재가입** → 새 id도 차단 상태. 차단이 끝났으면 통과. Task 1 검증 SQL에 포함.
5. **익명 프로젝트가 대시보드 어디에도 이름으로 안 나옴**(최신 글·몰아 올리기·차단 목록). Task 3 `buildTodayItems` 테스트와 Task 4 RPC 검증 SQL에 포함.

---

### Task 0: 준비 — 하트·댓글 작업 이후에 시작

**Files:** 없음(작업 환경)

- [ ] **Step 1:** `git fetch && git log origin/main --oneline | grep -i "댓글\|hearts"`로 `feat/hearts-comments`가 main에 머지됐는지 확인. 안 됐으면 멈추고 사용자에게 알린다(이 기능은 `project_comments`에 차단을 건다, 스펙 「순서」).
- [ ] **Step 2:** 머지됐으면 `superpowers:using-git-worktrees`로 `.claude/worktrees/admin-dashboard`(브랜치 `feat/admin-dashboard`)를 main에서 만들고 `npm ci`.
- [ ] **Step 3:** `ls supabase/migrations | tail -3`로 마지막 번호 확인. 이 계획의 migration 번호는 그보다 뒤로 — 아래 `20261106100000`·`20261106110000`이 이미 쓰였으면 하나씩 민다.
- [ ] **Step 4:** `supabase migration list --linked`로 운영에만 있는 migration이 없는지 확인(있으면 사용자에게 보고).

### Task 1: 차단 DB — `user_bans`·`is_banned`·쓰기 가드·탈퇴

**Files:**
- Create: `supabase/migrations/20261106100000_admin_bans.sql`
- Create: `docs/24-supabase-admin-verify.sql` (항상 `ROLLBACK`, 끝에 `VERIFY OK`)
- Modify: `src/lib/types.ts` (새 표·RPC 타입)

**Interfaces:**
- Produces (DB):
  - `public.user_bans(id uuid pk default gen_random_uuid(), user_id uuid NULL references public.users(id) ON DELETE SET NULL, email_hash text NOT NULL, until timestamptz NULL, reason text NULL, from_anonymous boolean NOT NULL default false, created_at timestamptz default now(), created_by uuid NULL)`. `email_hash = encode(sha256(lower(email)::bytea), 'hex')`. 인덱스 `(user_id)`, `(email_hash)`.
  - `public.admin_dismissals(kind text, item_id text, dismissed_at timestamptz default now(), PRIMARY KEY (kind, item_id))`.
  - `public.admin_actions(id bigserial pk, action text CHECK (action IN ('delete','ban','unban','private','dismiss')), target_kind text, target_id text, target_user_id uuid NULL references public.users(id) ON DELETE SET NULL, detail jsonb, created_at timestamptz default now())` — 지운 글 내용은 넣지 않는다.
  - `public.users.profile_updated_at timestamptz NULL` — 대시보드(서비스 키)만 읽는다. `users`가 칸 단위 GRANT라면 따로 GRANT하지 않는다.
  - `public.is_banned(p_uid uuid) RETURNS boolean` STABLE SECURITY DEFINER: `p_uid` NULL이면 false. `user_bans`에서 `(user_id = p_uid OR email_hash = <auth.users에서 p_uid의 이메일 해시>) AND (until IS NULL OR until > now())`. EXECUTE: `authenticated, service_role`.
  - `public.my_ban() RETURNS TABLE(until timestamptz, unlimited boolean)` SECURITY DEFINER: `(select auth.uid())`의 가장 늦게 끝나는 활성 차단 1행(없으면 0행). EXECUTE: `authenticated`.
  - 트리거 함수 `public.guard_banned_writes()` SECURITY DEFINER, 오류는 `RAISE EXCEPTION 'user_banned' USING ERRCODE = '42501'`:
    - `TG_OP='INSERT'`: `is_banned((select auth.uid()))` 또는 `is_banned(<행의 주인 칸>)`이면 거절. 주인 칸은 `TG_ARGV[0]`(칸 이름)으로 받아 `to_jsonb(NEW) ->> TG_ARGV[0]`.
    - `TG_OP='UPDATE'`: `current_user IN ('anon','authenticated')`이고 `is_banned((select auth.uid()))`일 때만 거절(서비스 키·관리자 경로 통과).
    - `users` 표: UPDATE에서 `nickname`·`bio`가 `IS DISTINCT FROM`일 때만 위 검사를 하고, 바뀌면 `NEW.profile_updated_at := now()`(차단과 무관하게 항상). INSERT는 막지 않는다. → 별도 함수 `public.users_guard_profile()`로 분리해도 됨.
  - 트리거 붙이기(BEFORE INSERT OR UPDATE): `projects('author_id')`, `project_comments('user_id')`, `tips('author_id')`, `tip_comments('user_id')`, `ideas('author_id')`, `guide_revisions('author_id')` — INSERT만, `subdomains('owner_id')` — INSERT만, `users` — UPDATE만.
  - `withdraw_account(uuid)` CREATE OR REPLACE: 기존 본문(`20261025130000` 최신판을 그대로 복사) 맨 앞에 — 활성 차단은 `reason = NULL, created_by = NULL`로 지우고 `email_hash`·`until`은 남김(`user_id`는 FK가 SET NULL), 끝난 차단은 삭제. `admin_actions.target_user_id`는 FK가 SET NULL.

- [ ] **Step 1: 검증 SQL 작성** `docs/24-supabase-admin-verify.sql` — `BEGIN; ... ROLLBACK;`. 시험 사용자 2명(A 소유자, B 팀원)을 `auth.users`·`public.users`에 만들고 `SET LOCAL ROLE authenticated` + `request.jwt.claims`로 전환하며 확인(실패면 `RAISE EXCEPTION`):
  1. B 차단(7일) → B의 `tips` INSERT 거절(`user_banned`).
  2. A 프로젝트(팀원 B) UPDATE를 B로 → 거절. A로 → 통과.
  3. B가 `users` UPDATE로 같은 email·nickname 다시 쓰기 → 통과. nickname 변경 → 거절.
  4. `RESET ROLE`(서비스 경로) 후 B 프로젝트 `visibility='private'` UPDATE → 통과.
  5. B `project_hearts` INSERT → 통과.
  6. `withdraw_account(B)` → `user_bans`에 `user_id IS NULL`, `reason IS NULL`, `email_hash` 남음. 같은 이메일로 새 사용자 C 생성 → `is_banned(C)` = true. 차단 `until`을 과거로 → false.
  7. 무제한(`until NULL`) 차단 → `my_ban()`이 `unlimited = true`.
  8. 사용자 키로 `select * from user_bans` → 0행 또는 권한 오류.
  끝에 `SELECT 'VERIFY OK';`.
- [ ] **Step 2:** 운영에 적용 전 실행해서 실패 확인: `supabase db query --linked -f docs/24-supabase-admin-verify.sql` → Expected: `relation "public.user_bans" does not exist` 류 오류.
- [ ] **Step 3: migration 작성** — 위 Interfaces 그대로.
- [ ] **Step 4:** `supabase db push --linked` 후 Step 2 명령 재실행 → Expected: `VERIFY OK`(트랜잭션은 롤백).
- [ ] **Step 5:** `src/lib/types.ts`에 `user_bans`·`admin_dismissals`·`admin_actions` Row 타입과 `is_banned`·`my_ban` Functions 추가. `npx tsc --noEmit` → 0 errors.
- [ ] **Step 6: 커밋** `feat(db): 사용자 차단·관리 기록 표와 쓰기 막기 트리거`

### Task 2: 비속어 검사 (순수 로직)

**Files:**
- Create: `src/lib/admin/profanity.ts`
- Test: `src/lib/admin/profanity.test.ts`

**Interfaces:**
- Produces:
  - `findProfanity(text: string): ProfanityHit[]` — `type ProfanityHit = { word: string; start: number; end: number }`(원문 기준 위치, 겹치면 앞의 것).
  - `hasProfanity(text: string): boolean`.
  - `highlightSegments(text: string): { text: string; hit: boolean }[]` — 화면 빨간 표시용.

- [ ] **Step 1: 테스트 작성** (`node:test` + `assert/strict`, 상대 import `./profanity.ts`):
  - `hasProfanity('시발')`, `hasProfanity('시 발')`, `hasProfanity('씨.발')`, `hasProfanity('ㅅㅂ')`, `hasProfanity('병신')`, `hasProfanity('ㅂㅅ')`, `hasProfanity('개새끼')`, `hasProfanity('좆')`, `hasProfanity('fuck')`, `hasProfanity('F*U*C*K')` → 모두 true.
  - 오탐 예외: `hasProfanity('시발점')`, `hasProfanity('수박씨 발라 먹기')`, `hasProfanity('병신년')`은 결정 안 함(테스트 안 함). `hasProfanity('안녕하세요 좋은 프로젝트네요')`, `hasProfanity('미시발달')` → false.
  - `findProfanity('와 시 발 진짜')` → `[{ word: '시발', start: 2, end: 5 }]`.
  - `highlightSegments('a병신b')` → `[{text:'a',hit:false},{text:'병신',hit:true},{text:'b',hit:false}]`.
- [ ] **Step 2:** `node --test src/lib/admin/profanity.test.ts` → FAIL(모듈 없음).
- [ ] **Step 3: 구현** — 단어 목록(한국어 주요 욕설·변형·초성, 영어 몇 개)과 예외 목록(`시발점`·`미시발` 등)을 상수로. 검사는 원문에서 공백·`.`·`*`·`_`·`-`·숫자 `1`→`ㅣ` 같은 끼움 문자를 지운 정규화 문자열 + 정규화 위치→원문 위치 매핑 배열로 한다. 예외에 걸린 구간은 버린다.
- [ ] **Step 4:** 같은 명령 → PASS.
- [ ] **Step 5: 커밋** `feat(admin): 비속어 찾기 순수 로직`

### Task 3: 대시보드 판단 로직 (순수 로직)

**Files:**
- Create: `src/lib/admin/today.ts`, `src/lib/admin/ban.ts`
- Test: `src/lib/admin/today.test.ts`, `src/lib/admin/ban.test.ts`

**Interfaces:**
- Consumes: `hasProfanity` (Task 2).
- Produces (`ban.ts`):
  - `type BanDuration = '1d' | '7d' | '30d' | 'forever'`; `BAN_DURATIONS: { value: BanDuration; label: string }[]` = 1일/7일/30일/무제한.
  - `banUntil(d: BanDuration, now: Date): Date | null` — forever → null.
  - `banNotice(until: string | null): string` — null → `"관리자가 풀 때까지 글을 쓸 수 없어요."`, 아니면 `"M월 D일 H시까지 글을 쓸 수 없어요."`(KST).
  - `friendlyWriteError(message: string, until?: string | null): string | null` — `message`에 `user_banned`가 있으면 `banNotice(until ?? null)`, 아니면 null.
- Produces (`today.ts`):
  - `type ContentKind = 'project' | 'project_comment' | 'tip' | 'tip_comment' | 'idea' | 'guide' | 'profile'`.
  - `type FeedItem = { kind: ContentKind; id: string; createdAt: string; authorName: string | null; anonymous: boolean; title: string | null; body: string; href: string }` — `anonymous=true`면 `authorName`은 null이어야 함(RPC가 보장, 화면은 `ANONYMOUS_AUTHOR`).
  - `type TodayItem = { key: string; kind: 'profanity' | 'burst' | 'guide_shrink' | 'broken_domain' | 'ban_ended'; reason: string; target: { kind: string; id: string }; items?: FeedItem[] }`. `key = \`${kind}:${target.id}\`` (확인함 저장 키 = `admin_dismissals(kind, item_id)`).
  - `buildTodayItems(input: { feed: FeedItem[]; bursts: Burst[]; guideShrinks: GuideShrink[]; brokenDomains: BrokenDomain[]; endedBans: EndedBan[]; dismissed: Set<string> }): TodayItem[]` — 순서: profanity → burst → guide_shrink → broken_domain → ban_ended, 각 안은 최신순. `dismissed`에 있는 key는 뺀다.
  - `Burst = { kind: ContentKind; authorKey: string; anonymous: boolean; items: FeedItem[] }`(RPC가 준 묶음, `authorKey`는 서버가 만든 불투명 문자열), `GuideShrink = { revId: string; docKey: string; docTitle: string; minus: number; plus: number; createdAt: string }`, `BrokenDomain = { id: string; name: string; brokenSince: string }`, `EndedBan = { banId: string; name: string | null; anonymous: boolean; until: string }`.
  - 사유 문구: profanity `"비속어가 있어요"`, burst `"10분 안에 N개를 올렸어요"`, guide_shrink `"한 번에 N자를 지웠어요"`(N = minus − plus), broken_domain `"주소가 끊겼어요"`, ban_ended `"차단이 끝났어요"`.

- [ ] **Step 1: 테스트 작성**
  - `ban.test.ts`: `banUntil('7d', new Date('2026-11-05T00:00:00Z'))` → `2026-11-12T00:00:00.000Z`; `banUntil('forever', …)` → null; `banNotice(null)` → `'관리자가 풀 때까지 글을 쓸 수 없어요.'`; `banNotice('2026-11-12T03:00:00Z')` → `'11월 12일 12시까지 글을 쓸 수 없어요.'`; `friendlyWriteError('new row violates ... user_banned')` → `banNotice(null)`; `friendlyWriteError('other')` → null.
  - `today.test.ts`: 비속어 body가 있는 FeedItem 1개 + 깨끗한 1개 → profanity 1건, `target.id`가 그 id. 같은 입력에 `dismissed = new Set(['profanity:<id>'])` → 0건. burst·guide_shrink(minus 900, plus 100 → reason `'한 번에 800자를 지웠어요'`)·broken_domain·ban_ended 각 1건 → 결과 kind 순서가 위 순서. 익명 burst(`anonymous: true`)의 items 각 `authorName === null`이 유지되는지.
- [ ] **Step 2:** `node --test src/lib/admin/*.test.ts` → FAIL.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** 같은 명령 → PASS.
- [ ] **Step 5: 커밋** `feat(admin): 오늘 확인할 것 조립·차단 기간 순수 로직`

### Task 4: 대시보드 읽기 RPC

**Files:**
- Create: `supabase/migrations/20261106110000_admin_dashboard_rpc.sql`
- Modify: `docs/24-supabase-admin-verify.sql` (RPC 검사 추가)
- Modify: `src/lib/types.ts`

**Interfaces:**
- Produces (모두 SECURITY DEFINER, `search_path=''`, EXECUTE `service_role`만, 반환은 Task 3 타입과 같은 키 이름의 `jsonb`):
  - `admin_site_stats() RETURNS jsonb` — `{ today: Counts, yesterday: Counts, week: Counts, activeDomains: int, activeBans: int }`, `Counts = { users, projects, projectComments, tips, tipComments, ideas, guideEdits, clicks }`. 경계는 `date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'`. `guideEdits`는 `kind <> 'seed'`.
  - `admin_recent_content(p_kind text DEFAULT NULL, p_before timestamptz DEFAULT NULL, p_limit int DEFAULT 50) RETURNS jsonb` — FeedItem 배열(최신순, `p_before`보다 이전). 각 줄에 서버용 `authorId`(uuid, 화면에 안 그림)도 포함. 출처:
    - project: `title`, body = `short_description || ' ' || left(description, 300)`, 익명 = `author_role='anonymous'`, href `/projects/<id>`.
    - project_comment: body `content`, 익명 = `public_user_id IS NULL`, href `/projects/<project_id>`.
    - tip: `title`, body `left(content,300)`, href `/tips/<id>`. tip_comment: href `/tips/<tip_id>`. idea: `title`, body `left(content,300)`, href `/haejwo/<id>`.
    - guide: `kind <> 'seed'`, title `doc_key`, body `summary`, href `/guide-wiki/<doc_key>/history`, author는 `author_id`로 users 조인.
    - profile: `profile_updated_at IS NOT NULL`인 users, `createdAt = profile_updated_at`, title `nickname`, body `bio`, href `/developers/<id>`.
    - authorName = `coalesce(nickname, full_name)`. 익명이면 **authorName은 NULL, authorId는 채운다**(차단 액션용). Task 5 서버가 화면으로 넘길 때 authorId를 뺀다.
  - `admin_bursts(p_since interval DEFAULT '2 days') RETURNS jsonb` — 같은 작성자·같은 종류(project·project_comment·tip·tip_comment·idea) 행이 10분 창 안에 3개 이상인 묶음. `authorKey = md5(kind || author_id)`, 익명 행은 익명 행끼리만 묶고 `anonymous=true`.
  - `admin_guide_shrinks(p_since interval DEFAULT '2 days') RETURNS jsonb` — `kind='edit'`이고 `(stats->>'minus')::int - (stats->>'plus')::int >= 300`.
  - `admin_bans() RETURNS jsonb` — 활성 차단 목록 `{ banId, userId, name, anonymous(from_anonymous), until, reason, createdAt }`(from_anonymous면 name NULL) + 최근 2일 안에 끝난 차단(`endedBans`).
- [ ] **Step 1:** 검증 SQL에 추가: 시험 데이터(익명 프로젝트 1, 일반 프로젝트 1, 3개 연속 tip) → `admin_recent_content()`에서 익명 프로젝트 줄 `authorName IS NULL`, `admin_bursts()`에 tip 묶음 1개, `SET LOCAL ROLE authenticated`에서 `admin_site_stats()` 호출 → 권한 오류.
- [ ] **Step 2:** `supabase db query --linked -f docs/24-supabase-admin-verify.sql` → FAIL(함수 없음).
- [ ] **Step 3:** migration 작성 → `supabase db push --linked`.
- [ ] **Step 4:** 검증 재실행 → `VERIFY OK`.
- [ ] **Step 5:** `types.ts`에 RPC 추가, `npx tsc --noEmit` → 0.
- [ ] **Step 6: 커밋** `feat(db): 관리자 대시보드 읽기 함수`

### Task 5: 서버 — 읽기와 관리 액션

**Files:**
- Create: `src/lib/admin/read.ts`, `src/lib/admin/actions.ts`, `src/lib/admin/guard.ts`
- Modify: `src/lib/projects/actions.ts` (관리자 삭제가 쓸 내부 함수 export)

**Interfaces:**
- Consumes: Task 3 타입·`buildTodayItems`·`banUntil`, Task 4 RPC, `releaseLiveDomain`(`src/lib/projects/actions.ts`), `revokeSubdomain`(`src/lib/domains/actions.ts`), `revertGuide`(`src/lib/guide-wiki/actions.ts`).
- Produces:
  - `guard.ts`: `requireAdmin(): Promise<{ id: string; email: string } | null>` — `getUser()` + `isDeveloper`.
  - `read.ts`: `loadAdminDashboard(): Promise<AdminDashboard>` — `{ today: TodayItem[]; stats: SiteStats; feed: FeedItem[]; bans: BanRow[]; domains: AdminSubdomainRow[] }`. 5개 RPC + `admin_dismissals` + `listAllSubdomains()`를 `Promise.all`. 화면으로 넘기는 FeedItem에서 `authorId` 제거. 시작 때 `user_bans`에서 `user_id IS NULL AND until < now()` 행 삭제(끝난 탈퇴자 기록 파기, 스펙 「개인정보」).
  - `actions.ts`(`'use server'`, 전부 `Promise<{ ok: true } | { ok: false; error: string }>`, 첫 줄 `requireAdmin()` 실패면 `{ ok:false, error:'관리자만 할 수 있어요.' }`, 성공하면 `admin_actions` 기록 + `revalidatePath('/admin')`):
    - `adminDeleteContent(kind: ContentKind, id: string)` — project: `releaseLiveDomain(admin, actor.id, id, 'admin_deleted')` 뒤 서비스 키 삭제. guide: 지우지 않고 오류 `'위키 수정은 되돌리기로 처리해요.'`. profile: 닉네임·소개를 NULL로(계정은 안 지움). 나머지: 서비스 키 `delete().eq('id', id)`.
    - `adminDeleteBurstExceptFirst(kind: ContentKind, ids: string[])` — 가장 오래된 하나 남기고 나머지를 `adminDeleteContent`와 같은 경로로.
    - `adminBanByContent(kind: ContentKind, id: string, duration: BanDuration, reason: string)` — 서버가 그 행의 작성자 id와 익명 여부를 다시 읽어 `user_bans` INSERT(`email_hash`는 `auth.users` 이메일로 서버에서 계산, `from_anonymous`). 관리자 본인은 차단 거절.
    - `adminBanUser(userId: string, duration: BanDuration, reason: string)` — 차단 목록의 "사람 찾기"용.
    - `adminUnban(banId: string)` — `until = now()`로 끝냄(기록 유지).
    - `adminDismiss(key: string)` — `key`를 `kind:item_id`로 나눠 upsert.
    - `adminMakeProjectPrivate(projectId: string)` — 서비스 키 UPDATE `visibility='private'` 뒤 `closeDomainOfPrivateProject`와 같은 반납(내부 함수 재사용).
    - `adminRevertGuide(revId: string)` — 그 버전 바로 앞 버전으로 `revertGuide`와 같은 경로(요약 `"관리자 되돌림"`).
    - `adminFindUsers(query: string): Promise<{ id: string; name: string }[]>` — 닉네임·실명 부분 일치 10개.
    - `loadMoreFeed(kind: ContentKind | null, before: string): Promise<FeedItem[]>`.
- [ ] **Step 1:** `src/lib/projects/actions.ts`의 `releaseLiveDomain`을 `export`(이름 그대로)하고 비공개 반납 로직을 `closeDomainFor(admin, actorId, projectId)`로 꺼내 기존 `closeDomainOfPrivateProject`가 그것을 부르게 한다. `npm test` → 기존 테스트 PASS.
- [ ] **Step 2:** `guard.ts`·`read.ts`·`actions.ts` 구현.
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint` → 0 errors.
- [ ] **Step 4: 커밋** `feat(admin): 대시보드 읽기와 관리 액션`

### Task 6: `/admin` 화면

**Files:**
- Create: `src/app/(nav)/admin/page.tsx`, `src/app/(nav)/admin/loading.tsx`
- Create: `src/components/admin/today-list.tsx`, `stat-grid.tsx`, `content-feed.tsx`, `ban-dialog.tsx`, `ban-list.tsx`, `confirm-action.tsx`
- Modify: `src/app/(nav)/domains/admin/page.tsx` → `redirect('/admin#domains')`
- Modify: `src/middleware.ts` (`PROTECTED_PREFIXES`에 `'/admin'`)
- Modify: `src/lib/section-colors.ts` (`SectionKey`에 `'admin'`, rose 계열: 타일 `bg-rose-100 text-rose-700`, 주 버튼 `bg-rose-700`, 활성 칩 rose)
- Modify: `src/components/shared/auth-buttons.tsx` (관리자에게만 메뉴 "관리자" → `/admin`)

**Interfaces:**
- Consumes: `loadAdminDashboard`, Task 5 액션, `highlightSegments`, `BAN_DURATIONS`, `AdminDomainTable`(기존, 그대로 재사용).

- [ ] **Step 1:** `page.tsx` — `force-dynamic`, `requireAdmin()` 없으면 로그인 안 했으면 `redirect('/login?next=/admin')`, 관리자 아니면 `notFound()`. `PageHero section="admin" icon={ShieldCheck} title="관리자"`. 섹션 순서: 오늘 확인할 것(`id="today"`) → 사이트 현황 → 최신 글(`id="feed"`) → 차단(`id="bans"`) → 주소(`id="domains"`).
- [ ] **Step 2:** `TodayList` — 비었으면 한 줄 `"오늘 확인할 것이 없어요."`. 줄마다 사유 + 대상 요약 + 버튼(스펙 표대로) + "확인함". 버튼 → `ConfirmAction`(Dialog, 문구 + rose 확인 버튼 1개) → 액션 → `sonner` 토스트 + `router.refresh()`.
- [ ] **Step 3:** `StatGrid` — 숫자 카드(오늘 큰 숫자, 아래 "어제 N · 7일 N"), 모바일 2열 / `sm:` 4열.
- [ ] **Step 4:** `ContentFeed`(클라이언트) — 종류 칩(전체/프로젝트/댓글(project_comment+tip_comment)/팁/해줘/위키/프로필, `aria-pressed`), 줄: 종류 배지·작성자(익명이면 `ANONYMOUS_AUTHOR`)·`formatDistanceToNow`·`highlightSegments` 본문(hit은 `bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200`)·버튼(지우기·차단·원래 페이지). "더 보기"는 `loadMoreFeed`.
- [ ] **Step 5:** `BanDialog` — 기간 `ChoiceRow`/`SelectCard` 4칸(`tone="neutral"`) + 이유 입력(선택, 200자) + "차단"(rose-700). `BanList` — 활성 차단(이름 또는 "익명 작성자", 끝나는 날 또는 "무제한", 이유, "풀기") + "사람 찾기"(입력 → `adminFindUsers` → 줄 → `BanDialog`).
- [ ] **Step 6:** `loading.tsx` — `page-skeleton.tsx` 블록으로 같은 섹션 틀.
- [ ] **Step 7:** `npm run dev` → 관리자 계정으로 `/admin` 열기, 다른 계정으로 404 확인, 모바일 폭(375px) 스크린샷을 scratchpad에 저장해 가로 스크롤 없음 확인(`playwright-cli` 또는 `run` 스킬).
- [ ] **Step 8:** `npx tsc --noEmit && npm run lint` → 0 errors.
- [ ] **Step 9: 커밋** `feat(admin): /admin 대시보드 화면`

### Task 7: 차단된 사람에게 보이는 안내

**Files:**
- Create: `src/lib/admin/use-my-ban.ts` (클라이언트 훅), `src/components/shared/banned-notice.tsx`
- Modify: `src/components/projects/project-form.tsx`, 프로젝트 댓글 작성 컴포넌트(하트·댓글 작업 이름 그대로 — `src/components/projects/` 안 댓글 폼), `src/components/tips/tip-editor.tsx`, 팁 댓글 폼(`src/components/tips/tip-comments.tsx`), `src/components/haejwo/haejwo-wizard.tsx`, 가이드 위키 편집기 저장 바(`src/components/guide-wiki/editor/`), `src/components/domains/domain-steps.tsx`(① 이름 예약), 프로필 설정 창(`profile-settings-dialog`)
- Modify: `src/lib/guide-wiki/actions.ts`, `src/lib/domains/actions.ts`(`reserveSubdomain`), `src/app/(nav)/developers/actions.ts`(프로필 저장) — 서버 쪽 오류 문구

**Interfaces:**
- Consumes: `my_ban` RPC, `banNotice`, `friendlyWriteError`.
- Produces: `useMyBan(): { banned: boolean; until: string | null; loading: boolean }` — 로그인 사용자만 `rpc('my_ban')` 1번(브라우저 클라이언트). `<BannedNotice until={string|null} />` — rose 안내 상자 한 줄 `banNotice(until)`.

- [ ] **Step 1:** 훅·컴포넌트 구현.
- [ ] **Step 2:** 각 폼: `banned`면 제출 버튼 위에 `BannedNotice` + 버튼 `disabled`. 기존 오류 처리에서 `friendlyWriteError(msg, until)`가 문자열을 주면 그것을 보여 준다.
- [ ] **Step 3:** 서비스 키로 쓰는 서버 액션(위키 저장·주소 예약): 시작에서 `rpc('is_banned', { p_uid: user.id })`가 true면 `{ error: banNotice(...) }` 반환(트리거가 최종 방어, 이건 문구용).
- [ ] **Step 4:** 수동 확인: 시험 계정을 Task 5 `adminBanUser`로 1일 차단 → `/projects/new`·팁 작성·댓글에서 안내와 잠긴 버튼, 풀기 후 정상. (운영 계정에 걸었다면 반드시 풀 것.)
- [ ] **Step 5:** `npx tsc --noEmit && npm run lint && npm test` → 0 errors, PASS.
- [ ] **Step 6: 커밋** `feat(admin): 차단된 사람에게 글쓰기 안내와 잠금`

### Task 8: 처리방침·문서·배포

**Files:**
- Modify: `src/lib/privacy/policy.ts`, `.claude/rules/privacy.md`
- Create: `.claude/rules/admin.md` (`paths:` = `src/app/(nav)/admin/**`, `src/components/admin/**`, `src/lib/admin/**`, `supabase/migrations/*admin*`)
- Modify: `CLAUDE.md` (기능별 문서 표에 `admin.md`, 보호 라우트에 `/admin`), `.claude/rules/domains.md` (`/domains/admin` → `/admin#domains`)

- [ ] **Step 1:** `policy.ts` 수집 항목에 한 줄: 이용 규칙을 어긴 계정의 차단 기록(계정, 차단 기간, 사유)을 차단이 끝날 때까지 보관하고, 탈퇴해도 차단 중이면 다시 가입해 피하지 못하도록 이메일을 알아볼 수 없게 바꾼 값(SHA-256)과 끝나는 날만 차단이 끝날 때까지 남긴다는 내용(해요체, 기존 문체에 맞춤). **`PRIVACY_EFFECTIVE_DATE`는 하트·댓글 작업이 정한 날짜와 같은 배포라면 그대로 두고**, 이미 그 날짜로 배포가 나갔다면 Step 4를 따른다.
- [ ] **Step 2:** `npm test` → `format.test.ts` 등 PASS.
- [ ] **Step 3:** 문서 3곳 갱신. `admin.md`엔 화면 구성·RPC·트리거·차단 규칙·익명 원칙·검증 SQL 위치.
- [ ] **Step 4: 배포 순서 확인(사용자 결정: 재동의 팝업 한 번)** — `git log origin/main`에 하트·댓글 처리방침 변경이 **이미 push돼 배포됐는지** 확인한다.
  - 아직이면: 이 브랜치를 main에 머지하고 하트·댓글과 **같은 push**로 올린다.
  - 이미 배포됐으면: push하지 말고 사용자에게 "재동의가 두 번째로 떠요"를 알리고 확인받는다.
- [ ] **Step 5:** `superpowers:requesting-code-review`로 브랜치 전체 리뷰(보안: 권한·익명·트리거 우회 중심) → 지적 반영.
- [ ] **Step 6:** `superpowers:finishing-a-development-branch`.
