---
paths:
  - "src/lib/posters/**"
  - "src/components/posters/**"
  - "src/app/(nav)/projects/[[]id]/poster/**"
  - "src/app/api/posters/**"
  - "supabase/migrations/*poster*"
---

# AI 포스터 만들기 (2026-11-06)

설계 `docs/superpowers/specs/2026-11-05-ai-poster-design.md`(11-06 개정 §5-1·§10-2·§11-0), 계획 `docs/superpowers/plans/2026-11-06-ai-poster.md`.

## 페이지 구성 (2026-11-06 사용자 결정 — 띠 받기가 기본, AI 포스터는 부가)
- 상세 버튼 "홍보 포스터"(canEdit·공개) → `/projects/[id]/poster`: 맨 위 **포스터 띠 받기**(`PosterBandDownload`, 수정할 수 있는 사람 누구나 — `getBandAccess`/`decideBandAccess`, 관리자 제한 없음), 그 아래 **AI로 포스터 만들기 [실험]**은 `access.canUseAi`(1단계 관리자)일 때만.
- 띠 PNG는 **브라우저 캔버스**로 그린다(`band-canvas.ts`, 2480×472, 서버·Browser Rendering 안 씀). 모양은 `dshs-band.css` 좌표를 그대로 옮김, 글꼴은 사이트의 `IBM Plex Sans KR Subset`·`Geist Mono`, 긴 이름은 `bandHint` 16자에서 자름. 띠 CSS를 바꾸면 캔버스 좌표도 같이.
- 직접 API 키 붙여넣기는 안 함(부족한 건 그림 할당량이라 Gemini 키로는 안 늘고, 학생 장벽·키 보관 부담).

## 구조 — 섞기(사용자 결정 2026-11-06)
- **글·배치 = Gemini**(`POSTER_TEXT_MODELS`, `generateContent` 한 번에 받기 — 스트림 조각 파싱은 CPU를 씀). 응답 = ```json 그림 주문(선택) + ```html. HTML의 큰 그림은 `<img src="ART">` 자리 하나.
- **그림 = Workers AI `flux-2-klein-9b`**(`AI` 바인딩, `src/lib/posters/art.ts`). 주문 비율 그대로, 넓이만 `POSTER_ART_MAX_AREA`까지 줄여 요청(`fitArtSize`). base64는 디코딩하지 않고 data URI로 Cloudinary `dshs/posters`에 올려 URL만 저장.
- **보내는 정보**(Gemini): 이름·종류·플랫폼·소개 요약(한 줄 소개+상세 설명 1200자)·학생 부탁, 고칠 땐 현재 HTML+최근 부탁 4개. **처음 만들 때 소스코드 공개 + GitHub 저장소면** 저장소 설명·토픽(8개)·주 언어 + README(마크다운 정리 3000자, 있으면 상세 설명 요약 대신)를 더한다(`repo-fetch.ts`·`repo-context.ts`, 사용자 요청 2026-11-06). 사이트 주소·이메일·실명·팀원은 안 보냄. Workers AI에는 Gemini가 쓴 영어 그림 프롬프트+크기만.
- **그림 = 학교 Mac mini 먼저**(2026-11-06, 설계 `docs/superpowers/specs/2026-11-06-poster-mac-art-design.md`, 계획 `docs/superpowers/plans/2026-11-06-poster-mac-art.md`). 학교망을 열지 않으려고 **Mac이 일감을 당겨 간다**: 사이트는 `poster_art_jobs`에 넣고(`enqueueArtJob`, `src/lib/posters/art-jobs.ts`) 포스터 `art_job_id`를 기록한 뒤 바로 돌려준다. Mac은 anon 키 + 자기 토큰으로 RPC `claim_poster_art_job`(3초마다, lease 180초)·`poster_art_ping`(그리는 동안 15초마다)을 Supabase에 직접 부른다(Workers 요청 수를 안 씀). 다 그리면 `POST /api/poster-art/jobs/<id>/result`(Bearer Mac 토큰 + `X-Job-Secret`, 이미지 바이트 4MB까지, 매직 넘버 검사, Cloudinary엔 Blob 그대로 — base64 안 함)·실패는 `…/fail`. 응답 200(이미 done이어도)·404(인증·상태 틀림, 이유 안 알림)·413·415·502(Cloudinary 실패, Mac이 5·15초 뒤 재시도). 이 두 경로는 쿠키 없는 기계 전용이라 `isSameOrigin` 예외.
  - Mac 살아 있음 = 최근 30초 안 연락(`macsOnline`). 아니면 처음부터 Workers AI. 처음 만들 땐 `art_local`부터 잡고 없으면 `art`.
  - 옛 그림이 있으면 새 그림이 올 때까지 그대로 두고 미리보기에 "새 그림 그리는 중…" 알약, 처음이면 그림 자리에 "그림 그리는 중…"(`posterSrcdoc(…, pending)`). 기다리는 동안 PNG·PDF·다시 그리기 꺼짐. 늦게 온 결과는 포스터가 아직 그 일감을 기다릴 때만 붙는다(되돌리기·새 주문은 옛 일감 `cancelArtJob`). 글만 고치면 기다리던 일감을 유지.
  - 브라우저가 3초마다 `GET /api/posters/<id>/art`(`settleArtJob`) — 막힘 판정(`judgeStuck`, `art-jobs-logic.ts`): queued 60초 + Mac 없음, queued 5분(줄이 김), working인데 lease+30초 지남, expired·failed. 막히면 정리하고(횟수는 일감마다 한 번만 — `releaseJobUsage`가 `usage_released_at`을 조건부로 채운 요청만 돌려줌) 브라우저가 한 번만 `redraw { via: 'cloud' }`. 서버 페이지도 열 때 한 번 정리한다. 폴링은 9분(`pollStopMs`, 막힘 판정 최대 8.5분보다 길게) 뒤 멈추고 "새로 고침" 안내.
  - Mac 쪽(omm, `~/Project/Localfit`)은 설계 §7 — 사용자/Localfit 세션 몫, 이 저장소에선 안 고친다. 2026-11-07 Mac 4대(M4 Pro 64GB, 토큰 mini-1~4) 모두 설치(시험용 브랜치 명령 `omm_poster`, 정식 omm 릴리스 뒤 다시 켬). FLUX.2 klein 4B 8비트, 그림마다 모델을 띄웠다 끔, 한 장 ~35~58초, 남은 메모리 16GB 미만이면 그 Mac은 쉰다(연락 안 함). 운영 첫 시험 성공(mini-1, 58초). 연락 상태는 `poster-art-worker.mts list`.
- 이미지 AI에 포스터 통째(한글)를 맡기지 않는다 — 글자가 깨진다. Gemini 이미지 모델은 무료 키 `limit: 0`, Pollinations 탈락, 계정 여러 개로 할당량 늘리기는 약관 위반이라 안 함(사이트 Cloudflare 계정이 정지될 수 있음).
- **그림 할당량이 없을 때**: 처음 만들 때 그림 횟수를 먼저 잡고(`reserveUsage('art')`), 못 잡으면 `artAvailable: false`로 Gemini가 큰 그림도 SVG로 직접 그린다. 우리 숫자는 남았는데 Cloudflare가 할당량 바닥(4006)이면 그 자리에서 Gemini에 "ART를 SVG로 바꿔 줘"를 한 번 더(글 횟수 안 셈). 고칠 때는 기존 그림 유지.
- **그림은 아껴 쓴다**: 처음 만들 때·Gemini가 새 주문을 줄 때(HTML에 `ART` 자리가 있을 때만, `planArtAction`)·"그림 다시 그리기" 버튼에서만. 글·색·배치 수정은 HTML만 고친다.
- 저장 HTML엔 늘 `ART` 표시, 보여 줄 때 `posterSrcdoc`이 URL로 바꾸고 CSP meta(`POSTER_CSP`)를 넣는다.
- **지시문 품질 규칙**(2026-11-07 사용자 "퀄리티 좀 올릴 수 없을까" — 휩 포스터: 두꺼운 Do Hyeon 제목이 뭉개지고, 아래 절반이 비고, 같은 부제가 두 번, 그림이 다른 색 상자처럼 떠 보였음): 구성 = 서비스 이름(짧은 이름 크게) → 이득 헤드라인 → 그림(40~50%) → **장점 3칸**(SVG 아이콘·라벨 2~8자·설명 12자). 예전 "헤드라인과 이름만, 기능 나열 금지"(대곽나루 포스터 방향)는 빈 포스터가 돼서 바꿈. 글꼴은 Noto Sans KR·IBM Plex Sans KR만(Black Han Sans·Do Hyeon·Jua 금지). 바탕 흰색 + 그림 "isolated on a pure white background" + `mix-blend-mode:multiply` — 그림 모델이 hex 바탕색은 못 맞춰서. 그림 소재는 글씨가 생기기 쉬운 것(수식·코드·문서·화면)을 피한다. 같은 날 2차(사용자가 OYE MIXX·휩 결과를 보고 "또 수정할 거 없을까" → 다 고치자): 장점은 정보가 적으면 2칸, 정보에 없는 꾸밈말(완벽·빠른·쉬운 등) 금지("모든 기기 완벽 지원"을 지어냈음), 장점 줄은 `grid repeat(n,1fr)`로 폭을 꽉(한쪽으로 쏠렸음), 그림 높이는 남는 공간을 계산해 json·img에 같이, 그림 프롬프트에 "large centered subject … compact composition".
  - **그림 주소 변환**(`art-url.ts`): 보여 줄 때 `posterSrcdoc`이 Cloudinary 주소에 `e_trim:10/c_pad,w_1.1,h_1.1,b_white`를 끼워 흰 여백을 잘라 내고(물체가 작게 그려져 위아래가 비었음), 거의 흰색은 `co_white,e_make_transparent:8/f_png`로 투명하게(multiply만으론 받은 PNG에 옅은 회색 사각형이 남았음 — 확대본은 확대한 **뒤에** 투명 처리), `img[data-poster-art]`에 multiply·`object-fit:contain`·가장자리 4% 마스크를 **우리 CSS로 강제**(JPG 흰 바탕이 살짝 회색이라 그림 칸 경계가 보였음, Gemini가 빠뜨려도 됨).
  - **인쇄용 확대**: PNG·PDF 내보내기만 Cloudinary AI 확대 `e_upscale`(4배) — 0.24MP로 줄였다가 키워서 **장당 10회**(0.25MP 넘으면 100회, 무료 한 달 25,000회 = 25 credits). 처음엔 423(~10초 만드는 중) → export가 HEAD로 3초마다 최대 20초 기다리고 안 되면 원래 그림. 확대본은 캐시라 같은 그림은 다시 안 셈. 처음 만들기가 ~15초라 PNG가 오래 걸렸다(사용자 "좀 오래 걸리는") → `PosterView.artPrintUrl`을 스튜디오가 열리거나 그림이 바뀔 때 `fetch(HEAD, no-cors)`로 미리 불러 둔다(그림마다 10회가 받기 전에도 쓰임), 버튼에 "만드는 중… N초". 2026-11-07 계정 사용량 0.42/25 credits. 학교 Mac이 더 크게 그리는 건 Localfit `poster_contract.MAX_AREA`(786,432)도 바꿔야 해서 안 함.
  - 시험: `.superpowers/try-poster.mts <폴더> <이름> [프로젝트id] [포스터id]`(커밋 안 함, 정보 → Gemini → 학교 Mac 일감 하나 → 미리보기 HTML, 포스터 줄은 안 바꿈), `rerender.mts`(저장한 raw HTML로 다시 그리기). 화면 확인은 `python3 -m http.server`로 열어 `playwright-cli`로 찍고 `/tmp`에 저장(file://는 막힘, scratchpad PNG는 Read 막힘).

- **스타일 고르기**(2026-11-07 사용자 결정 — "기능 위주로 할지 디자인 위주로 할지 정하도록"): 처음 만들 때 대화 칸 위 `SelectCard` 5개 = 알아서(기본)·사용 예시·그림·화면 캡처·글자(`style.ts`, 포인트 색은 계속 AI가). **저장하지 않는다**(DB 변경 없음) — 고칠 땐 지금 HTML이 스타일을 지닌다. `POSTER_SYSTEM`은 공통 규칙만, ③은 처음 만들 때 사용자 메시지의 "스타일:" 줄(`styleGuide`)로.
  - 사용 예시 = HTML 앱 화면 카드("넣는 것 → 나오는 것", 코드는 IBM Plex Mono) + 카드 뒤 작은 3D 장식 그림(익숙한 물건, "soft 3D render … clay"). 뜻 없는 추상 기계 그림이 별로라서(사용자 "이미지 내용이 별로") 나온 방향.
  - 그림 = 큰 ART 하나(flat vector, 누구나 알아보는 사물). OYE MIXX는 이쪽이 낫다는 사용자 평.
  - 화면 캡처 = 학생이 올린 캡처(`ImageUploadInput`, 브라우저가 `naturalWidth/Height`로 비율을 재서 보냄)를 CSS 노트북(가로)·폰(세로) 틀에. Gemini는 `<img src="SHOT">`만 쓰고 **저장 전에 서버가 캡처 주소로 바꾼다**(`fillScreenshot`, ART와 달리 저장 HTML에 주소). 우리 Cloudinary(`https://res.cloudinary.com/<CLOUDINARY_CLOUD_NAME>/image/upload/`)만 받음(`parsePosterScreenshot` — 포스터 CSP도 cloudinary만), 없으면 400 `needScreenshot`.
  - 글자 = 그림 없이 큰 낱말·색 면·SVG 도형.
  - 캡처·글자는 그림 횟수를 미리 잡지 않는다(`styleMayUseArt`). 알아서는 Gemini가 종류를 보고 셋 중 하나(캡처 제외).

## 보안
- AI HTML은 `<iframe sandbox="" srcDoc>`에만(`PosterPreview`). `allow-same-origin`·`allow-scripts` 금지. 저장 전 `sanitizePosterHtml`(script·on*·javascript:·iframe/object/embed/form/base·meta refresh·Google Fonts 외 link).
- `project_posters`·`ai_usage`는 RLS 켜고 정책 없음 — 서버가 `getPosterAccess` 뒤 서비스 키로만. API는 `guardPosterRequest`(isSameOrigin → 포스터 → 권한).
- 띠는 밝게/어둡게(`band_tone`)·위/아래(`band_position`, 사용자 요청 2026-11-06) — 스튜디오 세그먼트, 미리보기는 `flex-col-reverse`, 내보내기는 `posterExportPage(…, position)`.
- 띠·QR은 우리 코드(`posterBandHtml`, 원본 CSS `docs/superpowers/specs/2026-11-05-ai-poster/dshs-band.css`). Gemini에 사이트 주소를 보내지 않는다(가짜 주소를 지어냈음).

## 권한·제한
- **1단계 관리자만**: `POSTER_OPEN_TO_ALL = false`(`config.ts`), 공개 프로젝트만(비공개로 바뀌면 숨김, 지우지 않음), 차단된 사람 불가. 판정 `decidePosterAccess`.
- 2단계(학생에게 열기): 플래그 true + 처리방침(설계 §9 — Google Gemini 위탁·학습 가능)을 **같은 배포**에 넣는다 → 전원 재동의. `.claude/rules/privacy.md` 참고.
- 횟수(`POSTER_LIMITS`, DB `reserve_ai_usage`로 예약·실패 시 `release_ai_usage`): 글 사람당 20/일·사이트 200/일(**KST 자정**), 그림 사람당 5/일·사이트 6/일(**UTC 자정 = KST 09:00**, Cloudflare 할당량과 같은 시계). 프로젝트당 포스터 3개(트리거 `poster_limit`), **새 포스터는 프로젝트마다 하루(KST) 1개**(사용자 결정 2026-11-06 — `project_poster_days`에 만든 날을 남겨 지웠다 다시 만들어도 `poster_daily`로 막음, 고치기는 위 글 한도대로). 버전 5개·대화 10개.
- **학교 Mac 그림 `art_local`**: 사람당 20/일·사이트 100/일(**KST 자정**). Mac 처리량을 실측해서 조정. 기존 `art`(Workers AI)는 넘어가기용으로 그대로.
- Workers AI 무료 10,000 neurons/일은 **계정 전체 공유**. 장당 비용(1024×768): klein ~1,360, flux-2-dev ~5,600, lucid/phoenix ~2,400, schnell ~330.

## 긴 응답·내보내기
- **만들기·고치기·다시 그리기 = Cloudflare Queues 일감**(2026-11-07, 탭을 닫아도 끝까지 저장). 예전엔 `heartbeatJson`으로 응답을 붙잡고 `ctx.waitUntil`에 맡겼는데, Cloudflare는 연결이 끊긴 뒤 waitUntil을 **30초까지만** 이어 가서 Gemini(1회 12~90초, 붐비면 503 → 다음 모델)가 남아 있으면 결과도 횟수도 사라졌다.
  - 흐름: `ask`·`redraw`(Workers AI 길만 — 학교 Mac 길은 원래 바로 돌려줌)가 권한·횟수를 확인하고 `enqueuePosterJob`(`ai-jobs.ts`) → `poster_ai_jobs`에 일감(부탁·스타일·캡처 + 요청 때 확인한 프로젝트 정보 `PosterActor` — 소비자에겐 로그인 쿠키가 없다) + 포스터 `ai_job_id`(조건부, 이미 있으면 409 `aiBusy`) + 큐 `poster-jobs`에 `{ jobId }` → 바로 `{ ok, queued, jobId }`.
  - 큐 소비자 = `custom-worker.ts`의 `queue()`(wrangler `main`이 이 파일 — OpenNext `.open-next/worker.js`의 fetch를 그대로 감쌈). 같은 Worker를 `WORKER_SELF_REFERENCE` service binding으로 `POST /api/poster-jobs/run`(헤더 `x-poster-job-sig` = 일감 id의 HMAC-SHA256, 키 = `SUPABASE_SERVICE_ROLE_KEY` — 새 비밀값 없음, `ai-jobs-logic.ts`)을 부르고 **응답을 끝까지 기다린다**(소비자 한 번 최대 15분). 실제 일은 Next 경로가 그대로 해서(`run-ai.ts` `runPosterAsk`·`runPosterRedraw`) CPU 10ms도 요청마다 따로. 404(서명 틀림)는 버리고, 5xx·연결 오류는 10초 뒤 두 번까지 다시 — `runPosterJob`이 queued → working을 조건부로 바꾼 요청만 돌리므로 중복 배달에도 한 번.
  - 횟수는 `UsageLedger`(`usage.ts`)로만 잡고 돌려준다: 잡은 것은 `poster_ai_jobs.holds`에 적고, 쓴 것(그림을 그렸거나 학교 Mac 일감이 맡음)은 `spend`로 뺀다. 끝나면 holds를 비운다. 일감이 중간에 죽으면 `settlePosterJob`이 막힘 판정(`judgeAiJobStuck` — queued 10분, working 시작 16분)으로 expired + `usage_released_at`을 조건부로 채운 요청만 남은 holds를 한 번 돌려준다. 적기 → 돌려주기 순서라 그 사이에 죽으면 덜 돌려줄 뿐 두 번은 아니다.
  - 브라우저: `{ queued }`면 `poster.aiJobId`를 두고 3초마다 `GET /api/posters/<id>/job?id=<jobId>`(정리도 여기서) → done(notice 알림)·failed(error 알림) 때 포스터를 바꾼다. 서버 페이지도 열 때 `settlePosterJob`, 아직 돌고 있으면 `aiJobId`로 이어서 기다린다(창을 닫았다 다시 열어도 "만드는 중"·결과가 보임). 돌고 있는 동안 되돌리기·다시 그리기·내보내기·보내기 꺼짐(되돌리기는 서버 액션도 거절 — 끝나며 저장하면 덮어씀). 실패 결과는 그 탭이 기다리고 있을 때만 알림으로 보이고(대화 기록엔 안 남김), 횟수는 돌려준다.
  - **큐를 못 쓰면 예전 방식**: `next dev`(소비자 없음)·바인딩 없음·일감/큐 넣기 실패면 `heartbeatJson`(15초마다 공백, 끝에 JSON, 브라우저 `parseHeartbeatBody`) + `keepAliveAfterDisconnect`로 직접 한다. 이때만 나가려 하면 묻는다(`useUnsavedWarning`, `POSTER_COPY.leaveWhileBusy`). 그래서 로컬 `npm run dev`로는 큐 길을 시험할 수 없다 — 운영(또는 `npm run preview`)에서 확인.
  - 큐 `poster-jobs`는 2026-11-07 `npx wrangler queues create poster-jobs`로 만들었다(계정 370e521d…, 무료 — 하루 10,000 operations, 메시지 하나 ≈ 3, 보존 24시간). wrangler.jsonc `queues`의 큐가 없으면 배포가 실패하니 지우지 말 것. 확인: `npx wrangler queues list`, 실패는 `wrangler tail`의 `[poster] 큐 …`.
  - 배포 순서: migration `20261107130000_poster_ai_jobs.sql`을 **먼저 따로 main 푸시**(Supabase 자동 적용) → 그다음 코드 푸시(Workers Builds). 코드가 먼저 가면 `ai_job_id` 칸이 없어 포스터 API가 깨진다.
- 학교 Mac 그림은 탭과 상관없이 끝나고, 탭을 닫은 사이 막혔으면 다시 열 때 서버 페이지가 정리하고 `artGaveUp`으로 브라우저가 한 번 클라우드로 다시 그린다(그 다시 그리기도 큐 일감).
- PNG·PDF = Cloudflare Browser Rendering REST(`/browser-rendering/screenshot`·`/pdf`, 무료 요금제 됨, 연속 요청 429). `waitForTimeout: 2000` — Google Fonts `display=swap`이라 없으면 대체 글꼴로 찍힌다. 토큰 `CLOUDFLARE_BROWSER_API_TOKEN`(Browser Rendering · Edit만).

## 확인 도구
- 실패 이유는 Workers 로그에 `[poster] …`로 남는다(상태 코드·오류 문구만, 키·프롬프트는 안 남김). `npx wrangler tail --format pretty`로 보면서 다시 눌러 보면 된다.
- `.superpowers/pipeline.mts`(커밋 안 함) 같은 스크립트로 Gemini → 정리 → 띠 합성 → PNG를 로그인 없이 확인할 수 있다. 로그인 화면 확인은 사용자 몫.
- 학교 Mac 토큰: `node scripts/poster-art-worker.mts add <name> | list | revoke <name>`(서비스 키, 토큰은 add 때 한 번만 출력·DB엔 SHA-256만). 가짜 Mac: `node scripts/fake-poster-art-worker.mts --token-file <파일> [--seed <posterId>] [--fail|--html|--twice] [--slow 초] [--site 주소]` — omm 없이 대기 목록·결과 API·넘어가기를 확인한다(`--seed`는 운영 DB 포스터를 바꾸니 끝나면 `art_url`·`art_job_id`를 되돌릴 것).
