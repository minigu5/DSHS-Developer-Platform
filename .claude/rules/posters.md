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
  - Mac 쪽(omm, `~/Project/Localfit`)은 설계 §7 — 사용자/Localfit 세션 몫, 이 저장소에선 안 고친다.
- 이미지 AI에 포스터 통째(한글)를 맡기지 않는다 — 글자가 깨진다. Gemini 이미지 모델은 무료 키 `limit: 0`, Pollinations 탈락, 계정 여러 개로 할당량 늘리기는 약관 위반이라 안 함(사이트 Cloudflare 계정이 정지될 수 있음).
- **그림 할당량이 없을 때**: 처음 만들 때 그림 횟수를 먼저 잡고(`reserveUsage('art')`), 못 잡으면 `artAvailable: false`로 Gemini가 큰 그림도 SVG로 직접 그린다. 우리 숫자는 남았는데 Cloudflare가 할당량 바닥(4006)이면 그 자리에서 Gemini에 "ART를 SVG로 바꿔 줘"를 한 번 더(글 횟수 안 셈). 고칠 때는 기존 그림 유지.
- **그림은 아껴 쓴다**: 처음 만들 때·Gemini가 새 주문을 줄 때(HTML에 `ART` 자리가 있을 때만, `planArtAction`)·"그림 다시 그리기" 버튼에서만. 글·색·배치 수정은 HTML만 고친다.
- 저장 HTML엔 늘 `ART` 표시, 보여 줄 때 `posterSrcdoc`이 URL로 바꾸고 CSP meta(`POSTER_CSP`)를 넣는다.

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
- `/api/posters/[id]/ask`·`redraw`는 `heartbeatJson` — 15초마다 공백, 끝에 JSON. 브라우저는 `parseHeartbeatBody`. Gemini 1회 12~90초(붐비면 503 → 다음 모델).
- PNG·PDF = Cloudflare Browser Rendering REST(`/browser-rendering/screenshot`·`/pdf`, 무료 요금제 됨, 연속 요청 429). `waitForTimeout: 2000` — Google Fonts `display=swap`이라 없으면 대체 글꼴로 찍힌다. 토큰 `CLOUDFLARE_BROWSER_API_TOKEN`(Browser Rendering · Edit만).

## 확인 도구
- 실패 이유는 Workers 로그에 `[poster] …`로 남는다(상태 코드·오류 문구만, 키·프롬프트는 안 남김). `npx wrangler tail --format pretty`로 보면서 다시 눌러 보면 된다.
- `.superpowers/pipeline.mts`(커밋 안 함) 같은 스크립트로 Gemini → 정리 → 띠 합성 → PNG를 로그인 없이 확인할 수 있다. 로그인 화면 확인은 사용자 몫.
- 학교 Mac 토큰: `node scripts/poster-art-worker.mts add <name> | list | revoke <name>`(서비스 키, 토큰은 add 때 한 번만 출력·DB엔 SHA-256만). 가짜 Mac: `node scripts/fake-poster-art-worker.mts --token-file <파일> [--seed <posterId>] [--fail|--html|--twice] [--slow 초] [--site 주소]` — omm 없이 대기 목록·결과 API·넘어가기를 확인한다(`--seed`는 운영 DB 포스터를 바꾸니 끝나면 `art_url`·`art_job_id`를 되돌릴 것).
