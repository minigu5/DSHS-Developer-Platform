# 대곽나루 서버로 앱 옮기기 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 같은 코드가 Cloudflare Worker(예비)와 대곽나루 서버 `srv-acad2ff0`(Node) 양쪽에서 돌게 하고, 시험 주소로 운영과 똑같이 동작함을 확인한 뒤(1단계), 사용자가 정한 시점에 dshs.dev를 서버로 옮긴다(2단계).

**Architecture:** 실행 환경은 env `DSHS_RUNTIME=node`로 가른다(없으면 지금 Worker 동작 그대로). Cloudflare 바인딩 4곳(AI·IMAGES·큐·waitUntil)에만 Node 경로를 더하고, Node에서는 시작할 때 전역 fetch에 사설 IP 차단 dispatcher를 걸어 Workers의 `global_fetch_strictly_public`을 대신한다. 서버는 포털(`server_connection/hub/portal/`)처럼 systemd 소켓 + 타이머 자동 배포(서버가 직접 빌드)로 돈다.

**Tech Stack:** Next.js 16.4 (`next start`), Node 22.23, `sharp`, `undici`, systemd, Cloudflare Workers AI REST, Pages Functions(`relay/`).

**Spec:** `docs/superpowers/specs/2026-11-11-naru-server-hosting-design.md`

## Global Constraints

- Worker 동작은 지금과 같아야 한다 — `DSHS_RUNTIME`이 없으면 모든 새 코드는 지나가기만 한다. 매 작업 끝에 `npx tsc --noEmit`, `npm test`, `npx opennextjs-cloudflare build`(Worker 빌드) 통과.
- 운영 dshs.dev·Worker·DNS는 1단계(작업 1~7) 동안 건드리지 않는다.
- 파비콘 매일 밤 동기화는 Worker cron만. 서버에는 스케줄러를 만들지 않는다.
- 서버는 운영 Supabase를 같이 쓴다.
- 비밀 값은 서버 `/srv/dshs/.env`(600)에만. 저장소·로그·빌드 결과물에 넣지 않는다. 올리기 전 그 API로 200 확인.
- 정적 파일은 같은 출처(서버 빌드에 `ASSET_PREFIX` 없음).
- `Domain=.dshs.dev` 쿠키 금지, `next/link` 직접 import 금지 등 CLAUDE.md 규칙 그대로. 문구·주석은 한국어.
- 커밋은 작업 단위로, 메시지 끝에 저장소 규칙의 Co-Authored-By·Claude-Session 줄. main 푸시는 사용자 확인 뒤(푸시 = Workers Builds 배포 + Supabase migration 자동 적용).

## Review Focus

1. **사용자 URL로 서버 내부에 닿기** — 파비콘·이미지·도메인 확인이 `http://127.0.0.1:7681`(서버의 ttyd 웹 터미널)·`10.250.0.1`·리다이렉트로 사설 IP로 가는 공개 주소·DNS 리바인딩. 모두 실패해야 한다. → 작업 2 테스트.
2. **배포 재시작 중 AI 포스터 일감** — 만들기 도중 배포가 돌면 결과가 사라지면 안 되고, 최소한 일감이 "멈춤"으로 정리돼 횟수가 돌아와야 한다. → 작업 4 테스트(`drainBackgroundJobs`).
3. **8080에 노드 nginx 말고 다른 곳에서 직접 와서 `cf-connecting-ip`를 꾸밈** — 클릭 집계 IP 위조. 방화벽으로 노드 게이트웨이만 허용. → 작업 5 확인 단계.
4. **빌드 중 메모리 2GB 초과** — 실행 중 앱(~130MB) + 빌드(최대 1.16GB). 빌드 실패면 이전 릴리스 유지, 사이트는 계속. → 작업 5 확인 단계.
5. **2단계 중계: 본문 있는 요청(POST 업로드·서버 액션)이 서버 실패 후 Worker로 다시 갈 때** — 본문이 비거나 두 번 처리되면 안 된다. → 작업 8 테스트.

---

### 작업 1: 실행 환경 갈림길 + Node 빌드 고치기

**Files:**
- Create: `src/lib/runtime.ts`, `src/lib/runtime.test.ts`
- Modify: `next.config.ts:61-63`

**Interfaces:**
- Produces: `export function isNodeServer(): boolean` — `process.env.DSHS_RUNTIME === 'node'`일 때만 true.

- [ ] **1-1 실패하는 테스트**: `runtime.test.ts` — env 없음 → false, `'node'` → true, `'NODE'`·`'1'` → false(정확히 `node`만).
- [ ] **1-2** `npm test` → 위 테스트 FAIL 확인.
- [ ] **1-3** `isNodeServer` 구현. `next.config.ts`의 `initOpenNextCloudflareForDev()`를 `process.env.NODE_ENV === 'development'`일 때만 부르기(실측: 빌드 중에도 wrangler 원격 세션을 열려다 토큰이 없어 실패).
- [ ] **1-4** `npm test` PASS, `DSHS_RUNTIME=node npx next build` 성공(맥에서, `.env.local`은 그대로 읽힘), `npx opennextjs-cloudflare build` 성공.
- [ ] **1-5** 커밋 `feat(runtime): DSHS_RUNTIME=node 갈림길, 개발 도우미는 next dev 에서만`.

### 작업 2: Node 전역 fetch 사설 IP 차단 (SSRF)

**Files:**
- Create: `src/lib/ssrf-node.ts`, `src/lib/ssrf-node.test.ts`, `src/instrumentation.ts`
- Modify: `package.json`(의존성 `undici` — Node 22.23에 든 undici와 같은 메이저)

**Interfaces:**
- Consumes: `isBlockedIp(ip: string): boolean`(`src/lib/ssrf-guard.ts`), `isNodeServer()`
- Produces: `export function safeLookup(hostname: string, options: object, callback: (err: Error | null, address: string | LookupAddress[], family?: number) => void): void` — `dns.lookup` 결과 중 `isBlockedIp`인 주소가 하나라도 있으면 `Error('blocked private address')`; `export function installSafeDispatcher(): void` — `setGlobalDispatcher(new Agent({ connect: { lookup: safeLookup } }))`.
- `src/instrumentation.ts`의 `register()`: `NEXT_RUNTIME === 'nodejs' && isNodeServer()`일 때만 `await import('@/lib/ssrf-node')` 후 `installSafeDispatcher()`. 같은 자리에서 작업 4의 SIGTERM 처리도 건다.

연결 시점(lookup)에서 거르므로 리다이렉트·DNS 리바인딩까지 막힌다. IP 리터럴 주소는 lookup을 안 거치므로 Agent `connect` 함수에서 호스트가 IP면 `isBlockedIp`로 따로 거른다.

- [ ] **2-1 실패하는 테스트** (`node --test`, `installSafeDispatcher()` 후 전역 `fetch`):
  - `127.0.0.1`에 띄운 임시 HTTP 서버로 `fetch('http://127.0.0.1:<port>/')` → reject.
  - `fetch('http://localhost:<port>/')` → reject.
  - 공개 주소처럼 보이지만 `127.0.0.1`로 302하는 서버 — 테스트 서버 자체가 루프백이라 직접 못 만들면, `safeLookup`을 단위로: `'localhost'`·`'10.250.0.1'`·`'169.254.169.254'`·`'::1'`이 에러, `'one.one.one.one'`은 통과(네트워크 없으면 skip).
  - `fetch('http://[::1]:<port>/')`·`fetch('http://10.250.0.1/')` → reject(IP 리터럴 경로).
- [ ] **2-2** FAIL 확인.
- [ ] **2-3** 구현.
- [ ] **2-4** PASS. 전역 fetch를 쓰는 Supabase·Cloudinary·Gemini·Cloudflare API는 공인 IP라 영향 없음을 `DSHS_RUNTIME=node npx next build && DSHS_RUNTIME=node npx next start` 후 홈·로그인 화면 200으로 확인. `npx opennextjs-cloudflare build` 성공(Worker 번들에 undici가 들어가도 실행되지 않아야 함 — `register()`가 Worker에서 갈림길로 빠지는지 `npm run preview`의 홈 200으로 확인).
- [ ] **2-5** 커밋 `feat(ssrf): Node 서버는 전역 fetch 가 사설 IP 로 못 가게`.

### 작업 3: 그림 축소(sharp)·AI 그림(REST) Node 경로

**Files:**
- Create: `src/lib/icon-fit-shrink-node.ts`, `src/lib/icon-fit-shrink-node.test.ts`, `src/lib/posters/art-rest.ts`, `src/lib/posters/art-rest.test.ts`
- Modify: `src/lib/icon-fit-worker.ts`(shrink 고르기), `src/lib/posters/art.ts:52-77`(AI 호출 부분), `package.json`(`sharp` 직접 의존성)

**Interfaces:**
- Produces: `export async function shrinkWithSharp(png: Uint8Array): Promise<Uint8Array | null>` — 64×64 안으로 `fit: 'inside'`, 확대 안 함, PNG. 실패 시 null.
- Produces: `export async function runArtModelRest(model: string, form: FormData, f?: typeof fetch): Promise<{ image?: string }>` — `POST https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`, `Authorization: Bearer ${CLOUDFLARE_AI_API_TOKEN}`, 본문은 그 multipart 그대로. 응답 `{ success, result: { image }, errors }`에서 `result.image`. 실패면 `Error(<errors 문구 + HTTP 상태>)`를 던져 기존 `classifyArtError(String(e))`가 한도(quota)를 알아보게.
- `icon-fit-worker.ts`: `isNodeServer()`면 `shrink: shrinkWithSharp`, 아니면 지금 그대로. `computeIconFitInWorker` 이름·시그니처 유지.
- `art.ts` `drawPosterArt`: `isNodeServer()`면 `runArtModelRest(POSTER_ART_MODEL, form)`, 아니면 지금 `env.AI.run`. 나머지(Cloudinary 업로드) 그대로.

- [ ] **3-1 실패하는 테스트**: sharp로 만든 180×180 PNG → 결과 폭·높이 ≤ 64, 32×32 → 32×32 그대로, 깨진 바이트 → null. `runArtModelRest`에 가짜 fetch: 200 `{success:true,result:{image:'QUJD'}}` → `{image:'QUJD'}`, URL·Authorization 헤더 검사, 429 + `errors:[{message:'... daily free allocation ...'}]` → 던진 에러 문구로 `classifyArtError`가 `'quota'`.
- [ ] **3-2** FAIL 확인.
- [ ] **3-3** 구현.
- [ ] **3-4** PASS + Worker 빌드 통과. 한도 문구는 지금 `classifyArtError`가 알아보는 문구를 그대로 맞출 것(파일 `src/lib/posters/decide.ts`).
- [ ] **3-5** 커밋 `feat(posters,icons): Node 서버는 sharp 축소·Workers AI REST`.

### 작업 4: 포스터 일감을 서버 안에서 + 멈출 때 기다리기

**Files:**
- Create: `src/lib/posters/node-jobs.ts`, `src/lib/posters/node-jobs.test.ts`
- Modify: `src/lib/posters/ai-jobs.ts:44-55`(큐 고르기), `src/instrumentation.ts`

**Interfaces:**
- Produces: `export function runInBackground(name: string, job: () => Promise<unknown>): void` — 진행 중 목록에 넣고 끝나면 뺀다, 에러는 `console.error`만. `export async function drainBackgroundJobs(timeoutMs: number): Promise<number>` — 남은 일이 끝나거나 시간이 다 되면, 끝나지 않은 개수를 돌려준다.
- `enqueuePosterJob`: `isNodeServer()`면 `queue = { send: async ({ jobId }) => runInBackground('poster', () => runPosterJob(jobId)) }`. 그 아래(일감 넣기·포스터 잡기·실패 시 정리)는 그대로 재사용.
- `keepAliveAfterDisconnect`(`route-guard.ts`)는 Node에서 지금처럼 undefined — Node는 끊겨도 일을 이어 간다(확인만).
- `instrumentation.ts`: Node 서버면 `process.on('SIGTERM')` → `drainBackgroundJobs(100_000)` → `process.exit(0)`. systemd 쪽은 env `NEXT_MANUAL_SIG_HANDLE=true`(Next가 SIGTERM에 바로 나가지 않게)·`TimeoutStopSec=120`(작업 5). 기다리는 동안 옛 프로세스는 서버를 닫지 않고 계속 요청을 받는다(소켓은 systemd 것이라 새 프로세스는 옛 것이 나간 뒤 뜬다 — 닫으면 그동안 요청이 커널 대기열에서 최대 100초 멈춤). 이 동작을 배포 중 요청 확인(5-3)에서 같이 본다.

- [ ] **4-1 실패하는 테스트**: 300ms 걸리는 일 2개 → `drainBackgroundJobs(1000)`이 0, 5초짜리 → `drainBackgroundJobs(100)`이 1, 에러 나는 일 → 목록에서 빠지고 drain이 0.
- [ ] **4-2** FAIL 확인.
- [ ] **4-3** 구현.
- [ ] **4-4** PASS + Worker 빌드 통과. 끝나지 못한 일감은 기존 `judgeAiJobStuck`·`settlePosterJob`이 멈춤 처리·횟수 반환하는지 코드로 확인하고 주석 한 줄.
- [ ] **4-5** 커밋 `feat(posters): Node 서버는 포스터 일감을 프로세스 안에서, 멈출 때 기다림`.

### 작업 5: 서버 설치·자동 배포

**Files (저장소 `deploy/naru/`, 서버엔 손으로 복사 — 포털 `server_connection/hub/portal/` 본보기):**
- Create: `deploy/naru/dshs.service`, `dshs.socket`, `dshs-deploy.service`, `dshs-deploy.timer`, `deploy.sh`, `listen-fd.js`(포털 것 복사·주석만 바꿈), `env.example`(키 이름만), `README.md`(설치·되돌리기·로그)

정한 값:
- 계정 `dshs-app`(시스템 계정, 홈 `/srv/dshs`, 로그인 불가). `/srv/dshs/repo`(https 공개 저장소 clone — `github.com:22`은 막혀 있음, https는 됨), `/srv/dshs/releases/<sha>`(최근 3개), `/srv/dshs/current` 심링크, env `/srv/dshs/.env`(600).
- `dshs.socket`: `ListenStream=0.0.0.0:8080`(노드 nginx가 서버 IP:8080으로 보냄). `dshs.service`: `node --require /srv/dshs/listen-fd.js node_modules/next/dist/bin/next start -p 8080`, `Environment=NODE_ENV=production DSHS_RUNTIME=node NEXT_MANUAL_SIG_HANDLE=true`, `TimeoutStopSec=120`, `Restart=always`, 포털과 같은 systemd 격리(쓰기는 `/srv/dshs`만).
- `deploy.sh`: 2분마다 `origin/main` 확인 → 바뀌었을 때만 `nice -n 19 npm ci && nice -n 19 npm run build`(env의 `NEXT_PUBLIC_*`를 빌드 전에 읽음) → 심링크 교체·재시작 → `curl localhost:8080/login` 200 아니면 이전 릴리스로 되돌림. 빌드 실패면 아무것도 안 바꿈. `fetch` 120초 제한. 옛 `/_next/static`을 새 릴리스에 채우기(포털 방식, 열린 옛 탭 404 방지). `--force` 지원.
- 방화벽: 8080은 노드 게이트웨이(서버의 기본 경로 주소, `ip route`로 확인)에서만 받는다(nftables). 22는 그대로.
- env 키: CLAUDE.md 「필수 환경변수」 전부 + `CLOUDFLARE_AI_API_TOKEN`(사용자가 새로 만든 Workers AI 토큰) + 대곽나루 연결 값(`src/lib/domains/naru.ts`가 읽는 이름). `NEXT_PUBLIC_SITE_URL`은 1단계 시험 주소.

- [ ] **5-1** `deploy.sh`를 `bash -n`·`shellcheck`(있으면)로 검사, 맥에서 임시 폴더로 `--force` 한 번 돌려 릴리스·심링크가 생기는지(빌드는 진짜로).
- [ ] **5-2** 서버에 계정·폴더·유닛·방화벽 설치, env 작성(값은 사용자 `.env.local`/사용자가 준 것 — 출력 금지, 각 키는 그 API로 200 확인), `sudo systemctl enable --now dshs.socket dshs-deploy.timer`.
- [ ] **5-3** 확인: 첫 배포 로그(`journalctl -u dshs-deploy`)에 빌드 성공, `curl -s -o /dev/null -w '%{http_code}' localhost:8080/` 200, 빌드 중 `free -m` 최대치 기록(2GB 안), 배포 중 0.2초 간격 요청 전부 200(끊김 없음), 다른 학생 서버나 서버 안에서 게이트웨이가 아닌 주소로 8080 → 막힘.
- [ ] **5-4** 커밋 `feat(deploy): 대곽나루 서버 systemd·자동 배포`.

### 작업 6: 시험 주소 붙이기

사람이 할 것과 내가 할 것:
- [ ] **6-1 (사용자)** Cloudflare 대시보드에서 Workers AI 토큰 만들기(계정 370e521d…, 권한 Workers AI · Read+Edit만) → 나에게 전달. Supabase Auth → URL Configuration → Redirect URLs에 `https://<시험 이름>.dshs.dev/**` 추가(관리 API 토큰이 있으면 내가).
- [ ] **6-2** 운영 dshs.dev에서 사용자 계정으로 공개 웹사이트 프로젝트(방문 주소 = 시험 주소 예정) → `/domains?naru=<srv-acad2ff0 서버 id>`로 시험 이름 연결. 서버 id는 대곽나루 포털이나 허브에서 확인.
- [ ] **6-3** 확인: `curl -s https://<시험 이름>.dshs.dev/cdn-cgi/trace | grep colo` → ICN, `/domains`의 서울 입구 상태 `seoul`, 홈 200, 같은 시각 운영과 첫 응답 시간 비교 기록.

### 작업 7: 1단계 완료 확인

- [ ] **7-1** 시험 주소에서 설계 문서 「완료 기준」 1단계 목록을 하나씩(로그인→…→오류 화면). 대곽나루 호스트 연결·반납은 일회성 대곽나루 서버를 만들어서. AI 포스터는 만들기 도중 탭 닫기 + 만들기 도중 `--force` 배포(Review Focus 2) 둘 다.
- [ ] **7-2** 클릭 집계 IP가 실제 IP로 들어오는지(`track_project_click` 해시가 운영과 같은 사람으로 묶이는지 — 같은 PC에서 운영·시험 각각 한 번).
- [ ] **7-3** 문서: `docs/25-naru-server.md`(구성·배포·로그·되돌리기·Worker와 다른 점), CLAUDE.md 인프라 표에 한 줄, `.claude/rules/posters.md`·`performance.md`에 Node 경로 한 줄씩. 커밋 `docs: 대곽나루 서버 운영 문서`.
- [ ] **7-4** 사용자에게 결과 보고 + 2단계 시점 묻기. **여기서 멈춘다.**

---

## 2단계 (사용자가 시점을 정한 뒤에만)

### 작업 8: 중계 함수 — 서버 먼저, 실패하면 Worker

**Files:**
- Create: `relay/functions/_forward.js`(순수 함수), `relay/test/forward.test.js`
- Modify: `relay/functions/_middleware.js`, `relay/wrangler.jsonc`(plain var `ORIGIN_HOST`, secret `ORIGIN_KEY`)

**Interfaces:**
- Produces: `export async function forwardWithFallback(request: Request, env: { ORIGIN_HOST: string, ORIGIN_KEY: string, APP: Fetcher }, fetchImpl = fetch, timeoutMs = 8000): Promise<Response>`
  - 본문 있는 요청은 먼저 `arrayBuffer()`로 담고(10MB 넘으면 담지 않고 서버로만), 서버(`https://${ORIGIN_HOST}` + 경로)로 원래 메서드·헤더·본문 + 원래 IP·키 헤더(작업 9가 정한 이름)를 보낸다. 브라우저가 보낸 같은 이름의 헤더는 지운다.
  - 연결 실패·시간 초과(응답 헤더 전) 또는 502/503/504 → 같은 요청을 `env.APP.fetch`로. 그 외(4xx·500 포함)는 서버 응답 그대로.
  - 응답에 `x-dshs-origin: naru|worker` 헤더(확인용).
- `/__relay-health`는 그대로.

- [ ] **8-1 실패하는 테스트**: 가짜 서버 200 → 서버 응답, `x-dshs-origin: naru`; 가짜 서버가 throw → APP 응답·`worker`; 503 → APP; 500 → 서버 응답 그대로; 9초 늦은 서버 + `timeoutMs=100` → APP; POST 본문 `'abc'`가 실패 뒤 APP에도 `'abc'`로; 브라우저가 보낸 키 헤더는 서버에 원래 값으로 안 감.
- [ ] **8-2** FAIL, **8-3** 구현, **8-4** PASS(`cd relay && node --test test/`).
- [ ] **8-5** 커밋. 올릴 때 `public/`만 공개 파일이고 `test/`는 안 올라가는지 `wrangler pages deploy` 출력으로 확인.

### 작업 9: dshs.dev 전용 숨은 원 주소 (대곽나루 쪽, `../server_connection`)

- 요구: 학생 사이트 주소표·`naru-sites` 중계와 섞이지 않는 이름(예: `dshs-origin-<무작위>.dshs.dev`, 주황 CNAME → 이 서버가 있는 노드 터널) → 노드 nginx가 **키가 맞을 때만** 이 서버 IP:8080으로, `Host: dshs.dev`, `CF-Connecting-IP`·`X-Forwarded-For`를 중계가 보낸 원래 IP로. 키 없으면 404. 학생 사이트 동작은 그대로.
- 학생 사이트용 `naru-sites` 구조(`server_connection/docs/ops/naru-sites-relay.md`, `hub/hosting_node.py`)를 읽고 같은 방식으로 한 칸 더하는 게 기본. 허브 코드를 바꾸면 그 저장소 규칙(테스트·문서·허브 배포)대로.
- [ ] **9-1** 설계 메모를 `server_connection/docs/ops/`에 쓰고 구현·허브 배포.
- [ ] **9-2** 확인: 키 넣은 `curl -H 'Host: <숨은 이름>'` → 서버 홈 200, 키 없이 → 404, 서버 로그의 Host가 `dshs.dev`, 학생 시험 사이트(`test2naru` 등) 그대로 200.

### 작업 10: 전환·예비 길 시험

- [ ] **10-1** 서버 env `NEXT_PUBLIC_SITE_URL=https://dshs.dev`로 바꾸고 `--force` 배포. Pages `dshs-relay`에 `ORIGIN_HOST`·`ORIGIN_KEY` 넣고 작업 8 코드 올리기 — 이 순간부터 운영이 서버로 간다(사용자 확인 뒤).
- [ ] **10-2** 확인: `curl -sI https://dshs.dev/ | grep x-dshs-origin` → `naru`, colo=ICN, 로그인·업로드·포스터 한 번씩, 클릭 집계 IP.
- [ ] **10-3** 장애 시험: `sudo systemctl stop dshs.socket dshs` → 다음 요청부터 `x-dshs-origin: worker`, 사이트 계속 200 → 다시 켜면 `naru`. 지킴이가 이 동안 주황으로 바꾸지 않았는지(중계가 살아 있으니 안 바꾸는 게 맞음) 허브 로그 확인.
- [ ] **10-4** 하루 뒤: Worker 쪽 호출 수(`x-dshs-origin: worker` 비율 대신 Workers 지표), 503 0, 서버 메모리·배포 기록. 문서(`docs/25`, CLAUDE.md 「한국 접속은 서울 입구로」 줄) 갱신·커밋.
