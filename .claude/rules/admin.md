---
paths:
  - "src/app/(nav)/admin/**"
  - "src/components/admin/**"
  - "src/lib/admin/**"
  - "src/components/shared/banned-notice.tsx"
  - "supabase/migrations/*admin*"
  - "docs/24-supabase-admin-verify.sql"
---

# 관리자 대시보드 `/admin` (2026-11-05)

설계 `docs/superpowers/specs/2026-11-05-admin-dashboard-design.md`, 계획 `docs/superpowers/plans/2026-11-05-admin-dashboard.md`. 계기: Jakal Office가 10초 안에 6번 등록됐고(폼 버그, `.claude/rules/projects.md` 「중복 등록 막기」) 관리자가 하나씩 들어가 지워야 했다.

- **사용자 결정**: 하루 한 번 열어 "무슨 일이 있었나 / 확인할 게 있나"를 보고, 문제가 있으면 **버튼을 최소로** 눌러 대응. 비속어는 최신순으로 **확인**(자동 차단 아님). 차단은 **기간을 정해서(1일·7일·30일·무제한)** 하고 **등록만 막는다**(로그인·열람·하트·내 글 삭제는 그대로). 처리방침 재동의는 하트·댓글 작업과 묶어 한 번만 띄우려 했으나 하트·댓글이 먼저 배포됨 — 배포 전 사용자 확인.
- **설계 판단(사용자 OK)**: 익명 작성자를 차단해도 목록엔 '익명 작성자', 기존 글 수정·프로필 닉네임/소개 변경도 차단, 탈퇴 후 재가입 우회 방지(이메일 해시 + 끝나는 날만 보관), 관리자 삭제는 확인 창 한 번(이름 입력 없음).
- **권한**: 페이지는 `getUser()` + `isAdminUser()`(아니면 `notFound()`, 비로그인은 로그인으로 — 미들웨어 보호 라우트). 액션(`src/lib/admin/actions.ts`)은 매번 `requireAdmin()`(`guard.ts`) 후 서비스 키, `admin_actions`에 기록(지운 글 내용은 안 남김). 프로필 메뉴(`auth-buttons.tsx`)에 관리자만 "관리자" 링크. `/domains/admin`은 `/admin#domains`로 보낸다.
- **화면 순서**: 오늘 확인할 것 → 사이트 현황 → 최신 글 → **걸린 포스터**(2026-11-07, `HungPosters` — 학생이 올린 그림은 바로 걸리고 여기서 나중에 검토. 최근 20개 썸네일·원본 링크·"내리기"(`adminUnhangPoster`, 기록 `unhang`, 포스터 자체는 남김)·"주인 차단"(누가 걸었는지 안 남겨서 프로젝트 주인 기준)) → 잠긴 프로젝트(아래 「프로젝트 잠금」) → **이벤트·수상**(아래, 2026-11-17) → 차단 → 주소 관리(`AdminDomainTable` 재사용). 섹션 색 `admin`(rose). `main`은 `grid-cols-[minmax(0,1fr)]` — 없으면 넓은 표 때문에 모바일 가로 스크롤.
  - **오늘 확인할 것**(`buildTodayItems`, `src/lib/admin/today.ts`, 순서 고정): 비속어 걸린 글 → 몰아 올린 것(같은 작성자·종류가 앞 글과 10분 이내로 3개 이상 이어짐, "하나만 남기고 지우기") → 위키 큰 삭제(지운 글자 − 더한 글자 ≥ 300, 최신 버전일 때만 "되돌리기") → 끊긴 주소("주소 회수") → 최근 2일 안에 끝난 차단("다시 차단"). "확인함"은 `admin_dismissals(kind, item_id)`에 남아 다시 안 뜬다(키 = `${kind}:${대상 id}`, 몰아 올리기는 가장 먼저 올린 글 id). 최근 50개 글·2일 범위만 본다.
  - **최신 글**: 프로젝트·프로젝트 댓글·해줘·위키 수정·프로필(닉네임/소개 변경, `users.profile_updated_at`) 최신순 50개씩, 종류 칩(`feed-filters.ts`), 비속어는 `<mark>` 빨갛게. 줄마다 지우기(프로필은 닉네임·소개만 비움, 위키는 지우기 없음)·작성자 차단·원래 페이지.
- **비속어** `src/lib/admin/profanity.ts`(테스트 있음): 공백·점·별표·숫자 등 끼움 문자를 지운 문자열에서 찾고 위치는 원문 기준. 예외 목록(`시발점`·`미시발`·`등신대`·`씨발라`…)에 들어가면 버린다. 표시만 하고 등록은 막지 않는다.
- **DB**(migration `20261106100000_admin_bans`·`20261106110000_admin_dashboard_rpc`·`20261106120000_admin_actions_forget_user`·`20261106130000_admin_review_fixes`, 모두 운영 적용, 검증 `docs/24-supabase-admin-verify.sql` — 항상 롤백, "VERIFY OK"):
  - `user_bans(user_id, email_hash, until NULL=무제한, reason, from_anonymous, created_by)`·`admin_dismissals`·`admin_actions` — RLS 켜고 정책 없음(서비스 키 전용).
  - 판정은 `private.is_banned(uid)`(user_id 또는 `auth.users` 이메일 해시, DEFINER) — **API로 안 열리는 `private` 스키마**에 둔다. `public`에 두고 authenticated에 열면 누구나 `/rpc/is_banned`로 남의 차단 여부를 알 수 있었다(리뷰 지적). `public.is_banned`는 service_role 전용(서버 `banNoticeFor`). `my_ban()`(본인 안내용), `email_hash(text)`(내장 `sha256`).
  - **쓰기 가드** `guard_banned_writes`(INVOKER — `current_user`로 사용자 키를 가려야 해서. DEFINER로 바꾸면 UPDATE 검사가 영영 안 돈다): INSERT는 로그인한 사람 또는 행 주인 칸(`TG_ARGV[0]`)이 차단 중이면 `user_banned`(42501) — 주인 칸 검사가 서비스 키로 대신 쓰는 위키 저장·주소 예약까지 막는다. UPDATE는 사용자 키일 때만(관리자·서비스 키 수정 통과). 트리거 이름 `zz_ban_guard`(같은 표 다른 BEFORE 트리거 뒤): projects·project_comments·tips·tip_comments·ideas·announcements(INSERT/UPDATE — 공지는 로그인한 누구나 쓸 수 있다), guide_revisions·subdomains(INSERT). `users`는 `zz_profile_guard` — 닉네임·소개(2026-11-12 감사부터 사진·연락처·관심 분야도, `updateProfile`이 차단 문구로 바꿔 보임)가 실제로 바뀔 때만 검사(로그인 upsert가 같은 값을 다시 써도 통과, **비어 있던 닉네임을 처음 정하는 것도 통과** — 막으면 재가입자·닉네임을 지운 사람이 온보딩에 갇힌다)하고 `profile_updated_at` 갱신. **새 사용자 글 표를 만들면 `zz_ban_guard`도 붙일 것.**
  - 읽기 함수(service_role 전용): `admin_content`(모든 글 한 모양)·`admin_recent_content(p_kinds, p_before, p_limit)`·`admin_bursts`·`admin_guide_shrinks`·`admin_bans`·`admin_site_stats`(KST 경계). 익명 프로젝트·가려진 댓글은 `authorName` NULL, `authorId`는 채워서 넘기고 **서버(`read.ts` `stripAuthor`, 차단 목록은 `toBanView`)가 화면으로 보낼 때 id는 뺀다** — 차단은 서버가 글 id로 작성자를 다시 찾는다(`authorOf`).
  - **익명 작성자도 관리자에게는 이름을 보여 준다**(2026-11-05 사용자 요청 — 처음 설계의 '익명 작성자' 표시를 뒤집음): DB 함수는 이름을 비워 보내므로 `read.ts` `namesOf()`가 id로 다시 찾아 익명 글엔 `realName`(줄에 이름 + rose "익명으로 올림"), 차단 목록엔 `name`(+ "익명 글에서 차단")을 채운다. 이름 모양은 `personLabel`(`src/lib/admin/people.ts`, 닉네임 (실명)). id는 여전히 화면에 안 보낸다.
  - 탈퇴(`withdraw_account`): 끝난 차단은 지우고, 차단 중이면 이유·건 사람을 지우고 해시·끝나는 날만 남김(user_id는 FK SET NULL). `users` 삭제 트리거가 `admin_actions`의 그 사람 id를 지운다. 끝난 탈퇴자 기록은 대시보드를 열 때 파기(`loadAdminDashboard`).
- **하트 누른 사람**(2026-11-05 사용자 요청, 11-17 팁 삭제로 좋아요 명단은 없어짐): `LikersCard`(`src/components/admin/likers-card.tsx`, 접이식 rose 테두리 카드 "하트 누른 사람 N명 · 관리자에게만 보여요") — 프로젝트 상세(수치 띠 아래, 서버가 관리자일 때만 렌더). 명단은 서버 액션 `adminListLikers(id)`(서비스 키, `requireAdmin`), 만든 사람이 자기 익명 프로젝트에 누른 하트도 표시.
- **차단된 사람 화면**: `useMyBan()`(`my_ban` RPC) + `BannedNotice`("○월 ○일 ○시까지 글을 쓸 수 없어요." / 무제한 "관리자가 풀 때까지…") — 프로젝트 등록·수정, 프로젝트 댓글, 해줘, 공지, 위키 편집기는 버튼도 잠근다. 해시로만 걸린 재가입자도 끝나는 날을 맞게 보여 준다(`latestBanUntil`). DB 거절 오류는 `friendlyWriteError`로 같은 문구. 서비스 키로 쓰는 위키 저장·주소 받기는 서버에서 `banNoticeFor`로 먼저 막는다(문구용).
- **프로젝트 잠금**(2026-11-07 사용자 요청 — "유튜브 저작권 차단처럼 자기는 볼 수 있어도 공개는 못하게"): 프로젝트 상세(관리자만 보이는 rose 줄, 수치 띠 아래)의 "잠그고 비공개로" → 이유(선택, 300자, **만든 사람에게 보임**) 창 → `adminLockProject`가 비공개 전환 + `project_locks` upsert + 주소 반납(`closeDomainOfPrivateProject`) + 기록 `lock`. 풀기는 상세 또는 `/admin` 「잠긴 프로젝트」(걸린 포스터와 차단 사이)의 "잠금 풀기"(`adminUnlockProject`, 기록 `unlock`) — **비공개는 그대로**, 공개는 주인이 직접.
  - 잠긴 동안 주인·팀원은 보고 고칠 수 있고 `allowed_users` 공유도 그대로 — 공개로 바꾸는 것과 **볼 수 있는 사람(`allowed_users`) 늘리기**(2026-11-12 감사 — 전교생을 넣으면 사실상 공개, `project_locked_share`, 줄이기는 됨)만 막는다. 풀어 달라는 요청 버튼은 없고 안내에 문의처 메일(`PRIVACY_CONTACT_EMAIL`)만(사용자 결정).
  - DB(migration `20261107150000_project_locks.sql`): `project_locks(project_id PK, reason, created_by, created_at)` 서비스 키 전용. 가드 `projects_guard_locked`(BEFORE UPDATE OF visibility, allowed_users, INVOKER — `allowed_users`는 `20261112100000`부터) — 사용자 키로 잠긴 프로젝트를 `public`으로 바꾸면 `project_locked`(42501), 판정은 `private.project_is_locked`(DEFINER). 관리자도 사용자 키(수정 폼)로는 못 바꾼다 — 먼저 풀 것.
  - 안내 `LockNotice`(`src/components/projects/lock-notice.tsx`): 서버 상세 페이지(주인·팀원·관리자 = `canEdit`, 비공개일 때만 `getProjectLock` — `src/lib/projects/lock.ts`)와 수정 폼(공개 범위 칸 아래, "공개" `ChoiceRow` 비활성). 목록에서 눌러 여는 빠른 상세에는 안 나온다(잠금 표를 브라우저가 못 읽음).
  - 한계: 지우고 같은 내용으로 다시 등록하는 건 못 막는다 — 차단으로 대응.
- **한계**: 이름을 바꿔 가며 올리는 도배·목록에 없는 욕은 최신 글을 직접 훑어야 한다. 사용자 신고·글 숨기기(프로젝트는 위 잠금만)·운영 지표(Workers 503·Actions 실패)는 없다.
- **이벤트·수상**(2026-11-17 사용자 요청 — "2026 AI-SW 개발 해커톤 주간, 1위"처럼 관리자가 이벤트와 등위를 넣으면 프로젝트 목록에 이벤트명·등위 배지): `/admin` 「이벤트·수상」(`EventsAdmin`, `src/components/admin/events-admin.tsx`) — 이벤트 이름 추가 → 이벤트 카드 안에서 프로젝트를 제목으로 찾아(`adminFindProjects`, 비공개 포함) 등위(자유 문구 20자, 예 `1위`·`공동 2위`·`대상`)를 넣거나 "빼기". 같은 이벤트에서 한 프로젝트는 등위 하나(다시 넣으면 바뀜). 이벤트를 지우면 그 이벤트의 등위도 함께 사라진다(CASCADE, 확인 창 한 번).
  - 액션(`src/lib/admin/actions.ts`): `adminCreateEvent`·`adminDeleteEvent`·`adminSetAward`·`adminRemoveAward` — 매번 `requireAdmin()` + 서비스 키, `admin_actions`에 `event`·`award`로 기록. 표시 쪽 규칙(배지 색·위치)은 `.claude/rules/projects.md` 「이벤트 수상 배지」.
  - DB(migration `20261117100000_events_awards.sql`): `events(id, name, created_by)`(이름 대소문자 무시 UNIQUE)·`project_awards(project_id, event_id, rank_label, …)` PK(project_id, event_id). 읽기는 anon/authenticated(칸 단위 GRANT, `created_by` 제외) — `project_awards`는 정책이 **projects RLS에 맡겨**(`EXISTS (SELECT 1 FROM projects …)`) 비공개 프로젝트의 수상은 새지 않는다. 쓰기는 서비스 키뿐. **배포 순서: migration을 먼저 적용**(코드가 `project_awards(...)`를 같이 읽어서, 표가 없으면 탐색·프로필·홈 목록이 통째로 빈다).
- **관리자 추가·삭제**(2026-11-17 사용자 결정 — 이메일 하나가 코드·SQL에 박혀 있던 것을 화면에서): **관리자끼리 서로 추가·삭제, 최초 관리자(`DEVELOPER_EMAIL` `ts250024@ts.hs.kr`)는 못 건드린다.** `/admin` 「관리자」(`AdminsManager`, 주소 관리 위): 이메일로 추가(한 번 로그인해 `users`에 있는 `@ts.hs.kr`만), 줄마다 "관리자에서 빼기"(확인 창). 나 자신은 못 뺀다(다른 관리자에게 부탁). 기록 `admin_add`·`admin_remove`.
  - DB(migration `20261117120000_admins.sql`): `admins(user_id PK → auth.users, added_by, created_at)` RLS 켜고 정책 없음 + 권한 회수 = 서비스 키 전용. **최초 관리자는 표에 넣지 않고** `is_admin()`·`subdomain_is_developer()`에 이메일로 그대로 둔다(행이 없으니 지울 수 없음). 두 함수는 `CREATE OR REPLACE`(시그니처·권한 그대로)라 `is_admin()`을 쓰는 RLS 정책·트리거는 안 바뀐다.
  - **관리자 판정은 이메일 비교 말고 DB에 묻는다**: 서버 `isAdminUser()`(`src/lib/admin/is-admin.ts`, `rpc('is_admin')` 사용자 키, 한 요청 안 캐시 — 비로그인이면 부르지 말 것 `!!user && await …`), 브라우저 `fetchIsAdmin()`(`is-admin-client.ts`, 화면 표시용만). `isDeveloper(email)`은 "최초 관리자인가"만 뜻한다(추가 관리자는 false). `loadProjectDetail`은 4번째 인자 `{ viewerIsAdmin }`로 받는다(브라우저 빠른 상세는 관리자를 서버 페이지로 보내 항상 false).
  - 관리자는 차단할 수 없다(최초 관리자 + `admins` 행).
