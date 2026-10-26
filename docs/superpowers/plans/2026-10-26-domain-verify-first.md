# 도메인 확인 먼저 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 소유 확인 전에는 `<이름>.dshs.dev`가 경고 페이지로 가고, 확인(학생 사이트 원래 주소에서) 뒤에만 진짜 연결을 만든다.

**Architecture:** 예약 때 자리표시(proxied AAAA + 경로 안 붙는 Bulk Redirect → `dshs.dev/pending-domain/<이름>`)를 만든다. ②에서 학생 사이트 원래 주소의 토큰을 확인해 DB에 기록하고, ③ `connectHost`가 자리표시를 지우고 CNAME·TXT(바로가기는 AAAA+목록 항목)를 만든다. DB 함수가 확인 없는 연결을 막는다.

**Tech Stack:** Next.js 16 App Router, Supabase(plpgsql, service_role 전용 함수), Cloudflare DNS + Bulk Redirects, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-26-domain-verify-first-design.md`

## Global Constraints

- 순수 로직(`src/lib/domains/*.ts`)은 상대 `.ts` import만 쓰고 `npm test`로 검증한다.
- 새 DB 함수는 `REVOKE ALL … FROM PUBLIC, anon, authenticated; GRANT EXECUTE … TO service_role;`.
- 운영 DB 변경은 새 migration + `supabase db push`. `docs/22-supabase-subdomains.sql` 사본도 갱신한다.
- 문구는 해요체·쉬운 말. 색은 `SECTION_COLORS.domains`(teal)만 주 버튼에. `transition-all` 금지.
- 서버 액션은 `src/lib/domains/actions.ts`(`(nav)` 밖)에 둔다.
- 로그(Actions 공개)에는 주소 이름만 찍는다.
- 실측: Cloudflare 목록에서 없는 항목 id를 DELETE하면 성공한다(2026-10-26) → `RedirectClient.remove` 수정 불필요.

## Review Focus

- 자리표시 만들기 실패(목록 env 없음·CF 오류) → 예약은 성공, 이후 ③은 정상 동작(지울 id가 없을 뿐).
- ②에서 GitHub Pages 프로젝트 사이트 `https://me.github.io/repo/`(경로 있음) → meta를 그 경로에서 찾는다.
- 이미 연결된(active) 주소에서 원래 주소를 새로 넣고 확인 실패 → 기존 연결·상태는 그대로.
- 바로가기 행인데 `redirect:` 항목이 없으면 토큰이 보여도 "연결됨"이 되지 않는다.
- 6일째 확인·7일째 연결한 주소 → 연결 직후 매일 점검에서 반납되지 않는다.

---

### Task 1: 순수 로직 — 원래 주소 판정·기준 URL 확인·문구

**Files:**
- Modify: `src/lib/domains/hosts.ts`, `src/lib/domains/verify.ts`, `src/lib/domains/ai-prompt.ts`
- Test: `src/lib/domains/hosts.test.ts`, `verify.test.ts`, `ai-prompt.test.ts`

**Interfaces:**
- Produces:
  - `siteAddressFor(raw: string): { host: HostKey; hostname: string; url: string } | null` — `url`은 `https://<hostname><path>`(쿼리·해시 제거, 경로 끝 `/` 보장). https만. 호스트 = `detect`가 맞는 프리셋. 바로가기·`prefillFromUrl` 호스트는 `hostname`이 그 프리셋 `cnameTarget`도 통과해야 함. vercel: `^[a-z0-9-]+\.vercel\.app$`, railway: `^[a-z0-9-]+\.up\.railway\.app$`. 경로는 github-pages·gitlab-pages만 허용(그 밖은 경로 버림).
  - `targetBoundToSite(host: HostKey): boolean` — 바로가기 + `prefillFromUrl` 호스트면 true(= netlify, cloudflare-pages, github-pages, gitlab-pages, render, cloudflare-workers, firebase).
  - `checkSite(base: string, token, host, fetcher)` — 첫 인자를 `fqdn`에서 **기준 URL**(`https://…/` 끝 `/`)로 바꾼다. meta는 `base`, 파일은 `base + '.well-known/dshs-verify.txt'` → 실패면 `https://<host>/.well-known/dshs-verify.txt`(경로가 `/`가 아닐 때만 두 번째 시도). 기존 호출부는 `https://${fqdn}/`로 바꾼다.
  - `buildVerifyPrompt({ name, token, host, siteUrl })` — `target` 대신 `siteUrl: string`(원래 주소). 첫 두 줄:
    - 연결: `내 웹사이트(${siteUrl})에 https://dshs.dev 서비스로 ${fqdn} 주소를 붙이려고 해.` / `먼저 이 사이트가 내 것이라는 걸 확인하는 코드를 넣고 다시 배포해 줘.`
    - 바로가기: `내 웹사이트(${siteUrl})에 https://dshs.dev 서비스로 ${fqdn} 바로가기 주소를 붙이려고 해.` / 둘째 줄 같음.
    - 마지막 확인 주소는 둘 다 `${siteUrl}`. 나머지 줄 그대로.

- [ ] **Step 1: 실패 테스트 작성** — `hosts.test.ts`에 `test('siteAddressFor', …)`:
  `siteAddressFor('https://omm.vercel.app/x?y=1')` → `{host:'vercel', hostname:'omm.vercel.app', url:'https://omm.vercel.app/'}`;
  `'https://me.github.io/repo'` → `url:'https://me.github.io/repo/'`, host `github-pages`;
  `null` for `'http://omm.vercel.app'`, `'https://omm.dshs.dev'`, `'https://example.com'`, `'https://a--b.web.app'`, `'https://abc.proj.pages.dev'`, `'https://x.y.vercel.app'`;
  `'https://w.me.workers.dev'` → host `cloudflare-workers`. `targetBoundToSite('vercel')===false`, `('netlify')===true`.
  `verify.test.ts`: 경로 있는 기준 URL에서 meta 찾음, 루트 파일 폴백. `ai-prompt.test.ts`: 새 첫 줄 2종 정확히 비교.
- [ ] **Step 2:** `npm test` → 새 테스트 FAIL.
- [ ] **Step 3:** 구현. `checkSite` 호출부(`actions.ts`, `scripts/check-subdomains.mts`)를 `https://${site}/`로 맞춘다.
- [ ] **Step 4:** `npm test` PASS, `npx tsc --noEmit` 0.
- [ ] **Step 5:** 커밋 `feat(domains): 원래 주소 판정·기준 URL 확인·확인 글 문구`.

### Task 2: 순수 로직 — 자리표시·반납 시계·연결 살아 있음

**Files:**
- Modify: `src/lib/domains/redirects.ts`, `activate.ts`, `check.ts`
- Test: `redirects.test.ts`, `activate.test.ts`, `check.test.ts`

**Interfaces:**
- Produces:
  - `redirectItemBody(source, target, rowId, keepPath = true)` — `keepPath=false`면 `preserve_path_suffix:false, preserve_query_string:false`(subpath_matching은 true 유지). `RedirectClient.add(item: { source; target; keepPath?: boolean }, rowId)`(가짜 클라이언트도).
  - `PLACEHOLDER_PATH = '/pending-domain/'`, `placeholderTarget(name) = 'https://dshs.dev/pending-domain/' + name`(activate.ts).
  - `createPlaceholder(deps: ActivateDeps, row: { id; name }): Promise<void>` — AAAA → 목록 항목(`keepPath:false`) → `setRecords`. 실패 시 만든 것 정리 후 throw. `activateRedirect`와 내부 구현 공유.
  - `activateRedirect`는 그대로(③ 연결에서 `setRecords`로 `subdomain_connect`를 넘겨 재사용). `needsActivation`은 삭제하고 `connectionLive(row: { host; cf_record_ids }): boolean` 추가 — 바로가기 호스트면 `redirect:` id가 있어야 true, CNAME 호스트는 true.
  - `CheckRow`에 `connected_at: string | null`. `decide`: `ever_active=false`면 기준 시각 `max(created_at, connected_at)`.
  - `placeholderWorks(page: FetchedPage, name: string): boolean` — 302 && location === `https://dshs.dev/pending-domain/${name}`.
- [ ] **Step 1: 실패 테스트** — `redirectItemBody('a.dshs.dev/','https://dshs.dev/pending-domain/a','r',false).redirect.preserve_path_suffix===false`; `createPlaceholder` 순서(AAAA content `100::` → add `{target: placeholderTarget('a'), keepPath:false}` → setRecords `[aaaaId, 'redirect:'+itemId]`), add 실패 시 AAAA 삭제; `connectionLive({host:'firebase',cf_record_ids:['x']})===false`; `decide`: created 8일 전·connected 1일 전·ever_active false → release null; `placeholderWorks`.
- [ ] **Step 2:** `npm test` FAIL.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** `npm test` PASS.
- [ ] **Step 5:** 커밋 `feat(domains): 자리표시 바로가기·연결 기준 반납 시계`.

### Task 3: DB migration

**Files:**
- Create: `supabase/migrations/20261026120000_subdomains_verify_first.sql`
- Modify: `docs/22-supabase-subdomains.sql`(같은 내용 덧붙임), `docs/22-supabase-subdomains-verify.sql`, `src/lib/types.ts`(Row 타입에 새 컬럼)

**Interfaces:**
- Produces (모두 SECURITY DEFINER, `search_path=public`, service_role 전용):
  - 컬럼: `site_url text`, `site_host text CHECK (site_host IS NULL OR site_host IN (<host CHECK 9개>))`, `site_verified_at timestamptz`, `connected_at timestamptz`.
  - `subdomain_set_site(p_user uuid, p_id uuid, p_site_url text, p_site_host text) RETURNS void` — 소유자·살아 있는 행. 값이 바뀌면 `site_verified_at = NULL`(같으면 그대로).
  - `subdomain_verify_site(p_user uuid, p_id uuid, p_site_url text) RETURNS void` — 저장된 `site_url = p_site_url`일 때만 `site_verified_at = now()`(다르면 `site_changed`).
  - `subdomain_set_placeholder_records(p_id uuid, p_record_ids text[]) RETURNS void` — `status='reserved'` + `cf_record_ids` 비었을 때만, 아니면 `records_exist`.
  - `subdomain_connect` 교체(시그니처 동일): 기존 검사 + `site_verified_at IS NULL → not_verified`, `p_host <> site_host → host_mismatch`, 묶이는 호스트(netlify, cloudflare-pages, github-pages, gitlab-pages, render, cloudflare-workers, firebase)는 `p_target <> split_part(split_part(site_url,'://',2),'/',1) → target_mismatch`. 성공 시 `connected_at = now()` 추가 기록.
  - 백필: `ever_active` 행 → `site_verified_at=now(), site_host=host`, `site_url = 'https://'||target||'/'`(묶이는 호스트만), `connected_at = updated_at`. 그 밖의 연결된 행(`status in pending/broken`) → `connected_at = updated_at`.
- [ ] **Step 1:** migration 작성. verify SQL에 `not_verified`·`host_mismatch`·`target_mismatch`·`site_changed`·`records_exist` 각 1건 검사(롤백, 끝에 "VERIFY OK").
- [ ] **Step 2:** `supabase db push` 후 `supabase db query --linked -f docs/22-supabase-subdomains-verify.sql` → "VERIFY OK". 운영 `hwip` 행에 `site_verified_at` 채워졌는지 조회.
- [ ] **Step 3:** 커밋 `feat(db): 도메인 확인 먼저 — site_* 컬럼·연결 전 확인 강제`.

### Task 4: 서버 액션·읽기

**Files:**
- Modify: `src/lib/domains/actions.ts`, `src/lib/domains/read.ts`

**Interfaces:**
- Consumes: Task 1·2·3 전부.
- Produces:
  - `DomainView`에 `siteUrl: string | null`, `siteHost: SubdomainHost | null`, `siteVerified: boolean`, `connectedAt: string | null`.
  - `reserveSubdomain`: 예약 성공 뒤 `redirectConfigured()`면 `createPlaceholder`(setRecords = `subdomain_set_placeholder_records`) 시도, 실패는 `console.error`만.
  - `setSiteAddress(id: string, raw: string): Promise<ActionResult<{ siteUrl: string; host: HostKey }>>` — `siteAddressFor` 실패면 `'호스트의 기본 주소(예: 이름.vercel.app)를 넣어요.'`, `assertSafePublicUrl` 통과 필요, `subdomain_set_site` 호출.
  - `verifySubdomain(id)` 분기: `!siteVerified && siteUrl` → `checkSite(siteUrl…)`, ok면 `subdomain_verify_site`, 반환 `{ result, detail, status: row.status, siteVerified: true }`. 그 외(호스트 연결됨) → 실제 주소 확인, `p_ok = result ok && connectionLive(row)`. 반환형에 `siteVerified: boolean` 추가. 활성화 블록 삭제. 둘 다 없으면 `'먼저 ②에서 내 사이트 주소를 넣어요.'`.
  - `connectHost(id, host, rawTarget, rawTxt)`: `!row.site_verified_at` → `'먼저 ②에서 내 사이트를 확인해요.'`; `host !== row.site_host` → 같은 문구 계열 `'②에서 확인한 사이트의 호스트로만 연결할 수 있어요.'`; 바로가기면 target = site hostname(입력 무시), 순서: `removeCloudflare(old)` → `activateRedirect`(setRecords → `subdomain_connect` with ids). CNAME은 기존 `runConnect`.
  - `RPC_ERRORS`에 `not_verified`, `host_mismatch`, `target_mismatch: 'CNAME 값이 ②에서 확인한 사이트 주소와 달라요.'`, `site_changed`.
- [ ] **Step 1:** 구현.
- [ ] **Step 2:** `npx tsc --noEmit` 0, `npm test` PASS.
- [ ] **Step 3:** 커밋 `feat(domains): 확인 먼저 흐름 서버 액션`.

### Task 5: 화면 — 단계 순서·알약·자동 확인

**Files:**
- Modify: `src/components/domains/domain-steps.tsx`, `host-picker.tsx`, `domain-list.tsx`, `use-domain-checks.ts`, `src/components/home/domain-teaser.tsx`

**Interfaces:**
- Consumes: Task 4 `DomainView` 새 필드, `setSiteAddress`, `verifySubdomain`(반환 `siteVerified`).
- Produces:
  - `DomainSteps` 단계: ① 이름 → ② "내 사이트에 확인 코드 넣기"(`SiteStep`: 원래 주소 입력 — 기본값 `domain.siteUrl ?? (siteAddressFor(project.url)?.url)` — "주소 저장" → AI 글 복사·미리 보기·코드 한 줄·파일 방식·"지금 확인하기"·자동 확인 안내; 확인되면 done, 제목 `내 사이트 확인됨 · <hostname>`, "다른 사이트로 바꾸기" 링크) → ③ "호스트에 연결하기"(`HostPicker`, 확인 전 todo) → 연결 뒤 상태 "연결 확인 중… / 연결됨"은 ③ 안에(기존 결과 문구 재사용, 확인 코드 안내는 빼고 "호스트가 인증서를 받는 데 몇 분 걸려요" 한 줄).
  - `HostPicker`: 호스트 카드 대신 `host = domain.siteHost` 고정 표시(라벨만). `prefillFromUrl`·바로가기 호스트는 target을 site hostname으로 채우고 바로가기는 입력칸 없이 "바로가기 만들기"만.
  - `StatusPill`: reserved & !siteVerified → "확인 기다림 · N일 뒤 자동 반납"(기준 createdAt), reserved & siteVerified → "연결 기다림 · N일 뒤 자동 반납", pending & !everActive → "설정 중 · N일 뒤 자동 반납"(기준 max(createdAt, connectedAt)).
  - `useDomainChecks` pollKey: `pending|broken` 또는 (`reserved` && `siteUrl` && `!siteVerified`). 상태가 안 바뀌어도 `siteVerified`가 false→true면 `toast.success('내 사이트가 확인됐어요. 이제 호스트에 연결해요')` + `router.refresh()`.
  - `DomainTeaser` STEPS: 이름 정하기 → 확인 코드 넣기("AI에게 글을 보내 사이트에 코드를 넣어요") → 호스트에 연결("호스트 설정에 주소를 등록해요").
- [ ] **Step 1:** 구현.
- [ ] **Step 2:** `npx tsc --noEmit`, `npm run lint` 통과.
- [ ] **Step 3:** `npm run dev`(가짜 DNS) → `/domains`에서 ①→②(원래 주소 입력, 코드 없음 → "확인 코드가 안 보여요")까지 화면 확인, 360px 폭 가로 스크롤 없음. 서버 로그에 `[dns:fake] create AAAA`·`[redirect:fake] add … pending-domain`이 찍힌다.
- [ ] **Step 4:** 커밋 `feat(domains): 확인 먼저 단계 화면`.

### Task 6: 경고 페이지

**Files:**
- Create: `src/app/(nav)/pending-domain/[name]/page.tsx`, `loading.tsx`(기존 `ListPageSkeleton` 또는 머리 뼈대 재사용)

**Interfaces:**
- Consumes: `validateName`(`name.ts`), `PageHero`.
- Produces: `/pending-domain/<name>` — `validateName` 실패면 `notFound()`. `metadata.robots = { index: false }`. DB 안 읽음(정적). 문구: h1 "아직 연결 확인 전인 주소예요", 설명 "`<이름>.dshs.dev`는 주인이 연결 확인을 마치면 열려요.", 주 버튼 "내 주소라면 연결 마치기" → `/domains`, 보조 "도메인 마련하기 알아보기" → `/`.
- [ ] **Step 1:** 구현. 미들웨어 보호 목록에 넣지 않는다.
- [ ] **Step 2:** dev에서 `/pending-domain/meal` 200·`/pending-domain/-x` 404 확인.
- [ ] **Step 3:** 커밋 `feat(domains): 확인 전 주소 경고 페이지`.

### Task 7: 매일 점검·문서

**Files:**
- Modify: `scripts/check-subdomains.mts`, `CLAUDE.md`, `AGENTS.md`(도메인 절이 있으면), `src/content/guides/register.md`, spec(실측 메모)

**Interfaces:**
- Consumes: `connectionLive`, `placeholderWorks`, `CheckRow.connected_at`.
- Produces: select에 `connected_at` 추가; 활성화 블록 삭제; `p_ok: decision.ok && connectionLive(row)`; 바로가기 점검 옆에 자리표시 점검 1건(`reserved` + `redirect:` id 가진 행 하나, `placeholderWorks` 실패면 failures++).
- [ ] **Step 1:** 구현 후 `node scripts/check-subdomains.mts --dry-run` 통과(운영 읽기만).
- [ ] **Step 2:** CLAUDE.md 「도메인 마련하기」 절을 새 순서·경고 페이지·DB 컬럼·함수로 고침. register.md 안내 순서 "이름 → 확인 코드 → 올린 곳".
- [ ] **Step 3:** 커밋 `docs(domains): 확인 먼저 흐름 반영`.

### Task 8: 마무리

- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` 통과.
- [ ] 리뷰어 1명(sonnet)이 브랜치 전체 diff 검토 → 고칠 것 반영.
- [ ] main에 머지 전 사용자에게 확인(푸시 = 자동 배포).
