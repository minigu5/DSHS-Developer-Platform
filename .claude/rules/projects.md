---
paths:
  - "src/components/projects/**"
  - "src/app/**/projects/**"
  - "src/lib/projects/**"
  - "src/app/api/github-readme/**"
  - "src/app/api/github-license/**"
  - "src/lib/github-*.ts"
  - "src/lib/readme-sync*.ts"
  - "src/lib/use-unsaved-warning.ts"
  - "src/lib/confirm-name*.ts"
  - "src/components/shared/confirm-name-input.tsx"
  - "src/lib/profile/actions.ts"
  - "scripts/sync-readmes.mts"
  - ".github/workflows/sync-readmes.yml"
  - "src/lib/favicon*.ts"
  - "scripts/sync-favicons.mts"
  - ".github/workflows/sync-favicons.yml"
---

# 프로젝트 등록·수정·상세·카드·댓글·하트

> CLAUDE.md에서 옮겨 온 기능 문서(2026-11-02). 위 경로의 파일을 열면 자동으로 불러온다. 이 기능의 결정·변경 사항은 이 파일에 적는다.

### 프로젝트 등록 폼 UX (`src/components/projects/project-form.tsx`)
- **프로그램 종류 선택**: `<Select>` 드롭다운 대신 다른 항목들과 동일한 **카드 그리드 UI** (다중 선택, 최소 1개). 5개 항목, 2~3열 배치. 저장 시 `PROJECT_TYPES` 순서로 정렬.
- **플랫폼 자동 선택**: `types`에 `website`가 포함되면 `useEffect`로 모든 플랫폼을 자동 선택하고 카드를 비활성화(`pointer-events-none`). "웹사이트는 모든 플랫폼의 브라우저에서 열 수 있어서 전체 플랫폼이 자동으로 선택돼요." 안내 표시. 웹사이트를 빼면 잠금 해제. `app`이 포함되면 플랫폼 1개 이상 필수.
- 플랫폼 힌트 문구(웹사이트 제외)는 제거됨 — 사용자가 직접 선택.
- **아이콘 link 모드**: `ImageUploadInput` 컴포넌트 사용 — 파일 드래그·선택 업로드 + URL 직접 입력 폴백. 업로드된 이미지는 Cloudinary에 자동 저장.
- **아이콘 auto 모드 = 파비콘 자동 동기화**(2026-11-05 사용자 요청 — 사이트 파비콘이 바뀌어도 등록 때 주소가 그대로 남았음): `.github/workflows/sync-favicons.yml`이 **매일 03:15 KST**(UTC 18:15, 수동 `workflow_dispatch` + `dry_run`)에 `scripts/sync-favicons.mts`를 돌린다. 서비스 키로 `icon_type='auto'`·`url` 있는 프로젝트를 읽어 `resolveFavicon`(`src/lib/favicon.ts`, `/api/favicon`과 같은 로직)을 다시 돌리고 달라졌으면 `icon_url` 갱신(저장 조건에 `icon_type='auto'`도 걸어 그사이 직접 올리기로 바꾼 건 안 덮음). 판단 로직 `src/lib/favicon-sync.ts`(테스트 `favicon-sync.test.ts`): 못 찾으면 지우지 않고, **결과가 공개 favicon 서비스(Google s2·DuckDuckGo)인데 기존 직접 아이콘이 아직 열리면 유지**(Actions 러너 IP를 사이트가 막으면 공개 서비스로 떨어지므로). 실패 exit 1은 DB 저장 실패만. 비공개 프로젝트는 로그에 제목·주소 대신 id 앞부분. `favicon.ts`는 스크립트가 node로 바로 읽으려고 `./ssrf-guard.ts` 상대 import. 직접 올리기(`link`)는 건드리지 않는다. DB 변경 없음. 로컬 점검 `node scripts/sync-favicons.mts --dry-run`.
- **키보드 접근성**: 카드 그리드 UI(`div` 기반)에 `tabIndex={0}` · `role="button"` · `onKeyDown`(Enter/Space) · `focus-visible:ring-2` 적용. Tab 키로 모든 카드 포커스 이동, Enter/Space로 선택 가능. 웹사이트 타입 선택 시 비활성화된 플랫폼 카드는 `tabIndex={-1}`로 Tab 순서에서 제외.
- **상세 설명 마크다운 에디터**: `<Textarea>` 대신 작성 / 분할 / 미리보기 3탭 UI. Tab 키 두 칸 들여쓰기(Shift+Tab으로 해제) 지원. `Markdown` 컴포넌트로 실시간 미리보기.
- **저장 안 한 변경 이탈 경고**(2026-10-25 사용자 요청): 등록·수정 중 값이 처음과 달라지면(`formSnapshot`을 첫 렌더 값과 비교 — 배열은 정렬해 순서 차이 무시) `useUnsavedWarning`(`src/lib/use-unsaved-warning.ts`)이 켜진다. 새로고침·탭 닫기·바깥 사이트는 `beforeunload`(브라우저 기본 경고), 사이트 안 링크(헤더·로고 등 클라이언트 이동)는 `beforeunload`가 안 떠서 document 캡처 단계에서 `<a>` 클릭을 가로채 `window.confirm`. 뒤로 가기(popstate)는 막지 않는다. 저장·삭제 성공 뒤 `router.push` 직전에 `allowLeave()`로 경고를 끈다. 같은 틀을 다른 폼에 쓰려면 이 훅에 `dirty`만 넘기면 됨(가이드 위키 편집기는 자체 구현 유지). 한계: 팀원에 본인이 없는 팀 프로젝트는 열자마자 본인 자동 추가 이펙트가 값을 바꿔 경고가 켜질 수 있다(웹사이트 전체 플랫폼·비공개 소스 라이선스 비우기는 첫 값에서 처리하고, 비공개 팀의 팀원은 접근 허용 목록에 화면·저장 때만 합쳐서 경고를 켜지 않는다 — 2026-10-26).
- **GitHub README 가져오기**(2026-10-24): 상세 설명 편집 탭 줄 오른쪽의 작은 "GitHub README 가져오기" 버튼 하나 → 창(저장소 링크 입력 + "README와 자동 동기화" `ChoiceRow` + 가져오기 버튼, Enter도 동작). 2026-11-04 사용자 요청("GitHub 버튼이 너무 많아 난잡") — 예전엔 카드 맨 위에 링크 칸·버튼·동기화 칩·안내 2줄이 늘 보였다. `GET /api/github-readme?url=`(로그인 필요, 라우트 `src/app/api/github-readme/route.ts`)이 GitHub API `/repos/{o}/{r}/readme`를 부르고, 한도(403/429)·실패면 `raw.githubusercontent.com/.../HEAD/README.md` 계열로 대체. 호스트가 고정이고 owner/repo를 정규식으로 제한해서 SSRF 가드는 쓰지 않음. 변환·파싱 순수 로직은 `src/lib/github-readme.ts`(테스트 `github-readme.test.ts`): 상대 이미지·링크를 `raw.githubusercontent.com`/`github.com/.../blob/HEAD/` 절대 주소로, `Markdown` 컴포넌트가 raw HTML을 못 그리므로 `<img>`·`<a>`·`<h1~6>`·`<br>` 등을 마크다운으로 바꾸고 나머지 태그는 제거(코드 블록·인라인 코드 안은 그대로), 길이 제한 없이 전부 가져옴(2026-10-25 사용자 요청 — 예전엔 3만 자에서 자름). 이미 쓴 설명이 있으면 창 안에 rose 덮어쓰기 경고 한 줄(따로 묻는 창 없음). 오류도 창 안에, 성공하면 창이 닫힌다. 입력칸은 아래 "저장소 링크"와 같은 `repoUrl` 상태를 공유. 비공개 저장소·`.rst` 등 비마크다운 README는 오류 안내. 선택 환경변수 `GITHUB_TOKEN`(없어도 동작 — API 한도는 IP당 시간당 60회, 있으면 한도 완화).
  - **README 자동 동기화**(2026-10-24): 가져오기 창의 선택 행. **창을 열 때마다 켜진 채로 시작**(2026-10-25 사용자 요청 — 기본값 켜짐; 취소·실패면 그대로), 가져오기가 성공하면 소스코드가 `open`일 때 그 선택대로 켠다. 켜져 있으면 탭 줄 오른쪽이 버튼 대신 "README와 동기화 중 · 끄기"가 되고, 상세 설명 칸은 읽기 전용(다음 동기화가 덮어쓰므로) + 칸 아래 안내 한 줄. 소스코드가 `closed`면 선택 행이 잠기고 저장 시 `readme_sync=false`.
  - DB: `projects.readme_sync`(기본 false)·`readme_etag`·`readme_synced_at` + CHECK `projects_readme_sync_needs_repo`(동기화는 `source_type='open'` + `repo_url` 필수). `docs/20-supabase-projects-readme-sync.sql` — 운영에는 `supabase/migrations/20261024140000_projects_readme_sync.sql`로 `supabase db push` 적용 완료.
  - 실행: `.github/workflows/sync-readmes.yml`이 **매일 03:00 KST**(UTC 18:00 cron, 수동 `workflow_dispatch` + `dry_run` 입력)에 `scripts/sync-readmes.mts`를 돌린다. 서비스 롤 키로 `readme_sync=true` 프로젝트를 읽고 GitHub API를 `If-None-Match`(저장한 ETag)로 불러 304면 건너뜀, 바뀌었으면 `description`·`readme_etag`·`readme_synced_at` 갱신. 판단 로직은 `src/lib/readme-sync.ts`(테스트 `readme-sync.test.ts`, 네트워크는 주입). 빈 README로 설명을 지우지 않고, 실패가 하나라도 있으면 exit 1(Actions가 빨갛게 → 메일 알림), 호출 한도(403/429)면 그 자리에서 멈추고 다음 날 이어서. Actions 내장 `GITHUB_TOKEN`을 써서 한도 걱정 없음.
  - ⚠️ **GitHub 저장소 Secrets 필요**: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. 워크플로는 `schedule`·`workflow_dispatch`에서만 돈다(PR에서 안 돌아 키 노출 없음). 공개 저장소는 60일간 활동이 없으면 예약 실행이 자동 중지됨. **저장소가 PUBLIC이라 Actions 로그도 공개** — 스크립트는 비공개 프로젝트 제목을 찍지 않고 `비공개 프로젝트 <id 앞 8자>`로만 표시(새 로그를 추가할 때도 지킬 것).
  - 로컬 점검: `node scripts/sync-readmes.mts --dry-run`(`.env.local` 사용, DB 안 바꿈).
- **GitHub 라이선스 자동 채우기**(2026-10-25 사용자 요청 — 등록할 때 라이선스를 다시 확인하기 귀찮아서): "소스코드·라이선스" 카드의 저장소 링크 입력칸을 벗어날 때(또는 "README 가져오기" 성공 뒤) 소스코드가 `open`이면 `GET /api/github-license?url=`(로그인 필요, `src/app/api/github-license/route.ts`)이 `/repos/{o}/{r}/license`로 라이선스를 알아내고 `/licenses/{key}`의 `permissions`를 칩에 맞춘다. 순수 로직 `src/lib/github-license.ts`(테스트 `github-license.test.ts`): `commercial-use→commercial`·`modifications→modify`·`distribution→distribute`·`private-use→private` 4개만 켜고, **법적 책임·보증은 GitHub가 `limitations`로만 분류하므로 켜지 않는다**(상세 페이지에 "제한"으로 나옴). 라이선스 파일 없음(404)·`other`/`NOASSERTION`(예: 예외 조항 붙은 GPL)·한도(403/429)면 칩은 그대로 두고 칩 아래에 "직접 골라 주세요" 안내(rose). 성공하면 "MIT License: GitHub 정보로 채웠어요…" 한 줄. **덮어쓰기 규칙**: 폼의 `licenseOriginRef`가 `user`(수정 화면에서 값이 이미 있거나 칩·기타를 직접 건드림)면 가져오지 않고, `auto`(우리가 채운 값)면 다른 저장소로 바뀔 때 다시 채운다. 같은 저장소는 한 번만(`licenseRepoRef`, 수정 화면은 원래 저장소를 미리 넣어 둠), 한도·서버 오류는 재시도 가능. DB 변경 없음 — 칩 값(`license_features`)만 저장하고 라이선스 이름(MIT 등)은 저장·표시하지 않는다. `GITHUB_TOKEN`이 있으면 README 가져오기와 같이 한도가 완화됨(요청 한 번에 GitHub API 2번 호출).
- **등록 직후 도메인 마련하기 권유**(2026-10-26 사용자 요청): 새 등록(수정 아님)이 성공했고 종류에 웹사이트가 있으며 방문 주소가 `detectHost()`로 잡히는 호스트 무료 주소(.vercel.app·.netlify.app·.pages.dev·.github.io·.gitlab.io·.onrender.com·.up.railway.app + 바로가기 호스트 .workers.dev·.web.app·.firebaseapp.com — `HOST_PRESETS`에 있는 9개)면, 프로젝트 페이지로 가기 전에 `Dialog` "등록했어요! 짧은 주소도 받을까요?"가 뜬다. "도메인 마련하기"(teal) → `/domains?project=<id>`, "나중에"·Esc → 원래대로 `/projects/<id>`(창을 닫아도 폼에 남지 않음 — 이미 저장돼서 다시 누르면 중복 등록). 비공개로 등록했거나 살아 있는 주소가 이미 3개면(브라우저 클라이언트로 `subdomains` count, RLS 본인 SELECT) 묻지 않는다. 프리셋에 없는 호스트(Surge 등)는 묻지 않음 — 2026-10-26 바로가기 주소로 workers.dev·Firebase가 `HOST_PRESETS`에 들어가 자동 포함됐다.
  - **다시 알리기·미리보기 주소 경고**(2026-11-03 사용자 요청 — 공개 12개 중 `.web.app` 2개가 권유 창을 보고도 안 받음, 링크가 길어 탐색 목록이 지저분): 순수 로직 `src/lib/domains/offer.ts`(테스트 `offer.test.ts`) — `domainOfferOf`(프리셋 무료 주소만), `suggestNameFrom`(주소 첫 조각에서 `--`·`-git-` 뒤와 끝의 숫자·해시 조각을 떼 예시 이름, GitHub/GitLab Pages는 저장소 이름, 빈 이름인지는 안 봄), `previewAddressOf`(Firebase `사이트--채널.web.app`·Pages `abc.이름.pages.dev`만 — Vercel·Workers 미리보기는 모양으로 못 가림), `quickToConnect`(바로가기 호스트면 "2분이면 끝나요").
    - 등록 직후 창: "지금 / 받으면" 전후 비교 상자(`예시이름.dshs.dev`, 예시가 없으면 `이름.dshs.dev`) + 소요 안내.
    - 등록·수정 폼 주소 칸: 미리보기 주소면 rose 경고 + "원래 주소로 바꾸기"(막지는 않음). 수정 화면에서 소유자(`canDelete`)·공개 웹사이트·주소 없음이면 한 줄 "짧은 주소도 받을 수 있어요 (예: …) 도메인 마련하기"(`/domains?project=<id>`).
    - 상세 페이지(머리 아래·수치 띠 위, **소유자만** — `public_author_id` 또는 익명이면 `my_project_ids`, 개발자 계정·팀원 제외): 미리보기 주소면 rose 카드 "며칠 뒤 사라지는 미리보기 주소예요" + "주소 고치기", 아니면 공개 웹사이트·이 프로젝트에 살아 있는 주소 없음·내 주소 3개 미만일 때 `DomainNudge`(`src/components/projects/domain-nudge.tsx`, 이어서 보기 카드 모양: 안내 줄 + 제목 + 전후 주소 + teal 버튼 하나 + ×). ×는 `localStorage['domain-nudge-dismissed:<id>']`로 그 프로젝트만 다시 안 띄움(서버 스냅샷은 숨김 — 닫은 사람에게 깜빡이지 않게). DB 변경 없음(`subdomains` 본인 SELECT, 소유자일 때만 조회 1번).
  - **설명 속 옛 주소 바꾸기**(2026-11-05 사용자 요청 — 도메인을 연결해 놓고 설명은 README 그대로라 "접속 주소: https://labflow-hackathon-1025.web.app"처럼 옛 주소가 남은 프로젝트가 많음): 상세 페이지(같은 자리, **소유자만**)에서 이 프로젝트에 연결된(active) 주소가 있고 설명에 옛 사이트 주소가 있으면 `OldAddressNudge`(`src/components/projects/old-address-nudge.tsx`) "설명에 옛 주소가 남아 있어요. 바꾸시겠어요?" — 바뀌는 줄 최대 3개(지금 → 바꾸면) + teal "새 주소로 바꾸기" + ×(`localStorage['old-address-nudge-dismissed:<id>:<주소>']`). README 동기화 중이면 "GitHub README도 고쳐야 해요" 한 줄. 옛 주소 후보는 `subdomains`의 `site_url`·`previous_url`(+바로가기면 `target`), 찾기·바꾸기 순수 로직 `src/lib/domains/old-address.ts`(테스트 있음 — 경로·해시는 유지, `x.옛주소`·`옛주소2`·`옛주소.evil.com`은 안 건드림, 스킴 없이 적은 주소는 스킴 없이). 서버 액션 `replaceOldAddressesInDescription`(`src/lib/projects/actions.ts`)이 소유자 확인 뒤 다시 찾아서 사용자 권한으로 저장. DB 변경 없음. 주소를 반납·회수하면 DB가 설명 속 새 주소를 옛 주소로 되돌린다(`.claude/rules/domains.md` 「DB」).
    - **수정 폼에서도**(2026-11-05 사용자 요청): 수정 페이지가 소유자(개발자 계정 포함)이고 연결된 주소가 있으면 `oldAddress`(`{ name, prefixes }`)를 `ProjectForm`에 넘기고, 폼이 쓰는 대로 `fixOldAddresses`로 다시 찾아 상세 설명 칸 아래에 teal 상자 "설명에 옛 주소가 남아 있어요. ….dshs.dev로 바꿀까요?"(바뀌는 줄 최대 3개 + "새 주소로 바꾸기"·"괜찮아요"). 바꾸기는 **폼의 설명만 바꾸고 저장은 사용자가**("저장하면 반영돼요" 한 줄), "괜찮아요"는 이 화면에서만 다시 안 묻는다(localStorage 안 씀). README 동기화 중이면 README도 고치라는 한 줄.
- **프로필에 GitHub 추가 권유**(2026-10-26 사용자 요청): 새 등록(수정 아님)·작성자 형태 `individual`·소스코드 `open`이고 내 프로필 연락처(`users.contacts`)에 GitHub가 없을 때, 저장소 링크 칸을 벗어나거나 "README 가져오기"가 성공하면 저장소 링크 칸 바로 아래에 "프로필에도 GitHub를 추가할까요?"(`github.com/<owner>`) 상자가 뜬다. "추가하기"는 서버 액션 `addGithubToProfile(repoUrl)`(`src/lib/profile/actions.ts`, `(nav)` 밖)이 `parseGithubRepo`로 owner를 뽑아 `{ type: 'github', value: owner }`를 연락처 끝에 더한다 — 폼에서 이동하지 않고 그 자리에서 "프로필에 GitHub를 추가했어요" 한 줄로 바뀐다(사용자 결정). 같은 아이디가 이미 있으면 그대로 성공, 연락처 8개(`updateProfile`과 같은 한도)면 거절. "괜찮아요"는 이 화면에서 다시 안 묻는다. 저장소 owner가 조직이어도 그대로 물어본다(사용자가 고름). 팀으로 바꾸면 상자가 사라진다. DB 변경 없음(RLS 본인 UPDATE).
- **중복 등록 막기**(2026-11-05, Jakal Office가 10초 안에 6번 등록됨): 원인은 저장 성공 뒤 `finally`가 버튼을 다시 켜서 페이지 이동(1~2초)을 기다리는 동안 누를 때마다 또 저장된 것. 이제 `saveProject`는 성공하면 이동할 때까지 잠긴 채(`isLoading` 유지), 실패할 때만 풀고, 빠른 연속 클릭은 `savingRef`로 막는다. DB도 트리거 `projects_guard_duplicate`(migration `20261105100000`, SECURITY DEFINER + 작성자 단위 advisory lock)가 **같은 작성자·같은 이름(앞뒤 공백·대소문자 무시)을 10분 안에 또 INSERT하면** `projects_duplicate_recent`(23505)로 거절 — 서비스 키 포함 모든 경로. 폼은 이 오류를 "방금 같은 이름으로 등록한 프로젝트가 있어요…"로 바꿔 보여 준다. 이름을 바꿔 가며 올리는 도배는 못 막음(관리자 대시보드 설계: `docs/superpowers/specs/2026-11-05-admin-dashboard-design.md`).
- **팀 프로젝트 팀원 관리**:
  - 이메일 입력 시 `@ts.hs.kr` 도메인 확인 후 `users` 테이블에서 **실제 가입 여부를 검증** (미가입이면 "가입되지 않은 사용자입니다." 에러).
  - `authorRole === 'team'` 전환 시 `useEffect`로 현재 로그인 사용자를 자동 추가. 자신은 X 버튼이 없어 삭제 불가.
  - 편집 모드 진입 시 기존 `team_members` 이메일로 프로필을 일괄 로드.
  - 팀원 목록 표시: 이메일 pill → **아바타 + 닉네임/실명 + 이메일 세로 카드** 형태.

### 프로젝트 상세 (`src/app/(nav)/projects/[id]/(detail)/page.tsx`)
- **머리(2026-10-24)**: "← 모든 프로젝트" → 아이콘 **스티커 112px**(모바일 72px, `ring-[3px]` + 그림자) + 종류 배지·태그 → h1(Plex) → 한 줄 설명 → 작성자 줄("· 개인/팀 프로젝트 · 등록일") → 알약 버튼(방문 blue / GitHub 보조 / 하트 `HeartButton` h-11 / 수정 ghost).
- **"← 모든 프로젝트" = 뒤로 가기**(2026-11-05 사용자 요청 — 누르면 탐색 맨 위로 가서 보던 자리를 잃었다): `BackToExplore`(`src/components/projects/back-to-explore.tsx`). 탐색에서 프로젝트 링크를 누르면 `ExploreClient`가 `markLeavingExplore`로 목적지를 sessionStorage에 적고, 상세에 도착하면 그 기록 칸 `history.state`에 `__dshsFromExplore` 표시(`src/lib/explore-return.ts`). 표시가 있으면 `router.back()`(스크롤·필터 그대로), 없으면(홈·프로필·주소 직접 입력·새 탭) 평범하게 `/explore`. 표시는 기록 칸마다라 다른 데 갔다가 브라우저로 돌아와도 맞다. Next가 `router.refresh()` 때 기록 칸을 다시 쓰며 지울 수 있어 컴포넌트 ref에도 들고 있는다.
- **수치 띠** `StatStrip`(`src/components/projects/stat-strip.tsx`): 하트(수 + "댓글 N개", 0이면 "아직 아무도 안 눌렀어요") · 방문(`url` 없으면 칸 생략 → 3칸) · 플랫폼(웹사이트+전체면 "Web / 모든 브라우저") · 소스코드("허용 N개"). 모바일 2열.
- **본문**: `ReadingSurface`(마크다운) + 사이드 카드 3개 — 개발자(또는 팀+팀원), 라이선스(허용/제한), 정보(종류·플랫폼·공개 여부·등록일·최근 수정). 옛 "환경 및 플랫폼" 카드는 정보 카드로 합쳐짐.
- **댓글**: 카드 바깥 제목 "댓글 N"(Plex) → 댓글마다 카드(오래된 것 위) → 맨 아래 작성 폼 카드(버튼 "댓글 남기기", 로그인하면 항상 보임).

### 프로젝트 상세 팀 정보
- `author_role === 'team'`이면 `team_members` 이메일 배열로 `users` 테이블을 `.in('email', ...)` 쿼리해 프로필 일괄 조회.
- 팀원 표시: 이메일 chip → **아바타 + 닉네임 세로 목록**. 각 항목은 `/developers/[id]` 로 링크됨.
- `EditButton`에 `teamMembers` prop 전달 — 팀원에게도 "수정하기" 버튼 노출.
- **상세 설명 렌더링**: `project.description`을 `Markdown` 컴포넌트로 렌더링 (기존 `split('\\n')` 방식 대체).

### 프로젝트 카드 UI (`src/components/projects/project-card.tsx`)
- **플랫폼 표시**: 작은 둥근 칩 형태(`rounded-full bg-zinc-100`). `PLATFORMS` 상수에서 value → label 변환 후 전체 표시.
- **종류 배지**: `projectTypeLabels(types, true)`(`src/lib/constants.ts`, 짧은 이름)로 종류마다 배지 하나씩. 카드·홈 카드·상세 머리·정보 카드 공통.
- **웹사이트 + 전체 플랫폼**: `types`에 `website`가 있고 모든 플랫폼이 선택된 경우 카드에서는 "Web" 하나만 표시 (DB 실제 값은 유지).
- **아이콘**: `mt-[5px]`로 텍스트 영역보다 5px 아래에 위치.
- **아이콘 바탕·움직임**(2026-11-02 사용자 요청, `ProjectIcon`): 이미지 아이콘 바탕은 다크 모드에서도 `bg-white`(투명 배경 검은 그림이 어두운 카드에서 안 보였음). 움직이는 이미지(`.gif`·`.webp`·`.apng`)는 첫 장면만 — Cloudinary 주소는 `pg_1` 변환을 끼우고(받는 크기도 줄어듦), 바깥 주소는 숨긴 `<img>`로 받아 `<canvas>`에 첫 장면을 그린다. 업로드는 막지 않는다.
- **하트·댓글 수**(2026-11-05, 별점 삭제): 카드 오른쪽 위 `absolute top-4 right-4 z-20`(덮개 링크 z-10 위, 헤더는 `pr-16`)에 하트. `heart` prop이 있으면 `HeartButton`(`src/components/projects/heart-button.tsx`, rose 알약 — 제어 모드 `onToggle`+`count`는 탐색, 없으면 스스로 저장), 없으면 숫자만(0이면 숨김). 숫자는 쿼리의 `project_hearts(count)`(`heartCountOf`, `src/lib/hearts.ts`). 플랫폼 칩 옆엔 댓글 수(`project_comments(count)`, `MessageSquare`)만. 저장은 `setHeart`(`src/lib/hearts-client.ts`, 23505는 성공).

### 팀 프로젝트 수정 권한
- **팀원도 프로젝트 수정 가능**: `team_members` 배열에 이메일이 있는 사용자는 수정 페이지 접근·저장 가능.
- **되돌리기 어려운 작업은 프로젝트 이름 입력**(2026-10-27 사용자 요청): 프로젝트 삭제·비공개 전환으로 주소 반납·"주소 닫기"(수정 폼)와 `/domains`의 "이 주소 반납하기" 확인 창에 `ConfirmNameInput`(`src/components/shared/confirm-name-input.tsx`) — 저장된 프로젝트 이름을 똑같이 적어야(앞뒤 공백만 무시, `nameMatches` `src/lib/confirm-name.ts`) 버튼이 켜진다. `deleteProject(id, confirmTitle)`은 서버에서도 이름을 다시 확인, 반납·주소 닫기는 화면에서만 막는다.
- **삭제는 소유자(author)·개발자 계정만 가능**: `edit/page.tsx`에서 `isAuthor` 여부를 계산해 `ProjectForm`에 `canDelete` prop으로 전달. 팀원(`canDelete=false`)에게는 "위험 구역" 섹션 미노출.
- RLS(`projects_update_own`)가 `author_id = uid OR email = ANY(team_members)` 조건으로 DB 레벨에서도 팀원 UPDATE를 허용.

### 댓글·하트 (2026-11-05 — 별점 때문에 리뷰를 잘 안 써서 별점 삭제, 리뷰→댓글)
- 설계 `docs/superpowers/specs/2026-11-04-hearts-comments-design.md`. DB `project_comments`(옛 `reviews`, `rating` 없음, 1인 여러 개)·`project_hearts`(PK project_id+user_id) — migration `20261105110000_comments_hearts.sql`(+ `20261105140000` 정리).
- **댓글** `project-comments.tsx`(작성·수정 Dialog·삭제 확인 Dialog) + `comment-list.tsx` + `comment-form.tsx`(500자 — DB CHECK도 같음, 볼 수 없는 프로젝트엔 INSERT 정책이 막음). 작성자 표시는 `commentAuthorView`(`src/lib/comments.ts`): **익명 프로젝트 소유자의 댓글은 `익명 · 만든 사람`**(이름·사진·링크 없음 — DB 트리거가 `public_user_id`를 NULL로, `user_id`는 사용자 키로 못 읽음), 그 밖의 소유자 댓글은 이름 옆 "만든 사람" 배지(`is_author`, 팀원은 아님). 수정·삭제 메뉴는 `isMyComment(c, viewerId, isOwner)` — 최종 권한은 RLS. 조회는 `users!project_comments_public_user_id_fkey(...)`로 사람을 붙이고 `user_id`를 고르지 않는다. **댓글 수는 `project_comments(id)`를 받아 `.length`** — `project_comments(count)` 집계·`select=*`는 행 전체를 읽어 칸 단위 GRANT에서 42501(2026-11-05 배포 직후 탐색·홈·프로필이 빈 목록이 됐음, `20261105150000`).
- **하트**: 1인 1번, 누가 눌렀는지 공개(프로필 즐겨찾기). 만든 사람이 자기 익명 프로젝트에 누른 하트는 남에게 안 보임(`by_anonymous_owner`, 트리거) — 그래서 남이 보는 수가 1 적을 수 있다. 프로젝트별 누른 사람 명단은 관리자만(`LikersCard`, `.claude/rules/admin.md`). 볼 수 없는 프로젝트엔 못 누른다(INSERT 정책). 비공개로 바뀌면 하트는 남고 RLS가 숨김.
