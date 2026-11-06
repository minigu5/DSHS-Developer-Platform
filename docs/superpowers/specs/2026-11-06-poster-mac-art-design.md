# AI 포스터 그림을 학교 Mac mini로 — 설계

2026-11-06. 기존 설계: `2026-11-05-ai-poster-design.md`, 기능 문서: `.claude/rules/posters.md`.

## 1. 왜

사용자(사이트 관리자)가 직접 포스터를 만들어 보다가 그림 한도에 막혔다. 지금 그림은 Workers AI 무료 할당량(계정 전체 10,000 neurons/일)에 묶여 **사이트 전체 하루 6장**이다.

학교에 Mac mini 4대(M4 Pro 32GB로 기억 — 확인 필요)를 Thunderbolt로 묶은 클러스터가 있다. 이 클러스터는 사용자가 직접 만든 오픈소스 `omm`(`~/Project/Localfit`)의 `omm cluster`(exo)로 돌아간다. 이 Mac들이 그림을 그리게 하면 한도는 기계가 처리할 수 있는 양만큼 늘어난다.

## 2. 목표 · 비목표 · 안 되는 것

**목표**
- 포스터 그림(만들기·"그림 다시 그리기")을 학교 Mac mini의 mflux로 그린다. Mac이 켜져 있는 동안 그림 한도를 크게 올린다.
- 학교망은 밖에 열지 않는다. 들어오는 연결 없이 Mac이 밖으로만 연결한다.
- Mac이 꺼져 있거나 멈추면 지금 방식(Workers AI → 바닥나면 Gemini SVG)으로 자연스럽게 넘어간다.

**비목표(이번에 안 함)**
- 글·배치(Gemini)를 Mac(exo)으로 옮기기. 그림이 잘 돌면 다음 단계에서 한다(사용자 결정). 다만 대기 목록은 `kind`를 둬서 나중에 `text`를 더할 수 있게 한다.
- 학생에게 열기(`POSTER_OPEN_TO_ALL`). 당분간 관리자만 쓰고, 괜찮으면 기존 2단계 계획대로 연다(처리방침·재동의, `.claude/rules/privacy.md`).
- `/admin`에 Mac 상태 화면 만들기.

**안 되는 것(이렇게 되면 실패)**
- 학교망 안으로 들어오는 경로가 생긴다: 터널, 공개 주소, 방화벽 포트, omm 게이트웨이(52440) 노출.
- omm의 공유 문서 검색(RAG)이나 exo API가 사이트 쪽에서 닿는다.
- Mac에 Cloudinary 비밀 키나 Supabase 서비스 키를 둔다.
- 대기 요청 때문에 Cloudflare Workers 무료 한도(요청 10만/일, CPU 10ms/요청)를 넘긴다.

## 3. 나눠 맡기

- **사이트(DSHS, 이 저장소)**: 대기 목록 DB, Mac 전용 API, 포스터 화면의 "그림 그리는 중…", 넘어가기. 이 설계로 구현한다.
- **omm(Localfit)**: Mac에서 일감을 받아 mflux로 그리는 부분. **설계만 여기(§7)에 적고 수정은 사용자가 직접 한다.** 이 저장소의 계획·구현에는 omm 코드 변경을 넣지 않는다.

## 4. 전체 흐름

```
[브라우저] ──만들기/다시 그리기──▶ [Worker /api/posters/...]
                                   │ Mac 살아 있음? (최근 30초 안에 연락)
                                   ├─ 아니오 → 지금 방식(Workers AI / SVG) 그대로
                                   └─ 예 → poster_art_jobs 에 queued 로 넣고
                                           project_posters.art_job_id 기록,
                                           포스터를 바로 돌려줌(그림 자리는 "그리는 중")
[Mac ×4] ──3초마다 rpc claim_poster_art_job(토큰)──▶ [Supabase]   (Worker 안 거침)
   └ 받으면 mflux 로 그림 ──POST 이미지──▶ [Worker /api/poster-art/jobs/:id/result]
                                           └ Cloudinary 에 올리고 포스터 art_url 채움
[브라우저] ──3초마다 GET /api/posters/:id/art──▶ 끝났으면 새 포스터로 교체
```

- Mac은 Supabase RPC로 일감을 받는다(anon 키 + Mac 토큰). Worker 요청을 쓰지 않으려는 것이다. Mac 4대가 3초마다 Worker에 물으면 하루 11.5만 요청으로 무료 한도를 넘는다.
- 그림 파일만 Worker로 올린다. Cloudinary 비밀 키는 Worker에만 있다.

## 5. 사이트 쪽 상세

### 5-1. DB (새 migration 하나)

**`poster_art_workers`**: Mac 한 대당 한 줄.
- `id uuid PK`, `name text UNIQUE`(예: `mini-1`), `token_hash text NOT NULL`(토큰의 SHA-256 hex), `created_at`, `last_seen_at timestamptz`, `revoked_at timestamptz`
- RLS 켬, 정책 없음, anon/authenticated `REVOKE ALL`. 서비스 키와 아래 SECURITY DEFINER 함수만 쓴다.

**`poster_art_jobs`**: 그림 일감.
- `id uuid PK`, `kind text NOT NULL DEFAULT 'art' CHECK (kind IN ('art'))`(나중에 `text`), `poster_id uuid FK → project_posters ON DELETE CASCADE`, `user_id uuid`(횟수 돌려주기용), `prompt text`(Gemini가 쓴 영어 그림 프롬프트, 1000자 상한), `width int`, `height int`(`fitArtSize` 결과)
- `status text CHECK IN ('queued','working','done','failed','canceled','expired')`
- `worker_id uuid FK`, `job_secret_hash text`, `claimed_at`, `lease_until timestamptz`, `attempts int DEFAULT 0`, `result_url text`, `error text`(짧은 사유만), `created_at`, `finished_at`
- 인덱스 `(status, created_at)`. RLS·권한은 위와 같다.

**`project_posters.art_job_id uuid NULL`**(FK → `poster_art_jobs ON DELETE SET NULL`): 지금 기다리는 그림. NULL이면 기다리는 것 없음. `project_posters`는 이미 `REVOKE ALL`이라 칸 GRANT는 필요 없다(projects 표의 칸 GRANT 규칙과 무관).

**`ai_usage.kind`** CHECK에 `'art_local'` 추가. 날짜는 KST(`ai_usage_day`는 `'art'`만 UTC라 그대로 두면 된다).

**RPC `claim_poster_art_job(p_token text)`**: SECURITY DEFINER, `search_path = ''`, `EXECUTE`는 anon에만(+service_role).
1. `p_token`의 SHA-256으로 `revoked_at IS NULL`인 Mac을 찾는다. 없으면 NULL(이유를 알려 주지 않음).
2. `last_seen_at = now()`.
3. `working`인데 `lease_until < now()`이고 `attempts < 2`인 일감은 `queued`로 되돌리고, `attempts >= 2`면 `expired`로 바꾼다.
4. 가장 오래된 `queued` 하나를 `FOR UPDATE SKIP LOCKED`로 잡는다. `working`, `worker_id`, `claimed_at`, `lease_until = now() + 180초`, `attempts + 1`로 바꾸고, 무작위 job secret을 만들어 해시만 저장한다.
5. `{ id, prompt, width, height, job_secret }` 또는 NULL을 돌려준다.

**RPC `poster_art_ping(p_token text)`**: 그리는 동안 살아 있음을 알린다. `last_seen_at`만 갱신하고, 권한은 위와 같다.

규칙은 CLAUDE.md 「DB 정리」를 따른다: SECURITY DEFINER는 `search_path = ''`, `extensions.digest`처럼 스키마를 적는다.

### 5-2. 어디로 보낼지 정하기

`macsOnline()`: `revoked_at IS NULL AND last_seen_at > now() - 30초`인 Mac이 하나라도 있으면 참(서비스 키).

- **ask(만들기·고치기)**: Gemini가 그림 주문을 줬고(`planArtAction === 'draw'`) `macsOnline()`이면 `reserveUsage('art_local')` → 일감 넣기 → `art_job_id` 기록 → 포스터 저장·반환(`artPending: true`).
  - 처음 만들 때 지금 코드는 그림 횟수를 Gemini 호출 **전에** 잡아 `artAvailable`을 정한다. Mac이 살아 있으면 `art_local`을 먼저 잡고 `artAvailable = true`로 둔다. `art_local`이 바닥났거나 Mac이 없으면 지금처럼 `'art'`를 잡는다.
- **redraw**: 같은 판단. Mac이면 일감을 넣고 바로 `{ ok, poster(artPending) }`를 돌려준다. heartbeat가 필요 없다.
- **버전·대화 기록은 일감을 넣을 때 만든다**(`nextPosterState` 한 번, 지금과 같은 자리). 이때 `art_url`은 이렇게 둔다(제 결정).
  - 처음 만들 때(옛 그림 없음): `null`. 화면은 "그림 그리는 중…" 자리.
  - 다시 그리기·고치기에서 새 주문이 왔을 때: **옛 그림을 그대로 둔다**. 새 그림이 오면 바뀐다. 기다리는 동안 미리보기 위에 작은 "새 그림 그리는 중…" 표시를 띄운다. 실패하거나 넘어가기도 실패하면 옛 그림이 남는다.
  - "되돌리기"는 지금처럼 이전 버전의 `art_url`을 복원한다.
- `art_local`을 잡고 Gemini를 부른 사이에 Mac이 사라져도 일감은 그대로 넣는다. §5-4의 넘어가기가 처리한다(제 결정, ask 분기를 단순하게).
- 이미 기다리는 그림이 있을 때:
  - 새 주문이 오면 옛 일감을 `canceled`로 바꾼다. 아직 아무 Mac도 안 잡은 일감이면 `art_local` 횟수를 돌려준다.
  - "그림 다시 그리기"는 막는다("그림을 그리는 중이에요").
  - "되돌리기"를 하면 기다리던 일감을 취소한다.

### 5-3. Mac 전용 API

`POST /api/poster-art/jobs/[jobId]/result`
- 헤더 `Authorization: Bearer <Mac 토큰>`, `X-Job-Secret: <claim 때 받은 값>`, `Content-Type: image/png | image/jpeg | image/webp`, 본문은 이미지 바이트 그대로이고 4MB까지.
- 쿠키를 쓰지 않는 기계 전용 경로라 `isSameOrigin` 대상이 아니다. 대신 아래를 모두 확인하고, 하나라도 틀리면 같은 404를 낸다(무엇이 틀렸는지 알려 주지 않음).
  - 토큰 해시가 맞는 Mac이 있고 끊기지 않았다.
  - 일감이 `working`이고, `worker_id`가 그 Mac이며, job secret 해시가 맞고, `lease_until + 30초`를 넘지 않았다.
- 파일 검사: `Content-Length` 상한, 첫 바이트 매직 넘버(PNG·JPEG·WebP), 실제 길이.
- Cloudinary 올리기: base64로 바꾸지 않는다(CPU). 본문을 Blob 그대로 `FormData`에 넣고 Cloudinary REST upload(`folder: dshs/posters`, 서명은 Worker에서 SHA-1로 만듦)에 `fetch`한다. 지금의 `transformation`(quality auto, fetch_format auto)도 그대로 둔다.
- 응답 코드(제 결정)
  - `200 { ok: true }`: 저장됨. 같은 일감에 같은 Mac이 다시 보내도(이미 `done`) 200을 돌려주고 아무것도 바꾸지 않는다(멱등).
  - `404`: 인증·상태가 틀림(취소·교체·lease 초과 포함). Mac은 재시도하지 않고 버린다.
  - `413`·`415`: 크기·형식이 틀림. Mac은 재시도하지 않는다.
  - `502`: Cloudinary 업로드 실패. 일감은 `working` 그대로 둔다. Mac은 lease 안에서 최대 2번 더 보내고(5초·15초 뒤), 그래도 안 되면 `fail`을 보낸다.
- 성공하면 일감을 `done`으로 바꾸고 `result_url`을 기록한다. 포스터의 `art_job_id`가 **이 일감일 때만** `art_url`을 바꾸고 `art_job_id = NULL`로 비운다. 그사이 취소·교체됐으면 포스터는 건드리지 않는다.
- 버전·대화 기록: 그림이 늦게 도착한 것은 새 버전을 만들지 않고 현재 상태의 `art_url`만 채운다.

`POST /api/poster-art/jobs/[jobId]/fail`: 인증은 위와 같다. 본문은 `{ reason }`(200자). 일감을 `failed`로 바꾸고 `art_local` 횟수를 돌려준다. 브라우저 쪽 처리는 §5-4의 넘어가기와 같다.

### 5-4. 브라우저 · 넘어가기

- `PosterView`에 `artPending: boolean`(= `art_job_id`가 있음)을 더한다.
- 미리보기의 그림 자리는 기다리는 동안 "그림 그리는 중…" 표시가 있는 자리로 보인다(지금의 `EMPTY_ART` 자리와 구별). PNG·PDF 내보내기와 "그림 다시 그리기"는 기다리는 동안 꺼 둔다.
- `GET /api/posters/[posterId]/art`(`guardPosterRequest`): `{ status: 'pending' | 'done' | 'expired' | 'failed', poster? }`. 브라우저는 `artPending`일 때만 3초마다 부르고, 6분이 지나면 그만 부른다. 페이지를 새로 열었을 때 `artPending`이면 다시 부르기 시작한다.
- **넘어가기 판정은 이 GET에서** 한다. 아래 중 하나면 "막힘"이다(제 결정).
  - `queued`이고 60초가 지났는데, 최근 30초 안에 연락한 Mac이 없다(모두 꺼짐).
  - `queued`이고 5분이 지났다. Mac은 살아 있지만 줄이 너무 길다. 바쁘다고 바로 클라우드로 넘기면 Workers AI 하루 6장이 금방 바닥나서 더 기다린다.
  - `working`인데 `lease_until + 30초`가 지났다(그리던 Mac이 죽음). claim RPC는 Mac이 불러야 돌기 때문에, Mac이 하나도 없으면 여기서 정리해야 한다.
  - 일감이 `expired`·`failed`다.
- 막힘이면 일감을 정리한다: `expired`로 바꾸고(`failed`는 그대로), `art_local`을 돌려주고(`fail`에서 이미 돌려줬으면 건너뜀), `art_job_id = NULL`.
- 서버 페이지가 포스터를 그릴 때도 같은 판정을 한 번 돌린다. 그래야 브라우저가 다 닫힌 뒤 남은 `art_job_id`가 "그림 다시 그리기"를 영원히 막지 않는다.
  - 응답은 `status: 'expired'`. 브라우저는 그걸 받으면 한 번만 자동으로 `POST /redraw { via: 'cloud' }`를 부른다. 이 경로는 Mac 판단을 건너뛰고 지금 방식(Workers AI, 'art' 횟수)으로 그린다.
  - 클라우드도 바닥이면 그림 자리는 비어 있거나(처음 만들 때) 옛 그림이 남고, "그림을 못 그렸어요. 잠시 뒤 '그림 다시 그리기'를 눌러 주세요."를 보여 준다. 처음 만들 때의 SVG 대체는 Mac이 처음부터 꺼져 있던 경우(ask 안에서)에만 생긴다.
- 기다리는 동안 서버가 붙잡고 있지 않는다. Worker 안에서 DB를 반복해서 물으면 CPU 10ms를 넘길 수 있다.

### 5-5. 한도 (`POSTER_LIMITS`)

- `artLocalPerUserPerDay: 20`, `artLocalSitePerDay: 100`(KST). Mac 처리량을 실측하고 조정한다.
- 기존 `artPerUserPerDay: 5`, `artSitePerDay: 6`(Workers AI)은 넘어가기용으로 그대로 둔다.
- 프로젝트마다 새 포스터 하루 1개, 포스터 3개, 글 횟수는 바꾸지 않는다.

### 5-6. Mac 토큰 관리

- `scripts/poster-art-worker.mts`(서비스 키, 로컬에서 실행). 하위 명령은 `add <name>`, `list`, `revoke <name>`이다.
  - `add`는 32바이트 무작위 토큰(base64url)을 **한 번만 출력**하고 해시만 저장한다.
  - `list`는 이름·마지막 연락·끊김 여부를 보여 준다.
- 토큰은 Mac마다 따로 둔다. 하나가 새면 그것만 끊는다.

### 5-7. 보안 정리

- 학교망: 들어오는 연결이 없다. Mac은 `*.supabase.co`와 `dshs.dev`로만 HTTPS를 연다.
- Mac 토큰으로 할 수 있는 일:
  - 일감 받기. 영어 그림 프롬프트와 크기가 보인다. 프로젝트 이름·사용자 정보는 일감에 넣지 않는다.
  - 자기가 받은 일감에 이미지를 올리거나 실패로 표시하기.
  - 그 밖의 읽기·쓰기는 없다.
- 토큰이 새면 최악의 경우: 남이 일감을 가로채 엉뚱한 그림을 올릴 수 있다. 이미지 형식만 받고, 그림은 `sandbox` iframe 안의 `<img>`로만 쓰이며, 해당 Mac 토큰을 끊으면 끝난다.
- anon 키는 원래 공개되어 있다. claim RPC는 토큰 없이는 아무것도 돌려주지 않는다. 토큰은 32바이트라 추측할 수 없다.
- 로그는 기존 `[poster] …` 형식을 따른다. 상태·일감 id만 남기고 토큰·프롬프트는 남기지 않는다.

### 5-8. 문서·확인

- `.claude/rules/posters.md`에 Mac 경로·한도·토큰 스크립트를 반영한다. CLAUDE.md는 필요하면 환경변수 줄만 고친다(새 비밀값은 없을 예정, Cloudinary 키는 기존 것).
- omm 없이도 끝까지 확인할 수 있게 **가짜 Mac 스크립트**(`scripts/fake-poster-art-worker.mts`, 커밋)를 만든다. claim RPC를 부르고 고정 이미지를 result로 올린다. 넘어가기(60초 무응답)·취소·늦게 온 결과 무시도 이걸로 확인한다.
- 배포 순서: migration은 새 표·칸만 더하므로 먼저 적용돼도 기존 코드가 안 깨진다. main 푸시 = migration 자동 적용(메모리 「main 푸시 = Supabase migration 자동 적용」)이니 같은 푸시여도 되지만, 적용 결과를 확인한다.

## 6. 처리방침

지금은 관리자만 쓰므로 바꾸지 않는다. 학생에게 열 때(2단계): 그림 프롬프트는 외부 위탁(Cloudflare) 대신 **사이트 운영자가 관리하는 학교 컴퓨터**에서 처리되고, Mac이 꺼져 있으면 Cloudflare로 간다. 이 내용을 처리방침 개정에 같이 넣는다.

## 7. omm 쪽 설계 (사용자가 Localfit에서 구현)

이름·명령 형태는 omm 관례에 맞춰 사용자가 정한다. 아래는 사이트와 맞물리는 약속과 지켜야 할 것이다.

**하는 일**: Mac마다 백그라운드 서비스(LaunchAgent, 예: `com.omm.poster-art`) 하나가 일감을 받아 mflux로 그려 올린다. 클러스터의 4대 모두에서 돈다. head만 도는 게 아니고, 직원 PC에서는 돌지 않는다.

**사이트와의 약속**
- 설정값: `SUPABASE_URL`, `SUPABASE_ANON_KEY`(공개값), `SITE_URL=https://dshs.dev`, Mac 토큰(§5-6 `add`로 받은 것).
- 받기: `POST {SUPABASE_URL}/rest/v1/rpc/claim_poster_art_job`, 헤더 `apikey`·`Authorization: Bearer <anon>`, 본문 `{"p_token": "<Mac 토큰>"}`. NULL이면 3초 쉬고 다시. 네트워크 오류면 지수 백오프(최대 60초).
- 그리는 동안 15초마다 `rpc/poster_art_ping`.
- 올리기: `POST {SITE_URL}/api/poster-art/jobs/<id>/result`, 헤더 `Authorization: Bearer <Mac 토큰>`, `X-Job-Secret`, `Content-Type: image/jpeg`(권장, 품질 90 정도) 또는 png/webp, 4MB 이하.
- 응답 코드별 행동은 §5-3대로: 200이면 끝, 404·413·415면 버림(재시도 안 함), 502면 5초·15초 뒤 두 번 더 보내고 그래도 안 되면 fail.
- 실패: `POST …/<id>/fail` `{"reason": "짧은 이유"}`. 180초(lease) 안에 못 끝낼 것 같으면 중단하고 실패로 보낸다.
- 한 Mac은 한 번에 일감 하나만.

**그림**
- 크기: 일감의 `width`·`height`(넓이 ≤ 786,432, 비율 유지). mflux가 요구하는 배수(16 또는 64)에 맞게 내림하고, 사이트는 받은 크기를 그대로 쓴다.
- 모델: 상업적 이용까지 허용되는 라이선스로 고른다. 예: FLUX.1 schnell(Apache-2.0, 4단계). FLUX.1 dev·FLUX.2 klein 9B는 비상업 라이선스라 피한다. mflux가 지원하는 Apache 계열 FLUX.2 klein 4B가 있으면 품질을 비교해 골라도 된다.
- 프롬프트는 데이터로만 쓴다. 셸 명령에 끼워 넣지 말고, mflux를 파이썬 안에서 부르거나 인자 배열로 넘긴다.

**메모리 · 전원**
- exo가 모델을 올려 이 Mac의 메모리를 쓰고 있으면, mflux 모델이 들어갈 여유가 있을 때만 일감을 받는다. 판단은 omm `memory_guard` 기준에 맞춘다. 여유가 없으면 claim도 ping도 보내지 않는다. 받을 수 없는 Mac이 '살아 있음'으로 보이면 사이트가 일감을 넣고 60초를 헛되이 기다린다.
- 모델은 첫 일감 때 올리고, 15분 동안 일이 없으면 내린다.
- 잠자기 끄기(omm `power.py` 관례). 꺼지면 사이트가 알아서 클라우드로 넘어간다.

**보안**
- 토큰은 macOS 키체인에 둔다. 로그·`bug-report`·`status` 출력에 토큰이 나오지 않게 한다. 로그에는 일감 id·걸린 시간·결과만 남긴다.
- 듣는 포트를 열지 않는다. pf 규칙·게이트웨이(52440)·exo API는 건드리지 않는다. 밖으로 나가는 HTTPS는 `SUPABASE_URL`과 `SITE_URL` 두 곳뿐이다.
- `omm cluster status`에 이 서비스의 상태(켜짐·마지막 일감·모델 올라감 여부)를 보여 주면 좋다(선택).

## 8. 빌더에게 맡기는 것

- 그리는 중 자리의 정확한 모양과 문구(하위 페이지 톤 규칙 안에서), 상태 문구.
- 표·함수의 세부 이름, 테스트 구성.
- Cloudinary REST 서명 구현 세부(기존 `cloudinary` SDK의 서명 함수를 써도 된다. 업로드만 Blob `fetch`로).
- 3초·30초·60초·180초 같은 시간 값은 위를 기본으로 하되, 실측해서 바꿔도 된다. 바꾸면 이 문서와 posters.md에 적는다.
