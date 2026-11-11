# 앱 서버를 대곽나루 서버로 옮기기 (2026-11-11)

## 왜

지금 앱은 Cloudflare Workers 무료 요금제(`dshs-developer-platform`)에서 돈다. 요청마다 CPU 10ms를 넘으면 빈 503이 나고
(`docs/19-cloudflare-workers.md`, 2026-11-01 24시간 987건 중 53건), 그 때문에 표시 작업을 브라우저로 옮기는 등 계속 한도에 맞춰 왔다.
사용자는 Workers Paid 결제 대신 대곽나루(학교 서버 대여, 저장소 `../server_connection`) 서버에서 앱을 직접 돌리기로 했다.
대곽나루 포털이 이미 같은 방식(허브에서 `next start` + 서울 입구 Pages 중계)으로 돌고 있다 — 본보기:
`server_connection/docs/ops/frontend-selfhost.md`, `portal-relay.md`, `naru-sites-relay.md`, `hosting-node.md`.

## 사용자가 정한 것

1. **기준: 모든 시스템이 dshs.dev 운영과 똑같이 작동해야 한다.** 로그인(Google·`@ts.hs.kr` 제한), 프로젝트 등록·수정·삭제, 업로드(Cloudinary),
   댓글·하트, 도메인 마련하기(DNS·바로가기·대곽나루 호스트), 관리자 화면, AI 포스터(그림·글·내보내기·큐), 아이콘 맞춤값, 파비콘, 클릭 집계 등 전부.
2. **대상 서버: `ssh dshs-srv-acad2ff0`** — 대곽나루에서 빌린 서버(Incus 인스턴스). hostname `srv-acad2ff0`, 사용자 `dshs`(sudo 됨),
   Ubuntu 24.04, 1코어(i7-9700), RAM 2GB, 디스크 300GB, 바깥 출구 colo=ICN(Supabase까지 0.14초), Node 미설치, 이미 `ttyd`가 7681에서 돈다.
   관리자 계정으로 빌렸고 한도는 사용자가 정해 둠 — 전송량·기간·사양 한도는 사용자 몫이라 이번 설계에서 다루지 않는다.
   대곽나루 호스트로 `이름.dshs.dev`를 붙이면 이 서버의 **8080 포트**로 열린다(서울 입구 `naru-sites` 중계 → 노드 nginx → 서버 IP:8080).
3. **순서: 시험 → 운영 전환.**
   - 1단계(시험): 운영 dshs.dev는 그대로 두고, 이 서버에 같은 앱을 띄워 시험 주소에서 **사용자 혼자** 써 본다.
   - 2단계(전환): 괜찮으면 dshs.dev 운영 트래픽을 이 서버로 바꾼다. 전환 시점은 사용자가 정한다.
4. **운영 전환 뒤에도 Cloudflare Worker를 예비로 남긴다.** 서버가 죽으면(학교 정전·망 장애) 지금의 허브 지킴이(`_relay_guard_loop`, `RELAY_GUARD`)가
   몇 분 안에 Worker로 넘긴다. → **같은 코드가 Worker와 Node 양쪽에서 계속 돌아야 한다.** main 푸시마다 Workers Builds 배포도 계속된다.

## 목표

- 같은 저장소·같은 커밋이 Workers(OpenNext)와 Node(`next start` 계열) 양쪽으로 빌드·실행된다.
- 시험 주소에서 위 기능이 전부 운영과 같은 결과를 낸다.
- 2단계 뒤 dshs.dev 주소·쿠키·로그인·사용자 IP가 지금과 같고, 서울(ICN)로 들어온다.
- 서버 장애 시 Worker 예비 길로 자동 전환, 복구 시 자동 복귀.

## 하지 않을 것

- DB·인증 이전 안 함 — Supabase(서울) 그대로, 시험 서버도 **운영 Supabase를 같이 쓴다**(시험 주소에서 한 일은 진짜 데이터에 남는다. 사용자 혼자 쓰므로 받아들임).
- 기능·화면 변경 없음. 이번 일은 실행 환경만.
- Workers Paid 결제 안 함.
- `dshs.dev`를 pages.dev 주소로 바꾸는 안은 금지(사용자가 강하게 거절, 2026-11-05).

## 실패로 칠 것 (기술적으로 돌아가도)

- 운영 dshs.dev가 1단계 동안 조금이라도 바뀌거나 끊김.
- Worker 예비 길이 깨져서 서버 장애 때 사이트가 통째로 죽음.
- 매일 밤 작업(파비콘 동기화 등)이 Worker와 서버에서 두 번 돌거나, 아무 데서도 안 돎.
- 사용자 IP를 꾸밀 수 있게 됨(클릭 집계·속도 제한), 또는 서버 안에서 학교 내부망·`127.0.0.1`에 사용자 URL로 접근 가능(SSRF) — Workers의
  `global_fetch_strictly_public`이 Node엔 없다.
- 비밀 값이 저장소·로그·빌드 결과물에 들어감.
- `Domain=.dshs.dev` 쿠키 사용(CLAUDE.md 보안 규칙).

## 지금 Cloudflare에만 묶인 것 (조사 2026-11-11)

| 무엇 | 위치 | Node에서 |
|---|---|---|
| Workers AI 그림(`AI` 바인딩) | `src/lib/posters/art.ts` | Cloudflare REST API(`/accounts/{id}/ai/run/...`)로 같은 모델 호출 — 새 계정 토큰(Workers AI 권한) 필요 |
| 이미지 축소(`IMAGES` 바인딩) | `src/lib/icon-fit-worker.ts` | `sharp` 등 Node 라이브러리 |
| 포스터 큐(`POSTER_JOBS` 생산자 + `custom-worker.ts` 소비자) | `src/lib/posters/ai-jobs.ts`, `custom-worker.ts` | 서버 안에서 직접 실행(프로세스가 살아 있으니 탭을 닫아도 계속). `/api/poster-jobs/run`의 실제 일은 그대로 재사용 |
| `ctx.waitUntil` | `src/lib/posters/route-guard.ts`, `heartbeat.ts` | Node는 응답 뒤에도 프로세스가 살아 있음 — 그냥 진행 |
| 매일 밤 파비콘 동기화(cron `15 18 * * *`) | `custom-worker.ts` `scheduled` | **Worker cron 하나만 계속 쓴다**(Cloudflare가 트래픽과 상관없이 부르고, Worker 안에서 끝난다). 서버엔 만들지 않는다 |
| 정적 파일 CDN(`dshs-assets.pages.dev`, `ASSET_PREFIX`) | `scripts/deploy.sh`, `next.config.ts` | 서버 빌드는 같은 출처로 준다 — 대곽나루 포털이 다른 출처 청크 때문에 페이지마다 약 1초 멈춘 기록(frontend-selfhost.md 2026-11-09) |
| `cf-connecting-ip` | `src/app/api/track/route.ts` | 대곽나루 경로에서는 노드 nginx가 중계 키가 맞을 때만 원래 값으로 복원한다(naru-sites-relay.md). 2단계 경로에서도 실제 사용자 IP가 이 헤더(또는 키로 검증한 헤더)로 와야 함 |
| 개발 도우미 `initOpenNextCloudflareForDev` | `next.config.ts` | Node 빌드에서 문제없게 |
| 가이드 조각 `fragments.generated.ts` | `scripts/gen-guide-fragments.mjs` | 그대로 써도 됨 |

GitHub Actions의 매일 작업(`Check subdomains` 18:30, `Sync GitHub READMEs` 18:00)은 실행 위치와 무관 — 그대로.

## 1단계: 시험

- 주소: 대곽나루 호스트 기능으로 시험용 이름(예: `naru-test.dshs.dev`, 이름은 만드는 사람이 고름)을 이 서버에 붙인다. 서울 입구가 자동으로 붙는다
  (`/domains`의 「서울 입구 상태」로 확인). **(내 결정)** 주소를 붙일 프로젝트는 공개 웹사이트 프로젝트(비공개로 바꾸면 주소가 반납되는 규칙 —
  관리자 계정만 예외). 이 서버엔 대곽나루 주소가 하나뿐이라, 완료 기준의 「대곽나루 호스트 확인→연결→반납」은 일회성 대곽나루 서버를 따로 만들어 시험한다.
- 시험 빌드의 `NEXT_PUBLIC_SITE_URL`은 시험 주소(같은 출처 검사·리다이렉트 때문). Supabase Auth 리디렉션 허용 목록에 시험 주소 추가.
- 비밀 값·변수는 운영 Worker와 같은 목록(CLAUDE.md 「필수 환경변수」) + Workers AI REST용 토큰. 서버의 env 파일(권한 600)에만 둔다.
  Workers secret은 다시 읽을 수 없으니 값은 `.env.local`이나 사용자가 준다 — 올리기 전 그 API로 200 확인(메모 lesson-verify-secret-before-put).
- **빌드는 서버가 직접 한다**(사용자 결정 11-11). 실측(이 서버, 같은 날): Node 22.23 설치, `npm ci` 23초·430MB, `next build` 46초·최대 1.16GB
  (시스템 전체 1.37GB, 스왑은 Incus가 막아 0), `next start` 약 130MB, `/` 0.13초. 단 첫 시도는 `next.config.ts`의
  `initOpenNextCloudflareForDev()`가 빌드 중에도 wrangler 원격 세션을 열려다 토큰이 없어 1.7초 만에 실패 — 개발(`next dev`)에서만 부르게 고쳐야 한다.
  1코어라 빌드 46초 동안 사이트가 느려지므로 낮은 우선순위(`nice`)로, 새 릴리스 폴더에 빌드한 뒤 바꿔 끼우고, 실패하면 이전 릴리스 유지(포털 `deploy.sh` 방식).
  빌드 + 실행 중 앱이 합쳐 2GB 안에 들어가는지 배포 때마다 지켜볼 것.
- 앱은 8080에서 돌고, systemd로 부팅 시 자동 시작·죽으면 재시작. 배포 중 끊김을 줄이는 방식은 포털의 `portal.socket` + `listen-fd.js` 참고.
- 확인: 아래 「완료 기준」 목록을 시험 주소에서 하나씩. 같은 시각 운영과 첫 응답 시간 비교(`curl -w`, colo).

## 2단계: 운영 전환 (사용자가 시점을 정함)

- 지금: `dshs.dev` 회색 CNAME → `dshs-relay.pages.dev`(ICN) → `relay/functions/_middleware.js`가 service binding(`env.APP`)으로 Worker에 넘김.
  예비 길: 같은 CNAME을 주황으로 → Worker Route `dshs.dev/*`.
- 바꿀 것: 중계 함수가 Worker 대신 **이 서버**로 넘기게. 앱이 받는 Host는 `dshs.dev`, 사용자 IP는 진짜 값(꾸밀 수 없게), 쿠키·리다이렉트 그대로.
  학생 사이트용 숨은 원 주소(`naru-sites-origin-…`, 노드 nginx 주소표)는 `이름.dshs.dev`용이라 apex `dshs.dev`에 그대로 맞는지 확인이 필요하고,
  필요하면 대곽나루 쪽(`server_connection`, 허브·노드 nginx)도 고친다 — 같은 사용자 저장소.
  **(내 결정)** 원 주소는 학생 사이트와 섞이지 않는 dshs.dev 전용 숨은 이름으로 — 학생 사이트 주소표·터널 동작은 바뀌지 않아야 한다.
- **(내 결정) 중계 함수가 요청마다 직접 예비로 넘긴다**: 서버가 연결 실패·시간 초과·502/503/504면 같은 요청을 `env.APP`(Worker, service binding
  그대로 유지)으로 다시 보낸다. 허브·노드도 학교에 있어 학교 전체 정전·망 장애 땐 지킴이도 같이 죽기 때문이다. 본문 있는 요청은 다시 보낼 수 있게
  담아 두고, 서버가 이미 응답을 시작한 뒤에는 넘기지 않는다(두 번 처리 방지). 대곽나루 노드는 5일 넘게 켜져 있으면 KST 03:00에 재부팅되는데
  (`server_connection/docs/ops/hub-behavior.md` 「노드 자동 재부팅」) 그때도 이 길로 넘어간다.
- 지킴이는 둘째 방어선으로 그대로: 지킴이가 `/__relay-health` + `/`를 보고 3번 실패하면 주황(→ Worker). 중계 함수의 `/__relay-health`가 서버 고장을 못 보면
  `/` 확인이 잡아야 한다 — 서버가 죽었을 때 실제로 주황으로 넘어가는지 시험할 것.
- 전환 직후·하루 뒤 확인: colo=ICN, 503 없음, 로그인, 클릭 집계 IP, 포스터 큐.

## 완료 기준

1단계: 시험 주소에서 — 로그인/로그아웃·온보딩, 프로젝트 등록(아이콘 업로드·자동 아이콘·icon_fit)·수정·삭제, 비공개·익명 표시, 댓글·하트,
탐색·검색, 프로필, 개발 팁·해줘·공지 작성, 가이드 위키 편집, 도메인 마련하기(확인→연결→반납, 바로가기), 관리자 대시보드, AI 포스터(그림·글·탭 닫아도 저장·PNG/PDF 내보내기),
클릭 집계, 오류 화면. 운영 dshs.dev는 그 동안 변화 없음. Worker 빌드(`npm run deploy`)도 계속 통과.
2단계: dshs.dev가 이 서버에서 응답(ICN), 서버를 멈추면 몇 분 안에 Worker로 넘어가고 되살리면 돌아옴.

## 누가 무엇을

- Claude가 직접: 이 서버 설치·배포, 저장소 코드, `relay/` 배포, `server_connection`(허브·노드 nginx) 변경, Cloudflare DNS·Pages API, Supabase CLI.
- 사용자가 대시보드에서: 새 Cloudflare 토큰 발급(Workers AI), Supabase Auth 리디렉션 허용 목록(관리 API 토큰이 없으면), GitHub Actions secrets 확인.

## 만드는 사람에게 맡김

- 자동 배포 방식(포털처럼 타이머로 main 확인 등), 되돌리기(옛 빌드 몇 개 유지).
- 런타임 갈림길을 두는 방법(환경 변수, `getCloudflareContext` 실패 시 Node 경로 등). 단 Worker 동작은 지금과 같아야 한다.
- Node 버전(포털은 Node 22), 로그 보는 법, 프로세스 계정 분리.
- SSRF: 사용자 URL을 받는 모든 서버 fetch가 `src/lib/ssrf-guard.ts`를 거치는지 전수 확인하고, Node에서 사설·루프백·학교망 주소가 막히는지 테스트.
- 문서: `docs/19-cloudflare-workers.md` 옆에 서버 운영 문서, CLAUDE.md 인프라 표 갱신.
