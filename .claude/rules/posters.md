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

## 구조 — 섞기(사용자 결정 2026-11-06)
- **글·배치 = Gemini**(`POSTER_TEXT_MODELS`, `generateContent` 한 번에 받기 — 스트림 조각 파싱은 CPU를 씀). 응답 = ```json 그림 주문(선택) + ```html. HTML의 큰 그림은 `<img src="ART">` 자리 하나.
- **그림 = Workers AI `flux-2-klein-9b`**(`AI` 바인딩, `src/lib/posters/art.ts`). 주문 비율 그대로, 넓이만 `POSTER_ART_MAX_AREA`까지 줄여 요청(`fitArtSize`). base64는 디코딩하지 않고 data URI로 Cloudinary `dshs/posters`에 올려 URL만 저장.
- **보내는 정보**(Gemini): 이름·종류·플랫폼·소개 요약(한 줄 소개+상세 설명 1200자)·학생 부탁, 고칠 땐 현재 HTML+최근 부탁 4개. **처음 만들 때 소스코드 공개 + GitHub 저장소면** 저장소 설명·토픽(8개)·주 언어 + README(마크다운 정리 3000자, 있으면 상세 설명 요약 대신)를 더한다(`repo-fetch.ts`·`repo-context.ts`, 사용자 요청 2026-11-06). 사이트 주소·이메일·실명·팀원은 안 보냄. Workers AI에는 Gemini가 쓴 영어 그림 프롬프트+크기만.
- 이미지 AI에 포스터 통째(한글)를 맡기지 않는다 — 글자가 깨진다. Gemini 이미지 모델은 무료 키 `limit: 0`, Pollinations 탈락, 계정 여러 개로 할당량 늘리기는 약관 위반이라 안 함(사이트 Cloudflare 계정이 정지될 수 있음).
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
- Workers AI 무료 10,000 neurons/일은 **계정 전체 공유**. 장당 비용(1024×768): klein ~1,360, flux-2-dev ~5,600, lucid/phoenix ~2,400, schnell ~330.

## 긴 응답·내보내기
- `/api/posters/[id]/ask`·`redraw`는 `heartbeatJson` — 15초마다 공백, 끝에 JSON. 브라우저는 `parseHeartbeatBody`. Gemini 1회 12~90초(붐비면 503 → 다음 모델).
- PNG·PDF = Cloudflare Browser Rendering REST(`/browser-rendering/screenshot`·`/pdf`, 무료 요금제 됨, 연속 요청 429). `waitForTimeout: 2000` — Google Fonts `display=swap`이라 없으면 대체 글꼴로 찍힌다. 토큰 `CLOUDFLARE_BROWSER_API_TOKEN`(Browser Rendering · Edit만).

## 확인 도구
- 실패 이유는 Workers 로그에 `[poster] …`로 남는다(상태 코드·오류 문구만, 키·프롬프트는 안 남김). `npx wrangler tail --format pretty`로 보면서 다시 눌러 보면 된다.
- `.superpowers/pipeline.mts`(커밋 안 함) 같은 스크립트로 Gemini → 정리 → 띠 합성 → PNG를 로그인 없이 확인할 수 있다. 로그인 화면 확인은 사용자 몫.
