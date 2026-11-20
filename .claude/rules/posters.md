---
paths:
  - "src/lib/posters/**"
  - "src/components/posters/**"
  - "src/app/(nav)/projects/[[]id]/poster/**"
  - "src/app/api/posters/**"
  - "supabase/migrations/*poster*"
---

# 홍보 포스터 (올리기·걸기·띠 받기)

**AI 포스터 만들기는 2026-11-20 없앴다**(사용자 결정 — Gemini·Workers AI·학교 Mac·Cloudflare Queues·Browser Rendering를 다 걷어냄. 학생도 쓸 수 있었다). 옛 설계 문서(`docs/superpowers/specs|plans/*poster*`)는 기록으로만 남겼고 코드는 없다. 자리·걸기·홍보 설계: `docs/superpowers/specs/2026-11-07-poster-placement-promo-design.md`.

## 남은 기능
- **상세 옆칸 맨 위에 걸린 포스터 1장**(`PosterShowcase`, 공개 프로젝트만 — `showcaseVisible`). 마우스를 올려도 안 커진다(hover 확대 금지 — 사용자 결정), 누르면 `Dialog`로 크게(창은 `right-0 left-0 mx-auto w-fit`). 남의 상세에선 크게 보기 창 아래 "이 포스터, 내 프로젝트로도 올릴 수 있어요 →" → `/posters/start`(보호 라우트): 내가 고칠 수 있는 공개 프로젝트 0개면 `/projects/new`, 1개면 그 수정 화면의 포스터 칸(`?poster=list`), 여럿이면 고르기(`posterStartTarget`).
- **올리기** `POST /api/posters/upload`(multipart `projectId`·`file`·`hang`): `isSameOrigin` → `content-length` 10MB+64KB 넘으면 413 → `getBandAccess` → 파일 10MB → 앞 12바이트 `sniffImageType`(PNG·JPEG·WebP, `upload.ts`) → 하루 몫 `reserveUsage('upload')`(`src/lib/upload-usage.ts`) → Blob 그대로 Cloudinary `dshs/posters`(`uploadPosterImage`) → 행(`kind='upload'`) → `hang=1`이면 걸기. 409 `poster_limit`(프로젝트당 5개, 방금 올린 그림은 지움). 걸기만 실패하면 `{ ok: true, hung: false }`. 올린 그림은 **바로 걸리고 관리자가 나중에 검토**(`/admin` 「걸린 포스터」).
- **걸기·내리기** `hangPoster`/`unhangPoster`(`hang.ts`, 권한 `getBandAccess` = 소유자·팀원·관리자·공개·차단 아님). 걸린 포스터 = `projects.poster_id`(FK SET NULL)·`poster_image_url`·`poster_is_ai`(이제 늘 false)·`poster_hung_at`. anon/authenticated는 `poster_image_url`·`poster_is_ai`만 읽힘(`PROJECT_COLUMNS`), 사용자 키로는 네 칸 다 못 바꿈(`projects_guard_owner`). `poster_id`가 비면 트리거 `projects_poster_clear`가 나머지를 비운다. 쓰기는 `setHungPoster`(`hang-db.ts`, 서비스 키).
- **지우기** `deletePoster`(`actions.ts`) — 올린 그림을 Cloudinary에서도 지운다. 프로젝트 삭제·탈퇴·관리자 지우기는 `posterImageUrlsOf`(`cleanup.ts`)로 CASCADE 전에 주소를 챙겨 지운다.
- **띠 받기**(`PosterBandDownload`, 수정할 수 있는 사람 누구나) — PNG를 **브라우저 캔버스**로 그린다(`band-canvas.ts`, 2480×472). 모양은 `dshs-band.css` 좌표를 그대로 옮김, 글꼴은 사이트의 `IBM Plex Sans KR Subset`·`Geist Mono`, 긴 이름은 `bandHint` 16자에서 자름. 띠 CSS(`band.ts`의 `POSTER_BAND_CSS`)를 바꾸면 캔버스 좌표도 같이. 원본 CSS `docs/superpowers/specs/2026-11-05-ai-poster/dshs-band.css`.

## 칸(PosterSheet)
- **프로젝트 수정 화면 옆 칸**(`PosterSheet`, 공개 프로젝트만). 상태는 주소 `?poster=list` 하나(`poster-sheet-nav.ts`) — `history.pushState`라 서버를 다시 부르지 않아 폼에 쓰던 내용이 그대로고, 휴대폰 뒤로 가기가 칸을 닫는다. 칸을 닫으면 목록에서 뭔가 바꿨을 때만 `router.refresh()`로 폼 카드의 걸린 포스터를 새로 읽는다. 데이터는 서버 액션 `getPosterList`(`panel.ts`). 칸 맨 위 "포스터는 누르는 즉시 저장돼요. 프로젝트의 “저장하기”와 따로예요."
- **상세에서도 같은 칸**: 걸린 포스터가 없으면 옆칸에 점선 **빈 포스터 칸** `PosterSlot`(주인·팀원만, 공개만 — `posterSlotVisible`, 관리자 계정은 남의 프로젝트마다 뜨면 거슬려서 뺐다). 누르면 같은 `PosterSheet`가 상세 위에서 열린다(`inForm={false}`: 열 때 목록을 받음). **빠른 상세**(목록에서 누른 겹침 화면)는 칸을 두지 않고 `/projects/<id>?poster=list` 서버 상세로 넘긴다.
- 목록은 끌어다 놓기 올리기(`useFileDrop`, 개수가 다 찼어도 놓기는 받아 알림 — 안 받으면 브라우저가 그림을 열어 폼 내용이 날아감). 옛 주소 `/projects/[id]/poster`는 `?poster=list`를 단 수정 화면으로 넘기는 페이지만 남았다.
- 닫기 애니메이션: 배경·칸 둘 다 `duration-200` + `data-closed:fill-mode-forwards`(길이가 다르면 먼저 끝난 배경이 투명도 1로 튀어 화면이 한 번 번쩍임).
- 탭 분할은 쓰지 않는다(사용자 "최악"). 포스터 화면·`/posters/*`에선 메뉴 "프로젝트 등록"이 켜짐(`src/lib/nav-active.ts`).

## DB 정리 상태 (2026-11-20)
- 운영 DB의 AI 포스터 11개: 걸린 2개는 `kind='upload'`·`image_url=걸린 PNG`로 바꿔 그대로 보이게 했고, 안 걸린 9개는 지웠다(Cloudinary 그림 10개도 삭제). 남은 포스터는 전부 올린 그림이다.
- `project_posters`에 AI 칸(`html`·`art_url`·`art_order`·`versions`·`messages`·`ai_job_id`·`art_job_id`·`band_*`)과 표 `poster_ai_jobs`·`poster_art_jobs`·`poster_art_workers`·Mac 일감 RPC는 **코드가 안 쓰는 채로 남아 있다** — 삭제 migration은 코드 배포가 끝난 뒤 따로 푸시(코드가 먼저 가야 한다). `ai_usage`·`reserve_ai_usage`·`release_ai_usage`는 이미지 올리기 하루 몫(`upload`)이 쓰니 **지우지 말 것**.
- 정리가 끝나면 `types.generated.ts`를 다시 만들 것.
