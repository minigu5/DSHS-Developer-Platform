# 포스터 그림 학교 Mac mini Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 포스터 그림을 Workers AI 대신 학교 Mac mini(대기 목록에서 일감을 당겨 가는 방식)로 그리고, Mac이 없거나 막히면 지금 방식으로 넘어간다.

**Architecture:** Worker가 그림 주문을 `poster_art_jobs`(Supabase)에 넣고 포스터를 바로 돌려준다. Mac은 anon 키 + 자기 토큰으로 SECURITY DEFINER RPC `claim_poster_art_job`을 불러 일감을 받는다. 다 그리면 Worker의 Mac 전용 경로로 이미지 바이트를 올리고, Worker는 Cloudinary에 Blob 그대로 넘겨 `art_url`을 채운다. 브라우저는 3초마다 상태를 묻고, 막힘 판정·넘어가기도 이 GET에서 한다.

**Tech Stack:** Next.js 16 App Router(Workers/OpenNext), Supabase Postgres(RLS·SECURITY DEFINER), Cloudinary REST, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-06-poster-mac-art-design.md` — §7(omm)은 이 계획 범위 밖. omm(Localfit) 코드는 건드리지 않는다.

## Global Constraints

- 시간 값: Mac 살아 있음 30초, 아무도 안 잡음 60초(Mac 없음), 줄 대기 5분(Mac 있음), lease 180초 + 결과 유예 30초, 브라우저 폴링 3초, 폴링 중단 6분.
- 한도: `artLocalPerUserPerDay: 20`, `artLocalSitePerDay: 100`(KST). 기존 `art` 5/6, 글, 하루 1개, 포스터 3개는 그대로.
- 업로드: `image/png|jpeg|webp`, 4MB(4 × 1024 × 1024) 이하, 매직 넘버로 확인, base64로 바꾸지 않는다(CPU 10ms).
- Mac 인증이 틀리거나 상태가 틀리면 전부 같은 `404`. `413` 크기, `415` 형식, `502` Cloudinary 실패(일감은 `working` 유지), 이미 `done`인 같은 일감·같은 Mac이면 `200` 멱등.
- 일감에는 영어 프롬프트(1000자 상한)·크기만 둔다. 프로젝트 이름·사용자 정보는 넣지 않는다. 로그는 `[poster] …` 형식으로 상태·id만 남긴다.
- 학교망 안으로 들어오는 경로를 만들지 않는다. Mac에 서비스 키·Cloudinary 비밀을 주지 않는다.
- DB: 새 표는 RLS 켜고 정책 없이 anon/authenticated `REVOKE ALL`. SECURITY DEFINER는 `SET search_path = ''`, 스키마를 붙여 쓴다. 새 정책·함수에 `public.users.email`로 권한을 판단하지 않는다.
- 문구는 해요체, 로딩은 `…`. `transition-all` 금지. `next/link` 대신 `@/components/shared/link`. `any` 금지.
- 커밋은 내 파일만 `git add`(공유 작업 트리). main 푸시 = 배포 + migration 자동 적용이므로 **푸시 전 사용자 확인**.

## Review Focus

1. 사용자가 되돌리기·새 주문을 한 뒤 옛 일감 결과가 늦게 온다 → 포스터는 그대로여야 한다(Task 2 `shouldApplyResult`, Task 6 시나리오).
2. Mac이 502 뒤 재시도했는데 사실 첫 번째가 저장됐다 → 두 번째도 200이고 아무것도 안 바뀌어야 한다(Task 2 `judgeResult` 'already').
3. 그리는 도중 Mac 토큰을 끊었다 → 결과는 404로 거절돼야 한다(Task 2 `judgeResult` revoked).
4. 브라우저를 다 닫았고 Mac도 죽어서 `art_job_id`가 남았다 → 페이지를 다시 열면 정리돼 "그림 다시 그리기"가 풀려야 한다(Task 2 `judgeStuck` working+lease 초과, Task 7 서버 페이지 정리).
5. `Content-Type: image/png`인데 내용은 HTML이다 → 415(Task 2 `sniffImageType`).

---

### Task 1: DB migration + 타입

**Files:**
- Create: `supabase/migrations/20261106190000_poster_art_jobs.sql`
- Modify: `src/lib/types.generated.ts`(`npm run db:types`로 재생성)

**Interfaces:**
- Produces:
  - 표 `poster_art_workers(id uuid PK default gen_random_uuid(), name text UNIQUE NOT NULL, token_hash text NOT NULL, created_at timestamptz default now(), last_seen_at timestamptz, revoked_at timestamptz)`
  - 표 `poster_art_jobs(id uuid PK, kind text NOT NULL DEFAULT 'art' CHECK (kind IN ('art')), poster_id uuid NOT NULL FK project_posters ON DELETE CASCADE, user_id uuid NOT NULL, prompt text NOT NULL CHECK (char_length(prompt) <= 1000), width int NOT NULL, height int NOT NULL, status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','working','done','failed','canceled','expired')), worker_id uuid FK poster_art_workers ON DELETE SET NULL, job_secret_hash text, claimed_at timestamptz, lease_until timestamptz, attempts int NOT NULL DEFAULT 0, result_url text, error text, created_at timestamptz default now(), finished_at timestamptz)` + 인덱스 `(status, created_at)`, `(poster_id)`, `(worker_id)`
  - `project_posters.art_job_id uuid NULL REFERENCES poster_art_jobs(id) ON DELETE SET NULL` + 인덱스
  - `ai_usage.kind` CHECK → `('text','art','art_local')`(기존 제약 이름을 찾아 DROP 후 다시 ADD)
  - `claim_poster_art_job(p_token text) RETURNS TABLE(id uuid, prompt text, width int, height int, job_secret text)` — 0행이면 일감 없음
  - `poster_art_ping(p_token text) RETURNS void`
  - 두 RPC 모두 `EXECUTE`는 `anon, service_role`만(`REVOKE ALL … FROM PUBLIC, authenticated` 먼저)

- [ ] **Step 1: migration 작성** — 머리 주석에 설계 문서 경로를 적는다. 토큰 해시는 확장 없이 `encode(sha256(convert_to(p_token, 'UTF8')), 'hex')`(Node 쪽 `hashToken`과 같은 hex). job secret은 `replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')`로 만들고 해시만 저장한다. claim 순서는 설계 §5-1의 1~5 그대로: Mac 찾기 → `last_seen_at` → lease가 지난 `working`을 되돌리거나(`attempts < 2`) `expired`로 → `FOR UPDATE SKIP LOCKED`로 가장 오래된 `queued` 하나 → `working`·`lease_until = now() + interval '180 seconds'`. Mac을 못 찾으면 0행(예외를 던지지 않는다).
- [ ] **Step 2: 운영 DB에 적용** — 표·칸만 더하므로 기존 코드에 영향 없음. Run: `supabase db push`. Expected: `Applying migration 20261106190000_poster_art_jobs.sql... Finished`.
- [ ] **Step 3: 타입 재생성** — Run: `npm run db:types && npx tsc --noEmit`. Expected: 오류 0, `types.generated.ts`에 `poster_art_jobs`·`art_job_id`가 생김.
- [ ] **Step 4: RPC 확인** — anon 키로 `rpc('claim_poster_art_job', { p_token: 'wrong' })`를 부르는 한 줄 node 스크립트(scratchpad)를 실행한다. Expected: `data: []`, `error: null`. 같은 키로 `from('poster_art_jobs').select()` → 권한 오류.
- [ ] **Step 5: Commit** — `git add supabase/migrations/20261106190000_poster_art_jobs.sql src/lib/types.generated.ts` → `feat(posters): Mac 그림 대기 목록 표·RPC`

### Task 2: 순수 판단 함수 + 설정

**Files:**
- Modify: `src/lib/posters/config.ts`(상수·한도)
- Create: `src/lib/posters/art-jobs-logic.ts`, `src/lib/posters/art-jobs-logic.test.ts`

**Interfaces:**
- Produces (config.ts):
  - `POSTER_LIMITS.artLocalPerUserPerDay = 20`, `POSTER_LIMITS.artLocalSitePerDay = 100`
  - `export const POSTER_MAC = { aliveMs: 30_000, unclaimedMs: 60_000, queueMaxMs: 300_000, leaseGraceMs: 30_000, pollMs: 3_000, pollStopMs: 360_000, maxUploadBytes: 4 * 1024 * 1024, promptMax: 1000 } as const`
- Produces (art-jobs-logic.ts, `node:test`로 검증, server-only 아님):
  - `type ArtJobStatus = 'queued' | 'working' | 'done' | 'failed' | 'canceled' | 'expired'`
  - `hashToken(token: string): Promise<string>` — WebCrypto SHA-256 소문자 hex(Node·Workers 공통)
  - `parseBearer(header: string | null): string | null`
  - `sniffImageType(head: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | null`
  - `judgeResult(i: { job: { status: ArtJobStatus; worker_id: string | null; job_secret_hash: string | null; lease_until: string | null } | null; workerId: string | null; secretHash: string; now: Date }): 'accept' | 'already' | 'reject'` — `workerId`는 토큰으로 찾은 끊기지 않은 Mac(없으면 null)
  - `judgeStuck(i: { job: { status: ArtJobStatus; created_at: string; lease_until: string | null; claimed_at: string | null }; macsAlive: boolean; now: Date }): { stuck: false } | { stuck: true; release: boolean }`
  - `shouldApplyResult(posterArtJobId: string | null, jobId: string): boolean`

- [ ] **Step 1: 실패하는 테스트 작성** (`art-jobs-logic.test.ts`)

```ts
test('hashToken = SHA-256 hex', async () =>
  assert.equal(await hashToken('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'))
test('parseBearer', () => {
  assert.equal(parseBearer('Bearer tok_1'), 'tok_1')
  assert.equal(parseBearer('Basic x'), null)
  assert.equal(parseBearer(null), null)
})
test('sniffImageType', () => {
  assert.equal(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png')
  assert.equal(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg')
  assert.equal(sniffImageType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp')
  assert.equal(sniffImageType(new TextEncoder().encode('<html><script>')), null)
})
const now = new Date('2026-11-06T12:00:00Z')
const working = { status: 'working' as const, worker_id: 'w1', job_secret_hash: 'h', lease_until: '2026-11-06T12:01:00Z' }
test('judgeResult', () => {
  assert.equal(judgeResult({ job: working, workerId: 'w1', secretHash: 'h', now }), 'accept')
  assert.equal(judgeResult({ job: working, workerId: null, secretHash: 'h', now }), 'reject') // 토큰 끊김
  assert.equal(judgeResult({ job: working, workerId: 'w2', secretHash: 'h', now }), 'reject')
  assert.equal(judgeResult({ job: working, workerId: 'w1', secretHash: 'x', now }), 'reject')
  assert.equal(judgeResult({ job: { ...working, lease_until: '2026-11-06T11:59:20Z' }, workerId: 'w1', secretHash: 'h', now }), 'reject') // 유예 30초 넘음
  assert.equal(judgeResult({ job: { ...working, lease_until: '2026-11-06T11:59:40Z' }, workerId: 'w1', secretHash: 'h', now }), 'accept') // 유예 안
  assert.equal(judgeResult({ job: { ...working, status: 'done' }, workerId: 'w1', secretHash: 'h', now }), 'already')
  assert.equal(judgeResult({ job: { ...working, status: 'canceled' }, workerId: 'w1', secretHash: 'h', now }), 'reject')
  assert.equal(judgeResult({ job: null, workerId: 'w1', secretHash: 'h', now }), 'reject')
})
const q = (ago: number) => ({ status: 'queued' as const, created_at: new Date(now.getTime() - ago).toISOString(), lease_until: null, claimed_at: null })
test('judgeStuck', () => {
  assert.deepEqual(judgeStuck({ job: q(61_000), macsAlive: false, now }), { stuck: true, release: true })
  assert.deepEqual(judgeStuck({ job: q(61_000), macsAlive: true, now }), { stuck: false })
  assert.deepEqual(judgeStuck({ job: q(301_000), macsAlive: true, now }), { stuck: true, release: true })
  assert.deepEqual(judgeStuck({ job: { ...q(0), status: 'working', lease_until: '2026-11-06T11:59:29Z' }, macsAlive: false, now }), { stuck: true, release: true })
  assert.deepEqual(judgeStuck({ job: { ...q(0), status: 'working', lease_until: '2026-11-06T11:59:31Z' }, macsAlive: false, now }), { stuck: false })
  assert.deepEqual(judgeStuck({ job: { ...q(0), status: 'failed' }, macsAlive: true, now }), { stuck: true, release: false }) // fail 에서 이미 돌려줌
  assert.deepEqual(judgeStuck({ job: { ...q(0), status: 'expired' }, macsAlive: true, now }), { stuck: true, release: true })
})
test('shouldApplyResult', () => {
  assert.equal(shouldApplyResult('j1', 'j1'), true)
  assert.equal(shouldApplyResult('j2', 'j1'), false)
  assert.equal(shouldApplyResult(null, 'j1'), false)
})
```

- [ ] **Step 2: 실패 확인** — Run: `node --test src/lib/posters/art-jobs-logic.test.ts`. Expected: FAIL(모듈 없음).
- [ ] **Step 3: 구현** — config 상수 추가, 위 시그니처대로 `art-jobs-logic.ts` 작성. `expired`인데 아직 정리 안 된 일감(claim RPC가 `attempts >= 2`로 바꾼 것)은 횟수를 아직 안 돌려준 상태라 `release: true`.
- [ ] **Step 4: 통과 확인** — Run: `npm test`. Expected: 전부 PASS.
- [ ] **Step 5: Commit** — `feat(posters): Mac 그림 일감 판단 함수`

### Task 3: Mac 토큰 관리 스크립트

**Files:**
- Create: `scripts/poster-art-worker.mts`

**Interfaces:**
- Consumes: `hashToken`(Task 2), 표 `poster_art_workers`(Task 1)
- Produces: `node scripts/poster-art-worker.mts add <name> | list | revoke <name>`

- [ ] **Step 1: 작성** — `.env.local` 읽기는 `scripts/sync-readmes.mts`의 `loadEnv`와 같은 방식. 서비스 키 클라이언트.
  - `add`: `crypto.getRandomValues(32바이트)` → base64url 토큰. 해시만 insert하고, 토큰은 "이 값은 다시 볼 수 없어요" 문구와 함께 **한 번만** stdout에 낸다. 같은 이름이 있으면 거절한다.
  - `list`: 이름 · 마지막 연락(KST) · 끊김 여부.
  - `revoke`: `revoked_at = now()`.
- [ ] **Step 2: 확인** — Run: `node scripts/poster-art-worker.mts add test-fake` → 토큰 출력. `list` → `test-fake`가 보이고 마지막 연락은 없음. 이 토큰으로 Task 1 Step 4 스크립트를 다시 돌리면 `data: []`이고 `list`에 마지막 연락 시각이 생긴다.
- [ ] **Step 3: Commit** — `feat(posters): Mac 그림 토큰 스크립트`

### Task 4: 서버 일감 모듈 + 횟수 + Cloudinary Blob 업로드

**Files:**
- Create: `src/lib/posters/art-jobs.ts`(server-only)
- Modify: `src/lib/posters/usage.ts`(`UsageKind`에 `'art_local'`, LIMITS 추가), `src/lib/posters/art.ts`(`uploadPosterArtBlob` 추가)

**Interfaces:**
- Consumes: Task 1 표, Task 2 함수·상수
- Produces:
  - `macsOnline(): Promise<boolean>` — `revoked_at IS NULL AND last_seen_at > now() - 30초`가 하나라도 있으면 true. 오류면 false.
  - `enqueueArtJob(i: { posterId: string; userId: string; order: PosterArtOrder }): Promise<string | null>` — `fitArtSize`로 크기를 줄이고 prompt를 1000자로 자른 뒤 insert하고 job id를 돌려준다. `project_posters.art_job_id` 기록은 부르는 쪽이 `savePosterState`로 한다.
  - `cancelArtJob(jobId: string): Promise<void>` — `status IN ('queued','working')`일 때만 `canceled`로 바꾼다. 바꾸기 전 상태가 `queued`였으면 `releaseUsage('art_local', job.user_id)`.
  - `settleArtJob(poster: ProjectPosterRow): Promise<{ status: 'none' | 'pending' | 'done' | 'expired' | 'failed'; poster: ProjectPosterRow }>` — `art_job_id`가 없으면 `none`. 있으면 일감을 읽어 `judgeStuck`을 적용한다. 막힘이면 `expired`·`failed`로 확정하고(조건부 update), 필요하면 횟수를 돌려주고, `project_posters.art_job_id = NULL`(`.eq('art_job_id', jobId)` 조건). 일감이 `done`인데 포스터가 아직 그 id면(결과 경로가 중간에 끊김) `art_url = result_url`로 채운다.
  - `uploadPosterArtBlob(body: Blob): Promise<string | null>` — Cloudinary REST `https://api.cloudinary.com/v1_1/<cloud>/image/upload`에 `FormData(file=Blob, api_key, timestamp, folder='dshs/posters', transformation, signature)`를 `fetch`한다. 서명은 `cloudinary.utils.api_sign_request`. `drawPosterArt`와 같은 변환(quality auto:good, fetch_format auto)을 쓰고, `secure_url`을 돌려준다.
  - `savePosterState`가 `art_job_id`도 쓰도록 `PosterState`에 `art_job_id: string | null`을 추가한다(`store.ts`). `nextPosterState`의 `change`에 `artJobId?: string | null`을 넣고, 생략하면 `null`. `undoPosterState`는 `art_job_id: null`.

- [ ] **Step 1: 실패하는 테스트 추가** (`store.test.ts`)

```ts
test('nextPosterState 는 artJobId 를 싣고, 없으면 null', () => {
  assert.equal(nextPosterState(prev, { ...change, artJobId: 'j1' }).art_job_id, 'j1')
  assert.equal(nextPosterState(prev, change).art_job_id, null)
})
test('undoPosterState 는 기다리던 그림을 비운다', () => assert.equal(undoPosterState({ ...prevWithVersion, art_job_id: 'j1' })?.art_job_id, null))
```
(`prev`·`change`·`prevWithVersion`은 파일의 기존 픽스처를 쓴다.)

- [ ] **Step 2: 실패 확인** — Run: `node --test src/lib/posters/store.test.ts`. Expected: FAIL.
- [ ] **Step 3: 구현** — 위 Interfaces대로 구현한다. `usage.ts`의 `art_local`은 `ai_usage_day`가 KST를 쓴다(Task 1에서 함수는 안 바꿈). `toPosterView`에 `artPending: !!row.art_job_id`를 추가하고, `canRedraw`는 `artPending`이면 false. `PosterView`에 `artPending: boolean`도 추가한다.
- [ ] **Step 4: 통과 확인** — Run: `npm test && npx tsc --noEmit`. Expected: PASS, 오류 0.
- [ ] **Step 5: Commit** — `feat(posters): Mac 그림 일감 넣기·정리·Blob 업로드`

### Task 5: Mac 전용 API + 가짜 Mac

**Files:**
- Create: `src/app/api/poster-art/jobs/[jobId]/result/route.ts`, `src/app/api/poster-art/jobs/[jobId]/fail/route.ts`, `src/lib/posters/art-worker-auth.ts`(server-only), `scripts/fake-poster-art-worker.mts`

**Interfaces:**
- Consumes: `parseBearer`·`hashToken`·`judgeResult`·`sniffImageType`·`shouldApplyResult`·`POSTER_MAC`(Task 2), `uploadPosterArtBlob`(Task 4), `releaseUsage`
- Produces:
  - `authArtWorker(request: Request, jobId: string): Promise<{ job: PosterArtJobRow; workerId: string; verdict: 'accept' | 'already' } | null>` — null이면 라우트가 404. `jobId`가 uuid 형식이 아니면 null.
  - `POST …/result` — §Global의 응답 코드. 순서: 인증 → `already`면 200 → `Content-Length`가 없거나 4MB 넘으면 413 → `request.arrayBuffer()`(크기 재확인 413) → 첫 12바이트를 sniff해서 null이면 415 → `uploadPosterArtBlob(new Blob([buf], { type }))`, 실패하면 502 → 일감 `done`(`.eq('status','working')` 조건, `result_url`, `finished_at`) → `shouldApplyResult`면 `project_posters` `art_url`·`art_job_id = NULL`·`updated_at`(`.eq('art_job_id', jobId)` 조건) → `200 { ok: true }`.
  - `POST …/fail` — 인증(accept만) → `{ reason }`을 200자로 자른다 → 일감 `failed`, `error`, `finished_at` → `releaseUsage('art_local', job.user_id)` → 200.
  - 두 경로 모두 쿠키를 쓰지 않으므로 `isSameOrigin`을 붙이지 않는다. 라우트 머리 주석에 이유를 적는다.
  - `node scripts/fake-poster-art-worker.mts --token <t> [--seed <posterId>] [--fail] [--slow <초>] [--twice]` — `--seed`는 서비스 키로 그 포스터에 queued 일감을 넣고 `art_job_id`를 기록한다(테스트용 프롬프트). 그다음 anon 키로 claim하고, 고정 PNG(스크립트 안 1×1 바이트 배열 대신 512×384 단색 PNG를 `zlib`로 만든다)를 `SITE_URL`(기본 `http://localhost:3000`)의 result로 올린다. `--twice`는 같은 결과를 두 번 보낸다.

- [ ] **Step 1: 구현** — 위 Interfaces대로 작성한다. 로그는 `[poster] art result <jobId> <상태>`만.
- [ ] **Step 2: 확인(dev 서버)** — `npm run dev` 상태에서 테스트용 포스터 id를 하나 골라(관리자 계정으로 만든 것) 다음을 실행한다.
  - `--seed <id>`: Expected `200`. DB에서 일감 `done`, 포스터 `art_url`이 Cloudinary URL, `art_job_id` NULL.
  - `--seed <id> --twice`: Expected 두 번 다 `200`, Cloudinary 업로드는 1번(로그로 확인).
  - `--seed <id> --fail`: Expected 일감 `failed`, `ai_usage`의 `art_local`이 줄어듦.
  - 토큰을 틀리게: Expected `404`.
  - `curl -X POST -H "Authorization: Bearer <t>" -H "X-Job-Secret: x" -H "Content-Type: image/png" --data '<html>' …`: Expected `404`(시크릿이 틀림). 시크릿이 맞으면 `415`가 나는지는 가짜 Mac에 `--html` 옵션을 넣어 확인해도 된다.
- [ ] **Step 3: Commit** — `feat(posters): Mac 그림 결과·실패 API와 가짜 Mac 스크립트`

### Task 6: 만들기·다시 그리기를 Mac으로 보내기

**Files:**
- Modify: `src/app/api/posters/[posterId]/ask/route.ts`, `src/app/api/posters/[posterId]/redraw/route.ts`, `src/lib/posters/actions.ts`(`undoPoster`), `src/lib/posters/messages.ts`

**Interfaces:**
- Consumes: `macsOnline`·`enqueueArtJob`·`cancelArtJob`(Task 4), `reserveUsage('art_local')`
- Produces:
  - 문구: `POSTER_COPY.artDrawing = '그림은 학교 컴퓨터가 그리고 있어요. 다 그리면 바로 바뀌어요.'`, `artBusy = '그림을 그리는 중이에요. 다 그린 뒤에 다시 눌러 주세요.'`, `artLocalUserLimit = '오늘 그림을 20장 다 그렸어요. 내일 다시 그릴 수 있어요.'`, `artGaveUp = '그림을 못 그렸어요. 잠시 뒤 "그림 다시 그리기"를 눌러 주세요.'`
  - redraw 본문 `{ via?: 'cloud' }` — `'cloud'`면 Mac 판단을 건너뛰고 지금 코드 그대로 실행한다.

- [ ] **Step 1: ask 고치기** — 처음 만들 때 그림 횟수를 잡는 부분을 `type ArtHold = 'art_local' | 'art' | null`로 바꾼다.
  - `macsOnline()`이면 `art_local`부터 잡고, 못 잡으면 `art`를 잡는다.
  - 그림을 그려야 할 때(`wantsArt`) Mac을 쓰는 조건: 쥔 것이 `art_local`이거나, 쥔 것이 없고 `macsOnline()`이면서 `art_local` 예약이 `ok`일 때.
    - 이때 `enqueueArtJob`을 부른다. 성공하면 `artUrl`은 처음이면 `null`, 아니면 옛 값을 유지하고, `artJobId = jobId`, `notice = artDrawing`.
    - `enqueueArtJob`이 null이면 `art_local`을 돌려주고 기존 Workers AI 경로로 간다.
  - 위 조건이 아니면 기존 코드 그대로(Workers AI, `art` 횟수). 이때 `art_local` 예약이 `user_limit`이어서 여기로 왔고 `art`도 못 잡으면 안내는 `artLocalUserLimit`.
  - 저장 전에 `poster.art_job_id`가 있고 새 일감을 넣었거나 새 주문이 왔으면 `cancelArtJob(old)`.
  - 쥔 횟수를 안 쓰게 되면 그 종류대로 돌려준다(지금 `artHeld` 처리와 같음).
- [ ] **Step 2: redraw 고치기** — `poster.art_job_id`가 있으면 409 `artBusy`. `via !== 'cloud' && macsOnline()`이고 `art_local`이 `ok`면 일감을 넣고 `nextPosterState(…, { artUrl: poster.art_url, artJobId, userText: '그림 다시 그리기', modelText: POSTER_COPY.artDrawing })`로 저장한다. heartbeat 없이 `NextResponse.json({ ok: true, poster })`. 아니면 지금 코드 그대로.
- [ ] **Step 3: undo 고치기** — `undoPoster`에서 `found.poster.art_job_id`가 있으면 저장 전에 `cancelArtJob`.
- [ ] **Step 4: 확인** — `npx tsc --noEmit && npm test`. dev 서버 + 관리자 로그인(사용자 몫이면 사용자에게 부탁)으로 다음을 확인한다.
  - (a) 가짜 Mac 없이 만들기: 지금처럼 Workers AI 경로로 간다(`macsOnline` false).
  - (b) `fake-poster-art-worker --token <t> --slow 20`(먼저 claim 루프를 돌려 둠) 상태에서 "그림 다시 그리기": 즉시 응답, 포스터 `art_job_id`가 생김, 20초 뒤 그림이 바뀜.
  - (c) (b) 도중 되돌리기: 일감 `canceled`, 늦게 온 결과는 404이고 포스터는 그대로.
- [ ] **Step 5: Commit** — `feat(posters): 그림 주문을 학교 Mac 대기 목록으로`

### Task 7: 상태 GET · 넘어가기 · 화면

**Files:**
- Create: `src/app/api/posters/[posterId]/art/route.ts`
- Modify: `src/app/(nav)/projects/[id]/poster/[posterId]/page.tsx`, `src/components/posters/poster-studio.tsx`, `src/components/posters/poster-preview.tsx`, `src/lib/posters/document.ts`

**Interfaces:**
- Consumes: `settleArtJob`(Task 4), `PosterView.artPending`, redraw `{ via: 'cloud' }`(Task 6)
- Produces:
  - `GET /api/posters/[posterId]/art` → `guardPosterRequest` → `settleArtJob` → `{ ok: true, status: 'none' | 'pending' | 'done' | 'expired' | 'failed', poster: PosterView }`
  - `posterSrcdoc(html, artUrl, pending = false)` — `pending && !artUrl`면 `EMPTY_ART` 대신 "그림 그리는 중…" 글자가 있는 SVG data URI(zinc-200 바탕, zinc-500 글자)를 쓴다. 기존 CSP `img-src data:`에 맞는다.
  - `PosterPreview`에 `pending?: boolean` prop. `pending && artUrl`(다시 그리는 중)이면 미리보기 위 오른쪽에 작은 알약 "새 그림 그리는 중…"(`aria-live="polite"`)을 띄운다.

- [ ] **Step 1: 테스트 추가** (`document.test.ts`)

```ts
test('그리는 중이면 글자 있는 자리', () => {
  const doc = posterSrcdoc('<img src="ART">', null, true)
  assert.match(decodeURIComponent(doc), /그림 그리는 중/)
})
test('그림이 있으면 pending 이어도 그 그림', () =>
  assert.match(posterSrcdoc('<img src="ART">', 'https://res.cloudinary.com/x.png', true), /res\.cloudinary\.com\/x\.png/))
```

- [ ] **Step 2: 실패 확인** — Run: `node --test src/lib/posters/document.test.ts`. Expected: FAIL.
- [ ] **Step 3: 구현**
  - 서버 페이지: `loadPoster` 뒤 `art_job_id`가 있으면 `settleArtJob`을 한 번 돌리고 그 결과의 poster로 `toPosterView`.
  - 스튜디오:
    - `poster.artPending`인 동안 `POSTER_MAC.pollMs`마다 GET하고, `pollStopMs`가 지나면 멈춘다(`useEffect`, 언마운트 시 정리).
    - `done`이면 `setPoster`.
    - `expired`·`failed`면 `setPoster` 후 한 번만 `callAi('redraw', { via: 'cloud' })`. `useRef`로 한 번만 부르게 하고, 실패하면 `toast(POSTER_COPY.artGaveUp)`.
    - `artPending`이면 PNG·PDF 받기와 "그림 다시 그리기"를 `disabled`.
  - 미리보기에 `pending`을 넘긴다.
- [ ] **Step 4: 확인** — `npm test && npx tsc --noEmit && npm run lint`. 브라우저에서(관리자 로그인):
  - (a) 가짜 Mac `--slow 10`: 회색 "그림 그리는 중…"에서 그림으로 바뀌고, 받기 버튼이 다시 켜진다.
  - (b) 가짜 Mac을 켰다가 끈 직후 다시 그리기: 60~90초 안에 Workers AI 그림으로 바뀐다(Cloudflare 할당량이 있을 때).
  - (c) 기다리는 중에 탭을 닫고 Mac도 끈 채 2분 뒤 다시 열기: 정리돼서 "그림 다시 그리기"가 켜져 있다.
  - 모바일 폭(390px)에서 알약이 미리보기를 넘치지 않는지 스크린샷으로 확인(`/tmp`에 저장).
- [ ] **Step 5: Commit** — `feat(posters): 그림 기다리기·넘어가기 화면`

### Task 8: 문서

**Files:**
- Modify: `.claude/rules/posters.md`, `CLAUDE.md`(필요할 때만)

- [ ] **Step 1: posters.md** — 「구조」에 Mac 경로 한 단락을 넣는다: 대기 목록·RPC·결과 API·넘어가기 규칙·시간 값. 「권한·제한」에 `art_local` 20/100(KST). 「확인 도구」에 `poster-art-worker.mts`와 `fake-poster-art-worker.mts` 사용법을 넣고, omm 쪽은 설계 §7을 가리킨다.
- [ ] **Step 2: CLAUDE.md** — 「보호 라우트」·환경변수는 바뀌지 않는다. `/api/poster-art/*`는 쿠키 없는 Mac 전용이라 `isSameOrigin` 예외라는 한 줄을 「보안 및 주의사항」의 `isSameOrigin` 문장 옆에 넣는다.
- [ ] **Step 3: 마무리 확인** — `npm test && npx tsc --noEmit && npm run lint`. Expected: 전부 통과. 테스트용 Mac 토큰 `test-fake`는 `revoke`한다.
- [ ] **Step 4: Commit** — `docs(posters): Mac 그림 경로 기록`. **푸시는 사용자 확인 뒤.**
