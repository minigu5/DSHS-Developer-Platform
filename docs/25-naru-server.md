# 대곽나루 서버에서 돌리기 (2026-11-11 시험, 2026-11-12 운영 전환)

같은 코드가 Cloudflare Worker(지금 운영 `dshs.dev`, 나중엔 예비)와 대곽나루에서 빌린 서버(Node `next start`) 양쪽에서 돈다.
설계 `docs/superpowers/specs/2026-11-11-naru-server-hosting-design.md`, 계획 `docs/superpowers/plans/2026-11-11-naru-server-hosting.md`.
서버 파일·명령은 `deploy/naru/README.md`.

## 지금 상태

- 서버 `ssh dshs-srv-acad2ff0`(대곽나루 관리자 계정으로 빌림, Ubuntu 24.04·1코어·2GB·스왑 없음, 출구 ICN).
- 시험 주소 **`dshs2.dshs.dev`** — 운영 `/domains`에서 대곽나루 호스트로 붙임(서울 입구 `naru-sites` → 노드 nginx → 서버 `10.250.0.2:8080`). 운영 Supabase를 같이 쓴다.
- 받을 곳: GitHub `main`(2026-11-12 병합 9efb9cb부터 — 그 전 시험 땐 git bundle). main 푸시 = Workers Builds(운영 Worker) + 이 서버 2분 안 자동 배포. 다른 브랜치를 시험하려면 `/etc/dshs/deploy.conf`(`deploy/naru/README.md`).
- `NARU_HUB_KEY`는 넣지 않았다 — 시험 주소의 도메인 마련하기 "대곽나루" 호스트만 "준비 안 됨"(사용자 결정, 연결은 운영 화면에서).
- **2단계 운영 전환 완료(2026-11-12 04:28 UTC)**: `dshs.dev`는 우리 서울 입구(Pages `dshs-relay`, `relay/`)가 대곽나루 학생 주소 `dshs2.dshs.dev`로 넘긴다 — 학생이 받은 주소를 쓰는 것과 같은 길이라 허브·노드는 안 바꿈("ssh 안에서만" 원칙). 응답 헤더 `x-dshs-origin: naru|worker`.
  - 예비: 서버가 연결 실패·502/503·Cloudflare 521/522/523/530이면 같은 요청을 service binding으로 Worker에(`relay/lib/forward.js`, 테스트 `relay/test/`). 504·524·GET 10초 시간 초과는 처리됐을 수도 있어 GET/HEAD만. 12MB 넘는 본문은 다시 못 보냄. 실측: 서버를 끄자 GET·POST 모두 0.1~0.8초에 `worker`, 켜자 `naru`. 중계 자체가 죽으면 예전처럼 허브 지킴이가 주황(→ Worker Route)으로.
  - 사용자 IP: 중계 두 번이라 서버의 `cf-connecting-ip`는 입구 출구 IP — 입구가 `x-dshs-client-ip`+`x-dshs-relay-key`(Pages secret `ORIGIN_KEY` = 서버 `/etc/dshs/env`의 `DSHS_RELAY_KEY`, 맥에 사본 없음 — 바꾸면 둘 다)로 넘기고 앱은 키가 맞을 때만 믿는다(`src/lib/client-ip.ts`). 꾸민 헤더를 붙여도 진짜 IP 해시로 찍힘(미리보기에서 실측). Worker엔 키가 없어 헤더를 늘 무시.
  - 서버 `NEXT_PUBLIC_SITE_URL=https://dshs.dev`(요청 주소·같은 출처 검사 기준) — 그래서 `dshs2.dshs.dev`로 직접 들어가 쓰는 건 이제 안 맞는다(원 주소용).
  - 되돌리기: `relay/wrangler.jsonc`의 `ORIGIN_HOST`를 `""`로 바꿔 `cd relay && npx wrangler pages deploy --branch main`(계정 여러 개면 `CLOUDFLARE_ACCOUNT_ID=370e521d…`) → 예전처럼 Worker만. 미리보기는 `--branch <이름>` → `<이름>.dshs-relay.pages.dev`(env.preview).
  - 요청 헤더 한도(2026-11-12): 전환 직후 쿠키 줄이 8KB를 넘는 사용자가 노드 nginx 400 "Request Header Or Cookie Too Large"를 받음(Worker는 32KB). 대곽나루가 `large_client_header_buffers 4 32k`로 올림(server_connection d14f3fd). 입구는 헤더 한 줄 24,000자 초과나 그 400이면 Worker로(실측: 12KB 쿠키 naru, 25KB worker).
  - 주의: 정적 파일(`/_next/static`)도 같은 출처라 입구 함수 호출 수(Workers 무료 하루 10만, 계정 공유)와 대곽나루 입구(`naru-sites`, 플랫폼 계정) 호출에 더해진다. 넘칠 기미가 보이면 서버 빌드도 `ASSET_PREFIX`(pages.dev)를 쓰는 걸 검토.

## Worker와 다른 점 (`DSHS_RUNTIME=node`일 때만, `src/lib/runtime.ts`)

| 무엇 | Worker | 서버 |
|---|---|---|
| 사용자 URL fetch 사설 주소 차단 | `global_fetch_strictly_public` | `src/instrumentation.ts` → `src/lib/ssrf-node.ts`(undici 전역 dispatcher, 연결 때 거름) |
| 아이콘 맞춤값 축소 | `IMAGES` 바인딩 | `sharp`(`src/lib/icon-fit-shrink-node.ts`) |
| 포스터 그림 | `AI` 바인딩 | Workers AI REST(`src/lib/posters/art-rest.ts`, 토큰 `CLOUDFLARE_AI_API_TOKEN` — Workers AI 권한만, 하루 무료 한도는 계정 공유) |
| 포스터 일감 | Cloudflare Queues + `custom-worker.ts` | 프로세스 안(`src/lib/posters/node-jobs.ts`), 배포 재시작 때 최대 100초 기다림 |
| 걸 PNG 찍기 등 `waitUntil` | `ctx.waitUntil` | 같은 `runInBackground` |
| 매일 밤 파비콘 동기화 | Worker cron | **안 돈다**(두 번 돌지 않게 Worker만) |
| 정적 파일 | `dshs-assets.pages.dev` | 같은 출처(다른 출처 청크는 하이드레이션이 1초 늦었던 대곽나루 포털 기록) |

- `sharp`·`undici`는 `nodeRequire`(`src/lib/node-require.ts`)로만 불러 Worker 묶음에 안 들어간다(그냥 import하면 gzip +218KB, 무료 한도 3MB).
- `next.config.ts`의 `initOpenNextCloudflareForDev()`는 `next dev`에서만(빌드에서 부르면 토큰 없는 서버 빌드가 멈춤).

## 서버에서 겪은 것

- **request.url이 localhost**: `next start`는 route handler의 `request.url`을 `-H`·연 포트로 만든다(Host 헤더 안 봄, Next 16엔 `trustHostHeader`도 없음) → 로그인 콜백·클릭 집계가 `http://localhost:8080`으로 리다이렉트. `deploy/naru/preload.js`가 모든 요청을 https로 표시하고 소켓 주소를 443으로 알려 주며, 유닛이 `-H <NEXT_PUBLIC_SITE_URL의 호스트> -p 443`을 준다 → `https://dshs2.dshs.dev/…`.
- **AF_NETLINK**: systemd `RestrictAddressFamilies`에 없으면 `next start`가 `os.networkInterfaces()`에서 멈춰 요청이 영영 안 끝난다.
- **리뷰 반영(2026-11-11~12)**: IPv4를 품은 IPv6(`[::ffff:7f00:1]` 등)로 SSRF 차단이 뚫리던 것(`ssrf-guard.ts` — Worker에도 적용), 켤 때 차단 자가 시험(안 걸리면 안 켜짐), 배포 파일·비밀 값을 root 전용 위치로(`deploy/naru/README.md`), 릴리스 폴더 `<sha>-<시각>`(같은 커밋 `--force`도 돌던 폴더를 안 건드림), 실패한 커밋 반복 안 함, 빌드 OOM은 빌드가 먼저 죽게, 멈출 때 기다리는 중 새 일감도 기다리고 서버를 닫아 응답 마무리, 방화벽은 우리 표만·소켓보다 먼저(재부팅으로 순서 확인).
- **보안 재점검(2026-11-12, opus)**: 플랫폼 웹 터미널(ttyd, `dshs` 계정 — sudo 무암호)이 비밀번호를 명령줄 인자로 받고 127.0.0.1:7681에서 받아서, 앱이나 npm 패키지가 뚫리면 `/proc`에서 비밀번호를 읽어 붙은 뒤 root가 될 수 있었다(LXC drop-in이 `ProtectProc`를 꺼 둠). 고친 것: `dshs-app`의 새 연결을 커널에서 막음(사설·학교망 전부, 루프백은 7681·1023 이하 — Turbopack 빌드가 루프백 임의 포트를 써서 통째로는 못 막음), `ProtectProc=invisible`·`NoNewPrivileges` 다시 켬, 릴리스 정리를 `dshs-app`으로·이름 규칙 검사(줄바꿈 이름으로 root가 `/etc`를 지울 수 있었음), 빌드엔 `NEXT_PUBLIC_*`만·`npm ci --ignore-scripts`(sharp는 그대로 됨), `/_next/image`는 우리 Supabase 저장소·우리 Cloudinary만·원본 10MB, IPv6 대역 비트 판정, 앱 쓰기는 지금 릴리스 캐시만, 로그 640. 플랫폼 쪽은 아래 「로그인 502」 항목 때 대곽나루 세션이 처리(7681은 노드에서만, SNAT 아님 확인). LXC에서 `OOMScoreAdjust` 음수는 안 먹음(빌드 쪽 +500만 효과).
- **로그인 502**(2026-11-12): 노드 nginx가 응답 헤더 약 3.8KB를 넘으면 502 — Google 로그인 콜백의 세션 쿠키가 걸림(앱은 정상 응답). 서버 안 `127.0.0.1:8080`으론 307인데 `dshs2`로는 502인 것으로 구분(`/me?x=<3800자>`). 대곽나루 세션이 노드 nginx에 `proxy_buffer_size 16k` 등을 넣어 고침(server_connection 0a6e20a, 허브 91f12ae). 같은 때 플랫폼이 서버 안 ttyd 7681을 노드에서만 받게 막았고(`table inet dshs_ttyd_guard`), 노드는 학생 서버끼리 SNAT하지 않음을 확인(8080 출발지 판정 안전).
- **사용자 IP 꾸미기 시험**(2026-11-12): 꾸민 `CF-Connecting-IP`는 Cloudflare가 403으로 막고, `X-Forwarded-For`·`X-Real-IP`·`x-naru-client-ip`(+가짜 키)·`True-Client-IP`·`Forwarded`를 붙여도 클릭 집계엔 진짜 IP 해시가 찍혔다.
- 빌드: `npm ci`+`next build` 첫 회 약 7분, 캐시 뒤 75초. 빌드 중 서버 메모리 최대 1,699MB/2,048MB(앱 실행 중 포함). 배포 중 0.2초 간격 요청 389건 모두 200(최대 1.3초).
- 확인한 것(2026-11-11, 시험 계정): 로그인 필요한 화면, `/api/upload`(Cloudinary), 앞단 SSRF 400, 파비콘 동기화 → sharp 축소로 icon_fit 계산(180px PNG), Workers AI REST 그림 1장(0.9초), 클릭 집계 IP 해시가 실제 사용자 IP와 일치(노드 nginx가 `CF-Connecting-IP` 복원). 첫 응답: 시험 주소 약 0.35초 vs 운영 0.11초(Pages → 터널 → 노드 nginx 구간).
- 사용자 확인(2026-11-12): Google 로그인(노드 nginx 수정 뒤), AI 포스터 만들기(서버 안 일감 30초 — 그 전 두 번은 Gemini 503·시간 초과로 "지금 AI가 붐벼요", 서버 문제 아님)·그림·걸기(PNG 찍기 뒤에서 끝남).
- 사용자가 직접 볼 것: Google 로그인·온보딩, 프로젝트 등록·수정 화면, 댓글·하트, 글쓰기, 가이드 편집, AI 포스터(만들기·탭 닫기·걸기·PNG/PDF), 관리자 화면.
