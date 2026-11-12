# 대곽나루 서버에서 돌리기 (2026-11-11, 1단계 시험 중)

같은 코드가 Cloudflare Worker(지금 운영 `dshs.dev`, 나중엔 예비)와 대곽나루에서 빌린 서버(Node `next start`) 양쪽에서 돈다.
설계 `docs/superpowers/specs/2026-11-11-naru-server-hosting-design.md`, 계획 `docs/superpowers/plans/2026-11-11-naru-server-hosting.md`.
서버 파일·명령은 `deploy/naru/README.md`.

## 지금 상태

- 서버 `ssh dshs-srv-acad2ff0`(대곽나루 관리자 계정으로 빌림, Ubuntu 24.04·1코어·2GB·스왑 없음, 출구 ICN).
- 시험 주소 **`dshs2.dshs.dev`** — 운영 `/domains`에서 대곽나루 호스트로 붙임(서울 입구 `naru-sites` → 노드 nginx → 서버 `10.250.0.2:8080`). 운영 Supabase를 같이 쓴다.
- 받을 곳: 시험 중엔 GitHub에 올리지 않고 맥에서 만든 git bundle(`/srv/dshs/src.bundle`, `deploy.conf`의 `BRANCH=naru-server`). main에 합치면 `deploy.conf`를 지워 GitHub `main`을 받게.
- `NARU_HUB_KEY`는 넣지 않았다 — 시험 주소의 도메인 마련하기 "대곽나루" 호스트만 "준비 안 됨"(사용자 결정, 연결은 운영 화면에서).
- 2단계(dshs.dev를 서버로)는 아직 — 사용자가 시점을 정한다. 계획의 "허브·노드 nginx 바꾸기"는 "학생처럼 서버 ssh 안에서만" 원칙과 부딪혀 다시 설계해야 한다.

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
- **사용자 IP 꾸미기 시험**(2026-11-12): 꾸민 `CF-Connecting-IP`는 Cloudflare가 403으로 막고, `X-Forwarded-For`·`X-Real-IP`·`x-naru-client-ip`(+가짜 키)·`True-Client-IP`·`Forwarded`를 붙여도 클릭 집계엔 진짜 IP 해시가 찍혔다.
- 빌드: `npm ci`+`next build` 첫 회 약 7분, 캐시 뒤 75초. 빌드 중 서버 메모리 최대 1,699MB/2,048MB(앱 실행 중 포함). 배포 중 0.2초 간격 요청 389건 모두 200(최대 1.3초).
- 확인한 것(2026-11-11, 시험 계정): 로그인 필요한 화면, `/api/upload`(Cloudinary), 앞단 SSRF 400, 파비콘 동기화 → sharp 축소로 icon_fit 계산(180px PNG), Workers AI REST 그림 1장(0.9초), 클릭 집계 IP 해시가 실제 사용자 IP와 일치(노드 nginx가 `CF-Connecting-IP` 복원). 첫 응답: 시험 주소 약 0.35초 vs 운영 0.11초(Pages → 터널 → 노드 nginx 구간).
- 사용자가 직접 볼 것: Google 로그인·온보딩, 프로젝트 등록·수정 화면, 댓글·하트, 글쓰기, 가이드 편집, AI 포스터(만들기·탭 닫기·걸기·PNG/PDF), 관리자 화면.
