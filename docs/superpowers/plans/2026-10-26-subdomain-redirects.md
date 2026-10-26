# 도메인 마련하기 — 바로가기 주소 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cloudflare Workers·Firebase Hosting 프로젝트에 `이름.dshs.dev` 바로가기(302) 주소를 준다.

**Architecture:** 호스트 프리셋에 `mode: 'cname' | 'redirect'`를 두고, redirect 호스트는 연결할 때 DB에만 기록한다. 소유 확인 토큰이 보낼 곳 사이트에서 처음 확인되면 proxied AAAA(`100::`) + Bulk Redirect 목록 항목을 만든다(`activateRedirect`). Cloudflare id는 기존 `cf_record_ids`에 저장하고, 목록 항목 id에는 `redirect:` 접두어를 붙인다. 지울 때는 `removeCloudflare`가 접두어로 나눠 지운다.

**Tech Stack:** Next.js 16 서버 액션, Supabase(plpgsql, service_role RPC), Cloudflare DNS·Lists API v4, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-26-subdomain-redirects-design.md`

## Global Constraints

- 보낼 곳 정규식(앱·DB 동일). Workers `^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$`, Firebase `^[a-z0-9-]+\.(web\.app|firebaseapp\.com)$`이고 `--`가 들어가면 거부한다.
- 호스트 키는 `'cloudflare-workers'`, `'firebase'`, 라벨은 `Cloudflare Workers`, `Firebase Hosting`이다.
- 목록 항목 본문:
  - `source_url: "<이름>.dshs.dev/"`, `target_url: "https://<target>/"`, `status_code: 302`
  - `subpath_matching: true`, `preserve_path_suffix: true`, `preserve_query_string: true`, `include_subdomains: false`
  - `comment: "dshs-subdomain:<행 id>"`
- DNS 레코드는 `AAAA <이름>.dshs.dev 100::`, `proxied: true`, `ttl: 1`, comment는 같은 접두어다.
- 목록은 `dshs_subdomain_redirects`(kind `redirect`)이고 PUT(전체 교체)은 금지한다.
- 환경변수 `CLOUDFLARE_LISTS_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_REDIRECT_LIST_ID`를 쓴다. 개발은 메모리 가짜를 쓰고, `DOMAINS_REAL_DNS=1`일 때만 진짜를 쓴다.
- 바로가기는 토큰 확인 성공 뒤에만 만들고, 끊김 동안은 유지하고, 반납·회수·탈퇴·프로젝트 삭제 때 지운다.
- 공개 저장소이므로 Actions 로그에는 주소 이름만 남긴다.
- 해요체 카피를 쓰고, 섹션 색(teal)은 주 버튼에만 쓴다. `transition-all`은 금지다.
- DB 변경은 새 migration + `supabase db push`로 한다. `docs/22`는 사본에 덧붙이기만 한다.
- 공유 작업 트리이므로 커밋은 내 파일만 `git add <경로>`로 하고, `stash`는 금지다.

## Review Focus

1. 자동 확인(20초)과 "지금 확인하기"가 동시에 같은 주소를 활성화한다. Cloudflare에는 레코드·항목이 하나만 남아야 하고 DB 기록도 하나여야 한다. → Task 5의 `activateRedirect` 경합 테스트가 맡는다.
2. 활성화 도중 목록 추가가 실패한다. 방금 만든 AAAA를 지우고 상태를 그대로 둬야 한다. → Task 5 테스트가 맡는다.
3. 바로가기 ↔ CNAME 호스트로 다시 연결한다. 옛 AAAA와 목록 항목이 모두 지워져야 한다. → Task 4(`removeCloudflare` 접두어 분리) + Task 5 테스트가 맡는다.
4. 프로젝트 url이 `https://foo.acct.workers.dev/app?x=1`이다. 미리 채우는 값은 호스트 이름 `foo.acct.workers.dev`뿐이어야 한다. → Task 1 테스트가 맡는다.
5. 운영에 목록 env가 없는데 학생이 Workers를 고른다. 친절한 오류가 나와야 하고, CNAME 호스트는 영향받지 않아야 한다. → Task 3 테스트(`getRedirectClient` 오류)와 Task 5의 액션 오류 문구가 맡는다.

---

### Task 1: 호스트 프리셋 · 보낼 곳 검사 · AI 문구

**Files:**
- Modify: `src/lib/domains/hosts.ts`, `src/lib/domains/ai-prompt.ts`, `src/lib/types.ts:24`
- Test: `src/lib/domains/hosts.test.ts`, `src/lib/domains/ai-prompt.test.ts`

**Interfaces:**
- Produces:
  - `HostKey`에 `'cloudflare-workers' | 'firebase'`를 추가한다(`SubdomainHost`도 같이).
  - `HostPreset.mode: 'cname' | 'redirect'`(기존 7개는 `'cname'`)
  - `isRedirectHost(host: HostKey | null): boolean`
  - `siteHostFor(row: { name: string; host: HostKey; target: string | null }): string` — redirect이면 target, 아니면 `<name>.dshs.dev`
  - `buildVerifyPrompt({ name, token, host, target })` — target은 `string | null`

- [ ] **Step 1: 실패하는 테스트**

```ts
test('바로가기 호스트: 기본 주소만 받는다', () => {
  assert.equal(validateTarget('cloudflare-workers', 'Hello.Acct.workers.dev.'), 'hello.acct.workers.dev')
  assert.equal(validateTarget('cloudflare-workers', 'acct.workers.dev'), null)        // 워커 이름 없음
  assert.equal(validateTarget('cloudflare-workers', 'evil.com'), null)
  assert.equal(validateTarget('firebase', 'my-site.web.app'), 'my-site.web.app')
  assert.equal(validateTarget('firebase', 'my-site.firebaseapp.com'), 'my-site.firebaseapp.com')
  assert.equal(validateTarget('firebase', 'my-site--pr12-abc.web.app'), null)          // 미리보기 채널
})
test('workers.dev·web.app 프로젝트는 바로가기 호스트로 미리 고르고 호스트 이름만 채운다', () => {
  assert.deepEqual(detectHost('https://foo.acct.workers.dev/app?x=1'), { host: 'cloudflare-workers', prefill: 'foo.acct.workers.dev' })
  assert.deepEqual(detectHost('https://site.web.app'), { host: 'firebase', prefill: 'site.web.app' })
  assert.deepEqual(detectHost('https://site--ch-1.web.app'), { host: 'firebase', prefill: null })
})
test('isRedirectHost / siteHostFor', () => {
  assert.equal(isRedirectHost('firebase'), true)
  assert.equal(isRedirectHost('vercel'), false)
  assert.equal(isRedirectHost(null), false)
  assert.equal(siteHostFor({ name: 'meal', host: 'firebase', target: 'site.web.app' }), 'site.web.app')
  assert.equal(siteHostFor({ name: 'meal', host: 'vercel', target: 'x.vercel-dns-017.com' }), 'meal.dshs.dev')
})
test('바로가기 호스트는 TXT 를 받지 않는다', () => {
  assert.equal(HOST_PRESETS['cloudflare-workers'].txt, null)
  assert.equal(HOST_PRESETS.firebase.txt, null)
})
```
`ai-prompt.test.ts`에 추가할 테스트:
- `buildVerifyPrompt({ name: 'meal', token: 't0k', host: 'cloudflare-workers', target: 'meal.acct.workers.dev' })`
  - 첫 줄에 `meal.dshs.dev 바로가기 주소`가 있다.
  - `https://meal.acct.workers.dev`가 들어 있다.
  - `<meta name="dshs-verify" content="t0k">`가 들어 있다.
  - `wrangler deploy`가 들어 있다.
  - `로 변경했어`는 들어 있지 않다.
- Firebase 버전에는 `firebase deploy`와 `public/index.html`이 들어 있다.
- 기존 cname 문구 테스트는 그대로 통과해야 한다.

- [ ] **Step 2: 실패 확인** — `npm test` → 새 테스트가 FAIL한다(`cloudflare-workers` 키 없음).

- [ ] **Step 3: 구현**
  - 프리셋 두 개를 추가한다. `detect`는 `/\.workers\.dev$/`, `/\.(web\.app|firebaseapp\.com)$/`이고 `prefillFromUrl: true`, `txt: null`, `notFound: () => false`(Task 7에서 실측 후 고칠 수 있음)다.
  - `settingsUrl`은 Workers `https://dash.cloudflare.com/?to=/:account/workers-and-pages`, Firebase `https://console.firebase.google.com/`다.
  - Firebase `cnameTarget`은 정규식 하나로 `--`까지 막는다: `/^(?!.*--)[a-z0-9-]+\.(web\.app|firebaseapp\.com)$/`. `detectHost`의 `prefill`은 이미 `cnameTarget.test`를 거치므로 그대로 둔다.
  - `steps` 문구(그대로 쓴다):
    - Workers:
      - `'호스트 쪽에서 따로 할 일은 없어요. 아래 "보낼 곳 주소"가 내 Worker 기본 주소(워커이름.아이디.workers.dev)인지 확인해요.'`
      - `'버전마다 생기는 미리보기 주소(앞에 글자가 더 붙은 주소)는 곧 사라지니 넣지 말아요.'`
      - `'{fqdn}으로 들어오면 이 주소로 넘어가요. 주소창에는 workers.dev 주소가 보여요.'`
    - Firebase:
      - `'호스트 쪽에서 따로 할 일은 없어요. 아래 "보낼 곳 주소"가 내 사이트 주소(이름.web.app)인지 확인해요.'`
      - `'미리보기 채널 주소(이름--채널.web.app)는 넣을 수 없어요.'`
      - `'{fqdn}으로 들어오면 이 주소로 넘어가요. 주소창에는 web.app 주소가 보여요.'`
  - `targetPlaceholder`는 `'워커이름.아이디.workers.dev'`, `'이름.web.app'`이다.
  - 파일 머리 주석의 "제외" 목록에서 Workers·Firebase를 빼고, "바로가기(redirect)로 지원, 2026-10-26"을 적는다. Cloudflare Pages 3번째 step의 "Workers로 올린 사이트(workers.dev)는 아직 연결할 수 없어요." 문장은 "Workers로 올렸다면 위에서 Cloudflare Workers를 골라요."로 바꾼다.
  - `buildVerifyPrompt` redirect 분기:
    - 첫 줄: `` `내 웹사이트 https://${target} 에 https://${ROOT_DOMAIN} 서비스로 ${fqdn} 바로가기 주소를 받았어.` ``
    - 둘째 줄: `'이 사이트가 내 것이라는 걸 확인하는 코드를 넣고 다시 배포해 줘.'`
    - meta·조건 줄은 기존과 같다.
    - 구조 자리에 `· Cloudflare Workers: Worker가 돌려주는 HTML의 <head> (정적 자산을 쓰면 그 폴더의 index.html)` 또는 `· Firebase Hosting: public/index.html`을 넣는다(해당 호스트 것만).
    - 배포 줄: Workers는 `` `- 다 넣었으면 wrangler deploy(또는 연결된 Git에 푸시)로 다시 배포해 줘.` ``, Firebase는 `` `- 다 넣었으면 firebase deploy 로 다시 배포해 줘.` ``이다.
    - 확인 줄은 `https://${target}`이다.

- [ ] **Step 4: 통과 확인** — `npm test` PASS, `npx tsc --noEmit`은 Task 2 전까지 `SubdomainHost` 관련 오류가 없어야 한다(types.ts에 키를 추가했으므로).

- [ ] **Step 5: Commit** — `git add src/lib/domains/hosts.ts src/lib/domains/hosts.test.ts src/lib/domains/ai-prompt.ts src/lib/domains/ai-prompt.test.ts src/lib/types.ts` → `feat(domains): Workers·Firebase 바로가기 호스트 프리셋`

### Task 2: DB migration

**Files:**
- Create: `supabase/migrations/20261026100000_subdomains_redirect_hosts.sql`
- Modify: `docs/22-supabase-subdomains.sql`(끝에 사본 덧붙임), `docs/22-supabase-subdomains-verify.sql`, `src/lib/types.ts`(Functions)

**Interfaces:**
- Produces:
  - `public.subdomain_set_redirect_records(p_id uuid, p_record_ids text[]) RETURNS void` — service_role 전용
  - 오류: `not_found`, `not_live`, `not_redirect`, `records_exist`
  - types.ts의 `Functions.subdomain_set_redirect_records: { Args: { p_id: string; p_record_ids: string[] }; Returns: undefined }`

- [ ] **Step 1: verify SQL에 실패 케이스 먼저 추가** (`BEGIN … ROLLBACK`, 기존 파일 형식 그대로):
  - `subdomain_target_ok('cloudflare-workers','a.b.workers.dev')`는 true, `'b.workers.dev'`는 false다.
  - `subdomain_target_ok('firebase','s.web.app')`는 true, `'s--c.web.app'`는 false다.
  - `subdomain_txt_ok('firebase','meal','[{"name":"x.meal.dshs.dev","value":"v"}]')`는 false, `'[]'`는 true다.
  - firebase 행을 connect한 뒤 `subdomain_set_redirect_records`를 두 번 부른다. 두 번째는 `records_exist`다.
  - vercel 행에 부르면 `not_redirect`, 반납된 행에 부르면 `not_live`다.
- [ ] **Step 2: 실패 확인** — `supabase db query --linked -f docs/22-supabase-subdomains-verify.sql` → 새 케이스에서 실패한다(함수 없음 / 거짓 반환).
- [ ] **Step 3: migration 작성**
  - `subdomains_host_check`를 9개 키로 다시 만든다.
  - `subdomain_target_ok`에 Global Constraints의 두 정규식을 넣는다(Firebase는 `p_target !~ '--' AND …`).
  - `subdomain_txt_ok`는 맨 앞에 `IF p_host IN ('cloudflare-workers','firebase') THEN RETURN p_txt = '[]'::jsonb; END IF;`를 넣는다(`CREATE OR REPLACE`, 나머지 본문은 그대로).
  - 새 함수 `subdomain_set_redirect_records`: `FOR UPDATE`로 읽는다. 행이 없으면 `not_found`, 상태가 `pending|active|broken`이 아니면 `not_live`, host가 두 키가 아니면 `not_redirect`, `cardinality(cf_record_ids) > 0`이면 `records_exist`다. 통과하면 `cf_record_ids = p_record_ids`로 바꾼다.
  - `REVOKE ALL … FROM PUBLIC, anon, authenticated; GRANT EXECUTE … TO service_role;`
- [ ] **Step 4: 적용·확인** — `supabase db push` → 적용된다. 그 뒤 verify SQL을 다시 돌려 `VERIFY OK`(롤백)를 확인한다. migration 본문을 `docs/22` 끝에 "추가:" 머리와 함께 덧붙인다. types.ts에 함수 타입을 추가한다.
- [ ] **Step 5: Commit** — migration, docs/22 두 파일, types.ts → `feat(domains): 바로가기 호스트 DB 규칙과 레코드 기록 함수`

### Task 3: Bulk Redirect 목록 클라이언트

**Files:**
- Create: `src/lib/domains/redirects.ts`, `src/lib/domains/redirects.test.ts`

**Interfaces:**
- Consumes: `RECORD_COMMENT_PREFIX`(cloudflare.ts)
- Produces:
  - `export type RedirectItem = { id: string; source: string; comment: string }`
  - `export type RedirectClient = { add(item: { source: string; target: string }, rowId: string): Promise<string>; remove(ids: string[]): Promise<void>; listManaged(): Promise<RedirectItem[]> }`
  - `export class RedirectError extends Error`
  - `export function redirectItemBody(source: string, target: string, rowId: string)` — 목록 POST 배열의 원소 하나
  - `export function createRedirectClient(opts: { token: string; accountId: string; listId: string; fetch?: typeof fetch; pollMs?: number; maxWaitMs?: number }): RedirectClient`
  - `export function getRedirectClient(): RedirectClient` — cloudflare.ts `getDnsClient`와 같은 규칙. env가 없으면 `RedirectError('CLOUDFLARE_LISTS_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_REDIRECT_LIST_ID 가 설정되지 않았어요.')`

API 동작:
- `add`: `POST /accounts/{a}/rules/lists/{l}/items`, 본문은 `[redirectItemBody(...)]`이다. 응답의 `operation_id`로 `GET /accounts/{a}/rules/lists/bulk_operations/{op}`를 `status`가 `completed`가 될 때까지 기다린다(`failed`면 `RedirectError(error)`, 시간 초과도 오류). 그 뒤 `GET …/items?search=<source>`에서 comment가 `dshs-subdomain:<rowId>`인 항목의 id를 돌려준다.
- `remove`: 빈 배열이면 아무것도 안 한다. 아니면 `DELETE …/items`, 본문 `{ items: ids.map(id => ({ id })) }`, 작업 완료를 기다린다.
- `listManaged`: `GET …/items?per_page=500` → `result_info.cursors.after`가 있으면 `cursor=`로 이어서 읽는다. comment가 접두어로 시작하는 것만 돌려준다.
- 목록에 진행 중 작업이 있어 4xx로 거절되면 `pollMs` 간격으로 최대 3번 다시 시도한다.
- 기본값은 `pollMs` 500, `maxWaitMs` 10000이다.
- 가짜 클라이언트는 메모리에 담고 `[redirect:fake] add <source> -> <target> (<id>)`를 로그로 찍는다.
- 실제 응답 모양은 구현 중 `.env.local` 토큰으로 한 번 확인한다(GET만, 개발 목록).

- [ ] **Step 1: 실패하는 테스트**(`cloudflare.test.ts`의 `fakeFetch` 패턴):
  - `'목록 항목은 302·경로·쿼리 보존·우리 표시로 만든다'` — `redirectItemBody('meal.dshs.dev/', 'https://meal.acct.workers.dev/', 'row-1')`가 Global Constraints의 본문과 `deepEqual`이다.
  - `'add 는 작업이 끝날 때까지 기다린 뒤 항목 id 를 돌려준다'` — POST → op `pending` → op `completed` → search 결과 `[{id:'it1', comment:'dshs-subdomain:row-1'}]`일 때 `'it1'`을 돌려준다. 호출 순서와 URL을 검사한다.
  - `'작업이 failed 면 RedirectError'`
  - `'remove 는 id 목록을 DELETE 본문으로 보낸다'` — 본문 `{items:[{id:'a'},{id:'b'}]}`. 빈 배열이면 fetch를 부르지 않는다.
  - `'listManaged 는 cursor 를 따라가고 우리 항목만'`
- [ ] **Step 2: 실패 확인** — `npm test` FAIL(모듈 없음)
- [ ] **Step 3: 구현** — 위 동작대로. 상대 `.ts` import만 쓴다(스크립트에서도 씀).
- [ ] **Step 4: 통과 확인** — `npm test` PASS
- [ ] **Step 5: Commit** — `feat(domains): Bulk Redirect 목록 클라이언트`

### Task 4: AAAA proxied 레코드 + 공용 정리 함수

**Files:**
- Modify: `src/lib/domains/cloudflare.ts`, `src/lib/domains/cloudflare.test.ts`
- Create: `src/lib/domains/cleanup.ts`, `src/lib/domains/cleanup.test.ts`
- Modify(호출부 교체): `src/lib/domains/actions.ts`(`removeRecords`, `connectHost`의 옛 레코드 삭제), `src/lib/projects/actions.ts:46`, `src/lib/privacy/actions.ts:65`

**Interfaces:**
- Produces:
  - `DnsRecordInput.type`에 `'AAAA'` 추가 — 본문 `{ type:'AAAA', name, content, ttl:1, proxied:true, comment }`
  - `REDIRECT_ID_PREFIX = 'redirect:'`
  - `splitCloudflareIds(ids: string[]): { dns: string[]; redirect: string[] }` — redirect 쪽은 접두어를 뗀 값
  - `removeCloudflareWith(ids: string[], deps: { dns: DnsClient; redirects: () => RedirectClient }): Promise<void>` — redirect id가 있을 때만 `redirects()`를 부른다. 그래서 목록 env가 없어도 CNAME 정리는 된다. 둘 다 시도하고, 하나라도 실패하면 마지막에 던진다.
  - `removeCloudflare(ids: string[]): Promise<void>` — `getDnsClient()`, `getRedirectClient`로 위를 부른다(`cleanup.ts`는 server 전용 아님. getter는 각 모듈에 있음).

- [ ] **Step 1: 실패하는 테스트**
  - cloudflare.test: `'AAAA 는 proxied 로 만든다'` — 본문 `deepEqual` `{type:'AAAA',name:'meal.dshs.dev',content:'100::',ttl:1,proxied:true,comment:'dshs-subdomain:row-1'}`
  - cleanup.test:
    - `splitCloudflareIds(['r1','redirect:i1','r2'])`는 `{dns:['r1','r2'],redirect:['i1']}`이다.
    - `removeCloudflareWith`에 redirect id가 없으면 `redirects` getter를 부르지 않는다(throw하는 getter로 검사).
    - DNS 삭제가 실패해도 목록 삭제는 시도한 뒤 던진다.
- [ ] **Step 2: 실패 확인** — `npm test` FAIL
- [ ] **Step 3: 구현 + 호출부 교체** — 세 액션 파일의 `getDnsClient().remove(ids)`를 `removeCloudflare(ids)`로 바꾼다(기존 catch·로그 문구는 유지하고, "DNS 레코드" → "Cloudflare 레코드"). cloudflare.ts 머리 주석을 "CNAME·TXT는 DNS only, 바로가기 AAAA만 proxied"로 고친다. 가짜 DNS 클라이언트 로그도 AAAA를 찍게 둔다(이미 type을 찍음).
- [ ] **Step 4: 통과 확인** — `npm test` PASS, `npx tsc --noEmit` 0
- [ ] **Step 5: Commit** — `feat(domains): 바로가기 AAAA 레코드와 Cloudflare 정리 공용 함수`

### Task 5: 연결·확인 흐름 (서버 액션 + 활성화)

**Files:**
- Create: `src/lib/domains/activate.ts`, `src/lib/domains/activate.test.ts`
- Modify: `src/lib/domains/actions.ts`, `src/lib/domains/connect.ts`(redirect면 레코드 없음)

**Interfaces:**
- Consumes: Task 1 `isRedirectHost`·`siteHostFor`, Task 3 `RedirectClient`, Task 4 `REDIRECT_ID_PREFIX`·`removeCloudflareWith`, Task 2 RPC
- Produces:
  - `activateRedirect(deps: { dns: DnsClient; redirects: () => RedirectClient; setRecords: (ids: string[]) => Promise<void> }, row: { id: string; name: string; target: string }): Promise<void>`
    - 순서: `dns.create([{type:'AAAA',name:'<name>.dshs.dev',content:'100::'}], row.id)` → `redirects().add({source:'<name>.dshs.dev/', target:'https://<target>/'}, row.id)` → `setRecords([...dnsIds, 'redirect:'+itemId])`
    - 어느 단계든 실패하면 이미 만든 것을 지우고(`removeCloudflareWith`) 원래 오류를 다시 던진다.
  - `needsActivation(row: { host: HostKey | null; cf_record_ids: string[] }): boolean` — 바로가기 호스트이고 `redirect:` id가 없으면 true

- [ ] **Step 1: 실패하는 테스트**(activate.test, 가짜 deps):
  - `'성공하면 AAAA id 와 redirect: 항목 id 를 기록한다'` — `setRecords`가 `['rec1','redirect:it1']`로 불린다.
  - `'목록 추가가 실패하면 AAAA 를 지우고 던진다'` — dns.remove가 `['rec1']`로 불린다. setRecords는 안 불린다.
  - `'setRecords 가 records_exist 로 실패하면(동시 활성화) 둘 다 지우고 던진다'`
  - `'needsActivation'` — firebase + `[]`는 true, firebase + `['r','redirect:i']`는 false, vercel은 false다.
- [ ] **Step 2: 실패 확인** — `npm test` FAIL
- [ ] **Step 3: 구현**
  - `connectHost`: redirect 호스트면 `rawTxt`를 무시하고 txt를 `[]`로 둔다. 옛 레코드는 `removeCloudflare`로 지운다. 레코드를 만들지 않고 `subdomain_connect`를 `p_record_ids: []`로 부른다. CNAME은 기존 그대로다.
  - `loadRow`에 `target`을 추가한다.
  - `verifySubdomain`:
    - `checkSite(siteHostFor(row), row.verify_token, row.host, …)`를 부른다. `assertSafePublicUrl`도 같은 호스트로 검사한다.
    - 결과가 ok이고 `needsActivation(row)`이면 `activateRedirect`를 부른다(`setRecords`는 `subdomain_set_redirect_records` RPC).
    - 활성화가 실패하면 `subdomain_record_check`를 부르지 않는다.
      - 오류가 `records_exist`면 조용히 기존 상태를 돌려준다(다른 요청이 이미 활성화함).
      - 목록 env가 없거나 Cloudflare가 실패하면 `{ ok:false, error:'바로가기를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.' }`를 돌려준다.
  - `RPC_ERRORS`에 `not_redirect`, `records_exist`를 추가한다(사용자에게 보일 일은 거의 없음).
  - `RPC_ERRORS.target_invalid` 문구에 바로가기용 분기를 둔다. redirect 호스트면 `'보낼 곳 주소가 고른 호스트의 기본 주소가 아니에요. 예: 이름.web.app'`이다.
- [ ] **Step 4: 통과 확인** — `npm test` PASS, `npx tsc --noEmit` 0
- [ ] **Step 5: Commit** — `feat(domains): 바로가기는 소유 확인 뒤에 만든다`

### Task 6: 매일 점검

**Files:**
- Modify: `scripts/check-subdomains.mts`, `.github/workflows/check-subdomains.yml`, `src/lib/domains/check.ts`(+test)

**Interfaces:**
- Consumes: Task 3·4·5 함수
- Produces: `redirectWorks(page: FetchedPage, target: string): boolean` — `page.status === 302`이고 `location`이 `https://<target>/`로 시작하면 true(check.ts, 순수)

- [ ] **Step 1: 실패하는 테스트**(check.test):
  - 302 + `https://a.acct.workers.dev/`이면 true다.
  - 301이면 false다.
  - location이 다른 호스트면 false다.
  - 200이면 false다.
- [ ] **Step 2: 실패 확인** — `npm test` FAIL
- [ ] **Step 3: 구현**
  - select에 `target, cf_record_ids`를 추가하고, 확인 호스트는 `siteHostFor`로 정한다.
  - 결과가 ok이고 `needsActivation`이면 `activateRedirect`를 부른다(dry-run이면 로그만). 실패하면 `failures++`.
  - 목록 env(`CLOUDFLARE_LISTS_API_TOKEN`·`CLOUDFLARE_ACCOUNT_ID`·`CLOUDFLARE_REDIRECT_LIST_ID`)는 **선택**이다. 없는데 바로가기 행이 하나라도 있으면 `failures++`하고 메시지 `❌  바로가기 목록 환경변수가 없어요`를 찍는다.
  - 반납 시 `dns.remove` 대신 `removeCloudflareWith`를 쓴다.
  - 고아 정리: 기존 DNS 정리 뒤 `redirects.listManaged()`에서 comment 행이 살아 있지 않은 항목을 지운다. 로그는 `🧹  고아 바로가기 <source>`다.
  - 동작 점검: `redirect:` id가 있는 살아 있는 행 중 이름순 첫 행에 `createSiteFetcher()('https://<name>.dshs.dev/')`를 보낸다. `redirectWorks`가 false면 `failures++`, 로그는 `❌  바로가기 규칙이 동작하지 않아요(<name>.dshs.dev)`다.
  - 머리 주석의 환경변수 목록을 고친다.
  - workflow `env:`에 세 secret 줄을 추가한다.
- [ ] **Step 4: 확인** — `npm test` PASS. `node scripts/check-subdomains.mts --dry-run`이 오류 없이 끝난다(바로가기 행 0개라 목록 env 없이도 통과).
- [ ] **Step 5: Commit** — `feat(domains): 매일 점검이 바로가기 활성화·고아 정리·동작 점검`

### Task 7: 화면

**Files:**
- Modify: `src/components/domains/host-picker.tsx`, `src/components/domains/domain-steps.tsx`, `src/components/domains/domain-list.tsx`, `src/lib/domains/read.ts`(`getLiveDomainName` → `getLiveDomain`), `src/app/(nav)/projects/[id]/(detail)/page.tsx`, `src/app/(nav)/projects/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: Task 1 `isRedirectHost`, `HOST_PRESETS[..].mode`
- Produces: `getLiveDomain(projectId: string, onlyActive?: boolean): Promise<{ name: string; redirect: boolean } | null>`(옛 `getLiveDomainName`을 대체, 호출부 2곳)

- [ ] **Step 1: 구현**
  - HostPicker:
    - `HOST_ORDER` 끝에 `'cloudflare-workers', 'firebase'`를 추가한다(9칸, `sm:grid-cols-4` 유지).
    - 안내 문구는 `'다른 곳에 올렸다면 아직 지원하지 않아요. 위 아홉 곳 중 하나로 올려 주세요.'`다.
    - `preset.mode === 'redirect'`면 다음과 같이 한다.
      - 입력 라벨은 `보낼 곳 주소`다.
      - "설정 열기" 링크와 TXT 블록은 숨긴다.
      - 버튼 문구는 `바로가기 만들기`다.
      - 입력칸 아래에 `'들어오면 주소창이 보낼 곳 주소로 바뀌어요. 진짜 내 도메인 연결이 아니라 바로가기예요.'`(zinc-500, text-xs)를 둔다.
    - 제출할 때 txt는 `[]`다.
  - DomainSteps:
    - 2단계 완료 제목은 redirect면 `` `${label}로 바로가기` ``다.
    - redirect면 `UrlChangedDialog`를 렌더하지 않는다(`onApplied`에서 열지 않음).
    - `RESULT_TEXT`를 redirect일 때 바꾼다.
      - unreachable: `'보낼 곳 사이트가 아직 열리지 않아요. 주소가 맞는지, 배포가 끝났는지 확인해요.'`
      - no_token: `'사이트는 열리는데 확인 코드가 안 보여요. 코드를 넣고 다시 배포해요.'`(같음)
    - `buildVerifyPrompt`에 `target: domain.target`을 넘긴다.
  - DomainList: `StatusPill` 옆에 `isRedirectHost(domain.host)`이면 `바로가기` 알약(zinc 계열 `bg-zinc-100 text-zinc-700`, 다크 `bg-zinc-800 text-zinc-300`, `title="들어오면 보낼 곳 주소로 넘어가요"`)을 둔다.
  - 상세 정보 카드 "주소" 행: `domain.redirect`면 주소 옆에 같은 `바로가기` 알약을 단다. 수정 페이지는 `.name`만 쓴다.
- [ ] **Step 2: notFound 실측**
  - `curl -s -o /dev/null -w '%{http_code}' https://nope-zz9.acct-zz9.workers.dev/`과 `https://nope-zz9-xx.web.app/`의 상태·본문 특징을 본다.
  - 확실한 표시가 있으면 프리셋 `notFound`에 넣고 hosts.test에 한 줄 추가한다. 없으면 `() => false`를 유지하고 이유를 주석으로 남긴다.
- [ ] **Step 3: 확인**
  - `npx tsc --noEmit` 0, `npm test` PASS, `npm run lint`(변경 파일 오류 0)
  - `npm run dev`에서 `/domains`를 연다(가짜 DNS·목록). Workers 프로젝트로 이름 → 보낼 곳 → 확인을 지나 `[dns:fake] create AAAA`·`[redirect:fake] add` 로그를 확인하고 목록의 `바로가기` 알약을 본다. 확인 단계는 토큰이 실제로 있어야 ok이므로, 개발에서는 토큰 meta를 넣은 실제 workers.dev 사이트가 없으면 로그 확인을 활성화 단위 테스트로 대신한다(그 사실을 보고).
  - 모바일 폭(390px) 스크린샷 1장으로 9칸 그리드가 넘치지 않는지 본다.
- [ ] **Step 4: Commit** — `feat(domains): 바로가기 호스트 화면`

### Task 8: 설정·문서·운영 준비

**Files:**
- Create: `scripts/create-redirect-list.mts`(한 번만 실행, 이미 같은 이름 목록이 있으면 그 id를 출력)
- Modify: `CLAUDE.md`(도메인 마련하기 절의 호스트 목록·제외 문장·환경변수 표), `AGENTS.md`(같은 내용이 있는 곳), `docs/19-cloudflare-workers.md`(secret 목록), 메모리 `project-subdomain-redirects.md`

- [ ] **Step 1:** 스크립트를 쓴다. `POST /accounts/{a}/rules/lists` `{ name: 'dshs_subdomain_redirects', kind: 'redirect', description: 'dshs.dev 바로가기 주소 (도메인 마련하기)' }` → id를 출력한다. 먼저 `GET /accounts/{a}/rules/lists`로 같은 이름을 찾는다.
- [ ] **Step 2:** 사용자 토큰이 `.env.local`에 있으면 실행해 목록 id를 얻고 `.env.local`에 `CLOUDFLARE_REDIRECT_LIST_ID`를 추가한다. 토큰이 없으면 이 단계는 사용자 대기로 보고한다.
- [ ] **Step 3:** 문서를 고친다(호스트 9개, 바로가기 동작·한계, 새 env 3개, 일회성 대시보드 규칙).
- [ ] **Step 4: Commit** — `docs(domains): 바로가기 주소 설정·운영 안내`
- [ ] **Step 5: 사용자에게 넘김(코드로 하지 않음)** — 이 순서로 안내한다.
  1. 대시보드 Bulk Redirects → Create Bulk Redirect Rule → 목록 `dshs_subdomain_redirects` → Save and Deploy
  2. `wrangler secret put CLOUDFLARE_LISTS_API_TOKEN`, `wrangler.jsonc` `vars`에 `CLOUDFLARE_ACCOUNT_ID`·`CLOUDFLARE_REDIRECT_LIST_ID`(이 둘은 내가 넣고 커밋)
  3. Actions Secrets 세 개
  4. push·`npm run deploy`는 사용자 확인 뒤에 한다. 규칙(1)이 먼저 있어야 한다(스펙 4.5 배포 순서).
