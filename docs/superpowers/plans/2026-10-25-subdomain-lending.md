# 서브도메인 빌려주기("주소 받기") 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 웹사이트 프로젝트 소유자가 `<이름>.dshs.dev`를 받아 자기 호스트에 연결하고, 소유 확인 토큰으로 연결을 증명하게 한다.

**Architecture:** 순수 로직(`src/lib/domains/*.ts`, 상대 import, `node --test`) + Supabase 테이블 `subdomains`(RLS SELECT만, 쓰기는 `service_role` 전용 `security definer` 함수) + 서버 액션(`src/lib/domains/actions.ts`)이 `getUser()` → 함수 → Cloudflare DNS API 순으로 호출. 화면은 `/domains`(보호 라우트, 시안 B) + `/domains/admin`. 매일 GitHub Actions가 토큰을 확인하고 고아 레코드를 정리.

**Tech Stack:** Next.js 16 App Router, Supabase(Postgres/RLS), Cloudflare API v4(계정 토큰 `cfat_…`, 존 `c9fac6d72c704d4836b837590f18e144`), Tailwind v4 + shadcn base-nova, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-25-subdomain-lending-design.md`

## Global Constraints

- 주소 대상: `author_id = 나` + `types`에 `website` + `url` 있음. 공개 여부 무관. 신청·연결·반납은 소유자만, 회수는 관리자(`isDeveloper` / `is_admin()`)만.
- 계정당 살아 있는 주소(`reserved|pending|active|broken`) **3개**, 프로젝트당 1개. DB가 강제.
- 이름: 3~30자, `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, `--` 금지 아님(단 `xn--` 시작 금지), 예약어 차단. 선착순.
- 모든 DNS 레코드 `proxied: false`, `ttl: 1`(자동), `comment: "dshs-subdomain:<행 id>"`.
- 소유 확인: `<meta name="dshs-verify" content="<토큰>">` 또는 `/.well-known/dshs-verify.txt` 내용 = 토큰. 본문 앞 256KB만 읽음, 타임아웃 10초, 리다이렉트는 같은 호스트로만 최대 3번.
- 첫 버전 호스트: **Vercel, Netlify, GitHub Pages, Render**. Firebase(A 레코드 요구)·Cloudflare Pages(교차 계정 미확인)는 제외하고 화면에 숨김.
- GitHub Pages의 `_github-pages-challenge-*` TXT는 **허용하지 않는다**(dshs.dev 전체 검증이 됨). Vercel `_vercel` TXT만 예외로 허용하고 값은 `vc-domain-verify=<이름>.dshs.dev,`로 시작해야 함.
- 매일 점검: `broken` 7일 → 반납, `reserved`/`pending`이 생성 후 7일 넘게 한 번도 `active`가 안 되면 반납.
- 공개 저장소 Actions 로그: 프로젝트 제목·이메일 금지, 이름(공개 DNS)만.
- 섹션 키 `domains`, 색 teal-700(`bg-teal-700` 흰 글자), 아이콘 lucide `Globe`, 제목 "주소 받기", 설명 "내 웹사이트에 이름.dshs.dev 주소를 붙여요".
- 카피 해요체, 로딩 `…`. 「하위 페이지 공통 톤」·「키보드 접근성 규칙」·`transition-all` 금지 준수.
- 운영 DB 반영은 `supabase db push`(내가 직접). `docs/22-supabase-subdomains.sql`은 사람이 읽는 사본.

## Review Focus

1. 같은 이름·같은 사용자로 동시에 두 번 예약(더블클릭) → 하나만 성공, 3개 제한 초과 없음. (Task 3 verify SQL에 병렬 대신 연속 삽입 + 4번째 거부 검사)
2. 연결 중 Cloudflare는 성공했는데 DB 함수가 실패 → 만든 레코드를 지우고 오류 안내. (Task 5 `connectHost` 단위 테스트 — 가짜 CF 클라이언트로 delete 호출 확인)
3. 리다이렉트가 다른 호스트(예: `evil.vercel.app`)로 가는 사이트 → 토큰이 있어도 `unreachable`. (Task 2 `verify.test.ts`)
4. 대문자·공백 섞인 이름 입력(`" Meal "`) → `meal`로 정규화, `Meal_App`은 거부. (Task 2 `name.test.ts`)
5. 주소가 살아 있는 프로젝트 삭제 → 주소 먼저 반납 후 삭제, DB 트리거가 직접 삭제를 막음. (Task 3 verify SQL + Task 6)

---

### Task 1: 본 사이트 쿠키·Origin 방어

**Files:**
- Create: `src/lib/supabase/cookie-options.ts`, `src/lib/same-origin.ts`, `src/lib/same-origin.test.ts`
- Modify: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts`, `src/middleware.ts`(ONBOARDING_COOKIE), `src/app/api/upload/route.ts`

**Interfaces:**
- Produces: `AUTH_COOKIE_OPTIONS: { name: string; secure?: boolean; path: '/'; sameSite: 'lax' }` — 운영(`NODE_ENV==='production'`)은 `{ name: '__Host-sb-auth', secure: true, path: '/', sameSite: 'lax' }`, 개발은 `{ name: 'sb-dev-auth', path: '/', sameSite: 'lax' }`. `ONBOARDING_COOKIE_NAME` 운영 `__Host-ds_onboarded` / 개발 `ds_onboarded`. 세 Supabase 클라이언트에 `cookieOptions: AUTH_COOKIE_OPTIONS`.
- Produces: `isSameOrigin(headers: Headers, siteUrl: string): boolean` — `Origin` 우선, 없으면 `Referer`; 둘 다 없으면 false; 호스트+스킴이 `siteUrl`과 같아야 true. `siteUrl`이 비면 요청 `Host` 헤더와 비교.

- [ ] Step 1: `same-origin.test.ts` — Origin 같음 true / `https://meal.dshs.dev` false / Origin 없고 Referer `https://dshs.dev/x` true / 둘 다 없음 false / `http://dshs.dev`(스킴 다름) false.
- [ ] Step 2: `npm test` 실패 확인 → 구현 → 통과.
- [ ] Step 3: 쿠키 옵션 적용. 미들웨어 온보딩 쿠키 `set` 옵션에 운영이면 `secure: true` 추가.
- [ ] Step 4: `/api/upload` POST 맨 앞에서 `isSameOrigin(request.headers, process.env.NEXT_PUBLIC_SITE_URL ?? '')` 아니면 403 `{ error: 'forbidden' }`.
- [ ] Step 5: `npx tsc --noEmit` 0 오류, dev 서버에서 로그인 → 쿠키 이름 `sb-dev-auth`(개발) 확인. 커밋 `feat(security): 서브도메인 쿠키 투척·same-site CSRF 방어`.

### Task 2: 순수 로직 — 이름·호스트·확인

**Files:**
- Create: `src/lib/domains/name.ts`, `hosts.ts`, `verify.ts` + 각각 `.test.ts`

**Interfaces:**
- `ROOT_DOMAIN = 'dshs.dev'`
- `normalizeName(raw: string): string` (trim + toLowerCase)
- `validateName(name: string): { ok: true } | { ok: false; reason: 'length' | 'chars' | 'reserved' }` — 예약어 `RESERVED_NAMES`(spec 6절 목록 + `xn--` 시작 + `www`,`api`,`admin`,`mail`,`smtp`,`imap`,`pop`,`ftp`,`ns`,`ns1`,`ns2`,`mx`,`dev`,`staging`,`test`,`status`,`auth`,`login`,`static`,`assets`,`cdn`,`app`,`docs`,`blog`,`domains`,`guide`,`tips`,`haejwo`,`explore`,`dshs`,`root`,`support`,`help`,`security`).
- `type HostKey = 'vercel' | 'netlify' | 'github-pages' | 'render'`
- `HOST_PRESETS: Record<HostKey, HostPreset>` — `HostPreset = { key; label; detect: RegExp; cnameTarget: RegExp; prefillFromUrl: boolean; allowsVercelTxt: boolean; settingsUrl: string; steps: string[]; notFound: (status: number, headers: Headers, body: string) => boolean }`
  - vercel: detect `/\.vercel\.app$/`, cname `/^(cname\.vercel-dns\.com|cname\.vercel-dns-\d{1,4}\.com|[a-z0-9]{8,32}\.vercel-dns-\d{1,4}\.com)$/`, prefill false, allowsVercelTxt true, notFound = 404 && header `x-vercel-error` 존재.
  - netlify: detect/cname `/^[a-z0-9-]+\.netlify\.app$/`, prefill true, notFound = 404 && body에 `Not Found - Request ID`.
  - github-pages: detect/cname `/^[a-z0-9-]+\.github\.io$/`, prefill true(호스트만), notFound = 404 && body에 `There isn't a GitHub Pages site here`.
  - render: detect/cname `/^[a-z0-9-]+\.onrender\.com$/`, prefill true, notFound = 404 && header `x-render-routing` 값에 `no-server` 포함.
  - `steps`·`settingsUrl`(Vercel `https://vercel.com/dashboard`, Netlify `https://app.netlify.com`, GitHub `https://docs.github.com/ko/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-a-subdomain`, Render `https://dashboard.render.com`)은 해요체 2~3줄.
- `detectHost(projectUrl: string): { host: HostKey; prefill: string | null } | null`
- `validateTarget(host: HostKey, target: string): string | null` — 소문자·끝 점 제거 후 패턴 통과면 정규화값, 아니면 null.
- `type TxtInput = { name: string; value: string }`
- `validateTxt(host: HostKey, label: string, txt: TxtInput): TxtInput | null` — 이름은 `<anything>.<label>.dshs.dev`(라벨 아래) 허용, 또는 (`allowsVercelTxt` && 이름 `_vercel.dshs.dev` && 값이 `vc-domain-verify=<label>.dshs.dev,`로 시작). 값 1~255자, 출력은 FQDN 이름. 그 밖은 null.
- `extractToken(html: string): string | null` — `<meta>` 태그 중 `name="dshs-verify"`(따옴표 ' 또는 ", 속성 순서 무관, 대소문자 무시)의 `content`.
- `type CheckResult = { kind: 'ok' } | { kind: 'unreachable'; detail: string } | { kind: 'not_found_page' } | { kind: 'no_token' }`
- `type Fetcher = (url: string) => Promise<{ status: number; headers: Headers; body: string; location: string | null }>` (본문 256KB 자르기·타임아웃은 Fetcher 책임)
- `checkSite(fqdn: string, token: string, host: HostKey, fetcher: Fetcher): Promise<CheckResult>` — `https://<fqdn>/` 요청, 3xx면 `location`이 같은 호스트일 때만 최대 3번 따라감(아니면 `unreachable`), 최종 2xx에서 `extractToken === token`이면 ok; 아니면 `https://<fqdn>/.well-known/dshs-verify.txt` 2xx 본문 trim이 token이면 ok; 프리셋 `notFound`면 `not_found_page`; 2xx인데 토큰 없음 `no_token`; 그 외 `unreachable`. Fetcher가 throw하면 `unreachable`.

- [ ] Step 1: `name.test.ts` — `normalizeName(' Meal ')==='meal'`, `validateName('ab')` length, `'meal_app'` chars, `'-meal'` chars, `'www'` reserved, `'xn--abc'` reserved, `'meal-alarm'` ok, 31자 length.
- [ ] Step 2: `hosts.test.ts` — `detectHost('https://meal-alarm.vercel.app/')` → `{host:'vercel', prefill:null}`; netlify url → prefill `'x.netlify.app'`; `'https://example.com'` → null; `validateTarget('vercel','D1D4FC829FE7BC7C.vercel-dns-017.com.')` → 소문자 정규화값; `validateTarget('netlify','evil.com')` null; `validateTarget('github-pages','1.2.3.4')` null; `validateTxt('vercel','meal',{name:'_vercel.dshs.dev', value:'vc-domain-verify=meal.dshs.dev,abc'})` 통과; 같은데 값이 `bus.dshs.dev` → null; `validateTxt('github-pages','meal',{name:'_github-pages-challenge-octo.dshs.dev',...})` null; `{name:'_acme.meal.dshs.dev'}` 통과; `{name:'_acme.bus.dshs.dev'}` null.
- [ ] Step 3: `verify.test.ts` — content 앞/뒤 순서 둘 다 추출; 토큰 일치 ok; 다른 토큰 no_token; `.well-known` 대체 ok; 301 → `https://evil.vercel.app/` → unreachable; 301 같은 호스트 `/ko` → 따라가서 ok; vercel 404 + `x-vercel-error` → not_found_page; fetcher throw → unreachable.
- [ ] Step 4: 실패 확인 → 구현 → `npm test` 통과. 커밋 `feat(domains): 이름·호스트 프리셋·소유 확인 순수 로직`.

### Task 3: DB — `subdomains` 테이블·함수·RLS

**Files:**
- Create: `supabase/migrations/20261025100000_subdomains.sql`, `docs/22-supabase-subdomains.sql`(같은 내용 + 머리 주석 "운영 재실행 금지"), `docs/22-supabase-subdomains-verify.sql`(BEGIN … ROLLBACK)
- Modify: `src/lib/types.ts`(Tables `subdomains`, Functions 아래 시그니처)

**Interfaces (SQL):**
- 테이블 `public.subdomains`: `id uuid pk default gen_random_uuid()`, `name text not null check (name ~ '^[a-z0-9]([a-z0-9-]{1,28})[a-z0-9]$' and name !~ '^xn--')`, `project_id uuid references projects(id) on delete set null`, `owner_id uuid not null references users(id) on delete cascade`, `host text check (host in ('vercel','netlify','github-pages','render'))`, `target text`, `txt_records jsonb not null default '[]'`, `cf_record_ids text[] not null default '{}'`, `status text not null default 'reserved' check (status in ('reserved','pending','active','broken','released','revoked'))`, `verify_token text not null default replace(gen_random_uuid()::text,'-','')`, `ever_active bool not null default false`, `broken_since timestamptz`, `checked_at timestamptz`, `released_reason text`, `revoked_reason text`, `revoked_by uuid`, `created_at`, `updated_at`(트리거).
- 부분 UNIQUE: `(name) where status in ('reserved','pending','active','broken','revoked')`, `(project_id) where status in ('reserved','pending','active','broken')`.
- 예약어 표 `public.subdomain_reserved(name text pk)` — Task 2 `RESERVED_NAMES`와 같은 목록. 함수가 확인.
- 트리거 `subdomains_limit` BEFORE INSERT: `pg_advisory_xact_lock(hashtext('subdomains:'||owner_id))` 후 살아 있는 행 ≥3이면 `RAISE 'limit'`.
- 트리거 `projects_block_delete_with_subdomain` BEFORE DELETE ON projects: 살아 있는 주소 있으면 `RAISE 'project_has_subdomain'`.
- RLS: enable, SELECT `owner_id = auth.uid() OR is_admin()`. 쓰기 정책 없음. `subdomain_reserved`는 SELECT true.
- 함수(모두 `security definer`, `set search_path = public`, `REVOKE ALL … FROM public, anon, authenticated; GRANT EXECUTE … TO service_role`), 오류는 `RAISE EXCEPTION '<code>' USING ERRCODE='P0001'`:
  - `subdomain_reserve(p_user uuid, p_project uuid, p_name text) returns uuid` — 프로젝트 `author_id = p_user` 아니면 `not_owner`, `'website' = ANY(types)` 아니거나 url 없음 `not_website`, 형식 `name_invalid`, 예약어 `name_reserved`, 이름 중복(unique_violation 잡아서) `name_taken`, 프로젝트 중복 `project_has_subdomain`, 트리거 `limit`.
  - `subdomain_connect(p_user uuid, p_id uuid, p_host text, p_target text, p_txt jsonb, p_record_ids text[]) returns void` — 소유자·상태(`reserved|pending|broken`) 확인 → host/target/txt/record_ids 저장, status `pending`, `broken_since` null. (기존 레코드 id는 액션이 미리 지움)
  - `subdomain_record_check(p_id uuid, p_ok boolean, p_now timestamptz) returns text` — ok면 `active`, `ever_active=true`, `broken_since=null`; 아니면 `active|broken`→`broken`(broken_since 없으면 p_now), `reserved|pending`은 그대로. `checked_at=p_now`. 새 상태 반환.
  - `subdomain_release(p_actor uuid, p_id uuid, p_reason text) returns text[]` — 소유자 또는 관리자(이메일 = 개발자 계정), 살아 있는 상태만 → `released`, `released_reason`, 반환은 지울 `cf_record_ids`(행에서는 비움).
  - `subdomain_revoke(p_admin uuid, p_id uuid, p_reason text) returns text[]` — 관리자만(`not_admin`), 이유 1~200자 → `revoked`, `revoked_by`, 반환 `cf_record_ids`.
  - `subdomain_unblock(p_admin uuid, p_id uuid) returns void` — 관리자만, `revoked` → `released`(이름 풀림).
  - `subdomain_set_url(p_user uuid, p_id uuid) returns void` — 소유자·`active`일 때 `projects.url = 'https://'||name||'.dshs.dev'`.
- 관리자 판정은 SQL 함수 `public.is_developer_user(p_user uuid)`: `users.email = 'ts250024@ts.hs.kr'`.

- [ ] Step 1: migration 작성(재실행 안전 X — 새 migration 전용, `docs/21` 머리에 "DROP 없음, 운영 재실행 금지" 명시).
- [ ] Step 2: verify SQL — `BEGIN; set local role service_role;` 가짜 user·website 프로젝트 4개 만들고 reserve 3번 성공·4번째 `limit`; 같은 이름 `name_taken`; `www` `name_reserved`; 남의 프로젝트 `not_owner`; 살아 있는 주소 있는 프로젝트 DELETE → `project_has_subdomain`; release 후 같은 이름 재예약 성공; revoke 후 재예약 `name_taken`; `set local role authenticated` + `request.jwt.claims`로 남의 행 SELECT 0행, INSERT 거부. `ROLLBACK;`
- [ ] Step 3: `supabase db push` (원격에 로컬에 없는 migration이 있으면 멈추고 보고) → `supabase db query --linked -f docs/22-supabase-subdomains-verify.sql`(또는 psql)로 검증, 모두 기대대로.
- [ ] Step 4: `types.ts`에 행·함수 타입 추가, `tsc` 0 오류. 커밋 `feat(db): subdomains 테이블·service_role 전용 함수`.

### Task 4: Cloudflare DNS 클라이언트

**Files:**
- Create: `src/lib/domains/cloudflare.ts`, `cloudflare.test.ts`

**Interfaces:**
- `type DnsRecordInput = { type: 'CNAME' | 'TXT'; name: string; content: string }`
- `type DnsClient = { create(rows: DnsRecordInput[], rowId: string): Promise<string[]>; remove(ids: string[]): Promise<void>; listManaged(): Promise<{ id: string; name: string; comment: string }[]> }`
- `createDnsClient(opts: { token: string; zoneId: string; fetch?: typeof fetch }): DnsClient` — `POST /zones/{zone}/dns_records` 바디 `{type,name,content,ttl:1,proxied:false,comment:'dshs-subdomain:'+rowId}`(TXT content는 따옴표로 감쌈); create 중 하나라도 실패하면 이미 만든 것 지우고 throw `DnsError`; remove는 404를 성공으로 취급; listManaged는 `comment.startswith=dshs-subdomain:` 페이지네이션(per_page 100).
- `getDnsClient(): DnsClient` — env `CLOUDFLARE_DNS_API_TOKEN`·`CLOUDFLARE_ZONE_ID` 없으면 **개발에서만** 메모리 가짜(콘솔에 `[dns:fake]`), 운영에서 없으면 throw.

- [ ] Step 1: 테스트(가짜 fetch) — create 바디에 `proxied:false`·comment 포함; 두 번째 생성 실패 시 첫 id DELETE 호출 후 throw; remove 404 무시; listManaged 2페이지 합침.
- [ ] Step 2: 실패 → 구현 → 통과. 커밋 `feat(domains): Cloudflare DNS 클라이언트`.

### Task 5: 서버 액션·읽기

**Files:**
- Create: `src/lib/domains/actions.ts`('use server', `(nav)` 밖), `src/lib/domains/read.ts`, `src/lib/domains/connect.ts` + `connect.test.ts`(액션의 순수 핵심: CF 성공 후 DB 실패 시 보상)
- Consumes: Task 2·3·4.

**Interfaces:**
- `type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string }` — 오류 문구는 해요체, RPC 코드 → 문구 맵(`limit` "주소는 3개까지 받을 수 있어요." 등).
- `checkNameAvailable(name: string): Promise<ActionResult<{ available: boolean; reason?: string }>>` (로그인 필요, admin client로 살아 있는 행·예약어 조회)
- `reserveSubdomain(projectId: string, name: string): Promise<ActionResult<{ id: string }>>`
- `connectHost(id: string, host: HostKey, target: string, txt: TxtInput[]): Promise<ActionResult>` — 검증(`validateTarget`/`validateTxt`, TXT 최대 2개) → 기존 `cf_record_ids` 있으면 삭제 → `runConnect`.
- `runConnect(deps: { dns: DnsClient; rpcConnect: (ids: string[]) => Promise<void> }, rows: DnsRecordInput[], rowId: string): Promise<void>` (`connect.ts`) — create → rpc 실패 시 `dns.remove(ids)` 후 throw.
- `verifySubdomain(id: string): Promise<ActionResult<{ result: CheckResult['kind']; status: string }>>` — `assertSafePublicUrl` 통과 후 `checkSite`, `subdomain_record_check` 호출.
- `applyProjectUrl(id: string): Promise<ActionResult>`, `releaseSubdomain(id: string): Promise<ActionResult>`, `revokeSubdomain(id: string, reason: string)`, `unblockSubdomain(id: string)`.
- 모든 액션: `getUser()` → 없으면 "로그인이 필요해요." → `isAllowedEmail` → admin client RPC. 끝에 `revalidatePath('/domains')`.
- `read.ts`: `listMyDomainProjects(userId)` → `{ project: {id,title,url,icon_url,types}; domain: SubdomainRow | null }[]`(웹사이트+url 프로젝트 + url 없는 웹사이트 프로젝트는 `disabled: true`), `listAllSubdomains()`(관리자용, admin client).
- 서버 쪽 Fetcher(`fetchForCheck`)는 `fetch(url,{redirect:'manual', signal: AbortSignal.timeout(10000)})` + 본문 256KB 자르기 — `src/lib/domains/fetch-site.ts`(Task 8 스크립트와 공유, 상대 import만).

- [ ] Step 1: `connect.test.ts` — rpc 실패 시 remove가 생성된 id로 호출되고 에러 전파; 성공 시 remove 없음.
- [ ] Step 2: 구현, `npm test`·`tsc` 통과. 커밋 `feat(domains): 주소 서버 액션`.

### Task 6: 프로젝트 삭제를 서버 액션으로

**Files:**
- Create: `src/lib/projects/actions.ts` (`deleteProject(projectId: string): Promise<{ ok: true } | { ok: false; error: string }>`)
- Modify: `src/components/projects/project-form.tsx:384-403`(handleDelete가 액션 호출), 삭제 Dialog 문구, `src/app/(nav)/projects/[id]/edit/page.tsx`(살아 있는 주소 이름을 `ProjectForm`에 `subdomainName?: string` prop으로)

- [ ] Step 1: `deleteProject` — getUser → 프로젝트 `author_id` 확인(아니면 거부) → 살아 있는 주소 있으면 `subdomain_release(user, id, 'project_deleted')` + `dns.remove` → 사용자 클라이언트로 `projects.delete()`(RLS). `revalidatePath('/explore')`, `/domains`.
- [ ] Step 2: Dialog에 `subdomainName`이 있으면 "이 프로젝트의 주소 `{name}.dshs.dev`도 반납돼요." 한 줄.
- [ ] Step 3: dev에서 주소 없는 프로젝트 삭제 정상 동작 확인, `tsc`. 커밋 `feat(projects): 삭제를 서버 액션으로, 주소 함께 반납`.

### Task 7: `/domains` 화면·내비·관리자

**Files:**
- Create: `src/app/(nav)/domains/page.tsx`, `src/app/(nav)/domains/loading.tsx`, `src/app/(nav)/domains/admin/page.tsx`, `src/components/domains/domain-project-row.tsx`(client), `domain-steps.tsx`(client), `host-picker.tsx`(client), `admin-domain-table.tsx`(client)
- Modify: `src/lib/section-colors.ts`(`domains` 키: pill `bg-teal-700`, tile `bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300`, button `bg-teal-700 hover:bg-teal-800 text-white`, chip=tile, text `text-teal-700 dark:text-teal-300`, border `border-teal-700 dark:border-teal-400`), `src/components/shared/page-nav.tsx`(가이드 다음 `{ href: '/domains', label: '주소 받기', icon: Globe }`, `resolveActive`에 `/domains`), `src/middleware.ts`(`PROTECTED_PREFIXES`에 `/domains`)

- 페이지(force-dynamic): `PageHero` → 목록 머리 "내 웹사이트 프로젝트" + "주소 N / 3" → 줄 목록. 관리자면 머리 액션에 "전체 주소" 링크(`/domains/admin`). 빈 상태: "웹사이트 프로젝트를 등록하면 주소를 받을 수 있어요" + `/projects/new` 링크.
- 줄: 아이콘(`ProjectIcon`) · 제목 · 주소/`url` · 상태 알약(받기 전 버튼 "주소 받기" / reserved·pending "설정 이어서 하기" / active "연결됨" emerald / broken "끊김 · N일 뒤 자동 반납" amber / revoked "회수됨 · 이유" rose). url 없는 줄은 회색 + "방문 주소가 있어야 받을 수 있어요"(수정 링크). 한 번에 한 줄만 펼침(`aria-expanded`).
- `DomainSteps`: ① 이름 입력(`[ ].dshs.dev`, 400ms 디바운스 `checkNameAvailable`, 확정 버튼 "이 이름으로 할게요") ② `HostPicker`(4개 카드, `detectHost`로 미리 고름 + "자동으로 골랐어요", 프리셋 `steps`·`settingsUrl` 링크, CNAME 입력(prefill), Vercel이면 "TXT 확인값을 달라고 하면" 접힘 입력 2칸, "연결하기") ③ 확인 코드 박스(meta 한 줄 + 복사 버튼 + "AI에게 이 줄을 사이트 `<head>`에 넣어 달라고 하세요" + `.well-known` 대안 접힘) + "확인하기" → 결과별 문구(unreachable "아직 열리지 않아요. 호스트에 주소를 등록했는지 확인하고, 인증서 발급에 몇 분 걸릴 수 있어요." / not_found_page "호스트가 이 주소의 사이트를 찾지 못해요. 호스트 설정에 meal.dshs.dev를 추가했는지 확인해요." / no_token "사이트는 열리는데 확인 코드가 안 보여요. 코드를 넣고 다시 배포해요."). active면 제안 띠 "방문 주소를 x.dshs.dev로 바꿀까요? [바꾸기]"(url이 이미 같으면 숨김). 줄 메뉴 "반납하기"(shadcn Dialog).
- 관리자 페이지: `isDeveloper` 아니면 `notFound()`. 표(이름·상태·호스트·대상·소유자 닉네임·만든 날) + "회수"(Dialog, 이유 필수) / revoked면 "이름 풀기".
- 모바일: 호스트 카드 2열, 입력·버튼 세로.

- [ ] Step 1: 섹션 색·내비·미들웨어·loading(`ListPageSkeleton`) 추가.
- [ ] Step 2: 페이지·컴포넌트 구현.
- [ ] Step 3: `npx tsc --noEmit`, `npm run lint` 0 오류. dev에서 로그인 후(가짜 DNS) 예약 → 연결 → 확인(no_token/unreachable 문구) → 반납 흐름, 모바일 360px 스크린샷, 비로그인 `/domains` → `/login?next=/domains`.
- [ ] Step 4: 커밋 `feat(domains): 주소 받기 화면·내비·관리자 회수`.

### Task 8: 매일 점검 작업

**Files:**
- Create: `src/lib/domains/check.ts` + `check.test.ts`, `scripts/check-subdomains.mts`, `.github/workflows/check-subdomains.yml`
- Consumes: Task 2 `checkSite`, Task 4 `createDnsClient`, Task 5 `fetch-site.ts`

**Interfaces:**
- `decide(row: { status; created_at; broken_since; ever_active }, result: CheckResult, now: Date): { ok: boolean; release: null | 'broken_7d' | 'never_connected_7d' }` — ok면 release null; broken_since(또는 지금 처음 깨짐이면 now)가 7일 넘으면 `broken_7d`; `ever_active=false`이고 `created_at` 7일 넘으면 `never_connected_7d`.
- 스크립트: 살아 있는 행 조회(service role) → `reserved`는 확인 없이 7일 규칙만, 나머지는 `checkSite` → `subdomain_record_check` → release면 `subdomain_release(null, id, reason)`(service 경로: `p_actor` null 허용 — Task 3 함수에서 `p_actor IS NULL`은 service 전용 호출로 허용) + `dns.remove`. 그다음 `listManaged()` 대조: comment의 행 id가 살아 있는 행이 아니면 삭제. `--dry-run`은 쓰기 없이 로그만. 실패 1개라도 있으면 exit 1. 로그에는 이름·상태만.
- 워크플로: sync-readmes.yml 복제, cron `'30 18 * * *'`(03:30 KST), secrets `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDFLARE_DNS_API_TOKEN`, `CLOUDFLARE_ZONE_ID`.

- [ ] Step 1: `check.test.ts` — ok → 반납 없음; broken_since 8일 전 + 실패 → broken_7d; 처음 실패(broken_since null) → 반납 없음; ever_active false + created 8일 전 → never_connected_7d; ever_active true + created 30일 전 + 실패 + broken_since 2일 → 반납 없음.
- [ ] Step 2: 구현 → 통과. `node scripts/check-subdomains.mts --dry-run` 로컬 실행 오류 없음.
- [ ] Step 3: 커밋 `feat(domains): 매일 주소 점검·고아 레코드 정리`.

### Task 9: 연결점·문서·비밀

**Files:**
- Modify: `src/content/guides/register.md`(마지막 `[!ok]` 뒤 `---` + 새 단계 "## 내 주소 받기" — 웹사이트면 `/domains`에서 `이름.dshs.dev`를 받을 수 있다는 2~3문장 + `[!ok]` "주소 받기 화면에서 '연결됨'이 보여요."), `src/app/(nav)/projects/[id]/(detail)/page.tsx`(정보 카드에 active 주소 "주소" 행 — admin client로 `name` 조회), `CLAUDE.md`·`AGENTS.md`(새 절 「🌐 주소 받기」, 환경변수 2개, 보안: `.dshs.dev` 쿠키 금지·`__Host-`·Origin 가드·쿠키 폭탄은 회수로 대응), `docs/19-cloudflare-workers.md`(DNS 토큰 만드는 법), `src/content/guides/README.md` 영향 없음 확인.
- 비밀: `npx wrangler secret put CLOUDFLARE_DNS_API_TOKEN`, `CLOUDFLARE_ZONE_ID`는 `wrangler.jsonc` `vars`; `gh secret set CLOUDFLARE_DNS_API_TOKEN`, `CLOUDFLARE_ZONE_ID`.

- [ ] Step 1: 가이드·상세·문서 수정, `node scripts/gen-guide-fragments.mjs`, `npm test`, `tsc`, `npm run lint`, `npm run build`.
- [ ] Step 2: 비밀 설정. 커밋 `docs(domains): 가이드 단계·문서·상세 주소 표시`.
