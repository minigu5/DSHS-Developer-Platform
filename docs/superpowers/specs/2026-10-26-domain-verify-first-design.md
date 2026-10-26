# 도메인 마련하기 — 확인 먼저, 연결은 그다음 (2026-10-26)

## 왜

사용자가 직접 테스트하다가 3단계(연결 확인)를 하지 않았는데도 `<이름>.dshs.dev`가 그대로 열리는 걸 발견했다.
"인증을 안 하고 쓰고 있었다"는 걸 최근에야 알았다. 지금은 2단계에서 CNAME이 바로 만들어지고, 레코드가
DNS only라 요청이 우리 쪽을 지나가지 않는다. 그래서 확인 전이어도 주소가 열리고, 헤더를 넣거나 경고 페이지를
띄울 수도 없다. 7일 동안 확인이 안 되면 매일 점검이 주소를 반납하는데, 학생은 그 사실을 모르고 쓰다가
갑자기 주소가 끊긴다.

사용자 요청: **확인되기 전에는 주소가 정상으로 열리지 않게** 한다. 헤더를 넣거나 "3단계를 마쳐 주세요" 경고
페이지를 띄운다. 헤더는 구조상 불가능해서(DNS only), 경고 페이지 쪽으로 간다. 사용자는 아래 방향을 보고
"의도가 반영된 것 같다"고 승인했다.

## 목표

- 소유 확인이 끝나기 전에는 `<이름>.dshs.dev`에 들어가면 `dshs.dev`의 경고 페이지가 뜬다.
- 확인이 끝난 다음에야 진짜 연결(CNAME·TXT, 바로가기는 302)을 만든다.
- 학생이 하는 일의 양은 지금과 거의 같다. 순서만 바뀐다.

## 하지 않는 것

- 연결 뒤에 토큰이 사라진 경우(끊김)에 경고 페이지를 띄우지 않는다. 그때는 이미 CNAME이 학생 호스트를
  가리키고 있어서 가로챌 수 없다. 지금처럼 "끊김 → 7일 뒤 반납"으로 둔다.
- 우리 Worker로 학생 사이트를 대신 받아오는 프록시는 만들지 않는다. Workers 무료 한도는 계정 전체가
  공유하므로, 넘치면 `dshs.dev`도 멈춘다(바로가기 설계와 같은 이유).
- CNAME을 proxied(주황 구름)로 켜서 가로채는 방법도 쓰지 않는다. 학생 호스트가 인증서를 못 받고,
  다른 계정 Cloudflare Pages는 1014 오류가 난다.

## 실패로 보는 것

- 확인을 마친 학생의 주소가 이전보다 연결하기 어려워지는 것. 예: GitHub Pages·Netlify에서 확인 단계가 꼬여서
  막히는 경우.
- 경고 페이지가 남의 프로젝트 정보(비공개 여부, 제목 등)를 드러내는 것.

## 새 흐름

```
① 이름 정하기          예약 + 경고 페이지 바로가기(자리표시) 생성
② 내 사이트에 코드 넣기  "내 사이트 원래 주소"(예: omm.vercel.app)에서 토큰 확인
③ 호스트에 연결          자리표시를 지우고 CNAME·TXT(또는 바로가기 302) 생성 → 실제 주소 자동 확인
```

### ① 이름 정하기

- `reserveSubdomain`이 지금처럼 예약한다. 그 직후 **자리표시**를 만든다.
  - proxied AAAA `100::` 1개(바로가기와 같은 방식)
  - Bulk Redirect 목록 항목: `<이름>.dshs.dev/` → `https://dshs.dev/pending-domain/<이름>`, 302,
    **경로·쿼리를 붙이지 않음**(`preserve_path_suffix:false`, `preserve_query_string:false`,
    `subpath_matching:true`). 어떤 경로로 들어와도 같은 경고 페이지로 간다.
  - 만든 id는 지금처럼 `cf_record_ids`에 넣는다(목록 항목은 `redirect:` 접두어). 그래서 반납·회수·탈퇴·
    프로젝트 삭제·매일 점검의 정리 로직(`removeCloudflare`, `strayIds`)이 그대로 지운다.
- 자리표시 만들기는 **최선 노력**이다. 실패하거나 목록 환경변수가 없어도 예약은 성공으로 두고 로그만 남긴다.
  자리표시가 없으면 확인 전 주소는 DNS부터 안 풀린다. 이것도 "정상으로 열리지 않음"이라 목표는 지켜진다.
- 기록은 새 DB 함수 `subdomain_set_placeholder_records(p_id, p_record_ids)`(service_role 전용)로 한다.
  `status='reserved'`이고 `cf_record_ids`가 비어 있을 때만 기록하고, 아니면 `records_exist`.

### ② 내 사이트에 코드 넣기 (소유 확인)

- 입력: **"내 사이트 원래 주소"** 한 칸. 프로젝트 방문 주소가 프리셋의 `detect`에 맞으면 미리 채운다.
  이 주소로 호스트도 정해진다(`detectHost`). 학생이 호스트 카드를 따로 고르지 않는다.
  - 허용: https, 9개 프리셋 중 하나의 기본 주소, 경로는 GitHub/GitLab Pages 프로젝트 사이트를
    위해 허용(`user.github.io/repo/`). 쿼리·해시는 버린다.
  - **②와 ③이 같은 판정을 쓴다**(새 함수 `siteAddressFor(url)` → `{ host, hostname, url } | null`, `hosts.ts`).
    `detect`만으로는 접미어만 보므로 부족하다. 바로가기 호스트와 `prefillFromUrl` 호스트는 호스트 이름이
    그 프리셋의 `cnameTarget`도 통과해야 한다. 그래서 Firebase `a--b.web.app`, `x.y.pages.dev` 미리보기는 ②에서부터
    거절된다. Vercel·Railway는 `^[a-z0-9-]+\.vercel\.app$` / `^[a-z0-9-]+\.up\.railway\.app$` 모양만 본다.
    (빌더 판단: ②에서 통과한 주소가 ③에서 막히면 실패 조건 1에 걸리므로.)
  - 프리셋에 없는 주소, `*.dshs.dev`, 사용자 도메인은 거절한다. 문구: "호스트의 기본 주소(예: 이름.vercel.app)를 넣어요".
- "AI에게 보낼 글 복사"(`buildVerifyPrompt`)는 지금 3단계에 있는 것을 ②로 옮긴다. **첫 문장을 바꾼다**
  (지금은 "○○.dshs.dev 로 변경했어"인데, 아직 변경 전이므로):
  > 내 웹사이트(https://<원래 주소>)에 https://dshs.dev 서비스로 <이름>.dshs.dev 주소를 붙이려고 해.
  > 먼저 이 사이트가 내 것이라는 걸 확인하는 코드를 넣고 다시 배포해 줘.

  나머지(meta 한 줄, "서버가 처음부터 내려주는 HTML", 구조별 자리, 푸시·재배포)는 그대로 둔다. 마지막 확인
  주소는 `https://<원래 주소>`로 바꾼다. 바로가기 호스트용 문구(`buildRedirectPrompt`)는 이미 이 모양이라 첫 문장만
  맞춘다. **이 문구는 2026-10-25에 사용자가 확정한 것이라, 바뀐 문장을 사용자에게 보여 주고 확인받는다.**
- "지금 확인하기" + 자동 확인(`useDomainChecks`, 20초마다·최대 10분)은 ②에서도 그대로 돈다. 확인 대상은
  원래 주소다.
- 판정은 `checkSite`를 쓴다. 지금은 `fqdn` 루트만 받으므로 **기준 URL**(경로 포함)을 받게 넓힌다.
  meta는 그 URL에서 찾고, `/.well-known/dshs-verify.txt`는 그 URL의 경로 아래(`<base>/.well-known/…`)와
  호스트 루트를 차례로 본다. 같은 호스트 안에서만 리다이렉트를 따라가는 규칙, 256KB·10초 제한은 그대로 둔다.
  SSRF 가드(`assertSafePublicUrl`)도 그대로 거친다.
- 확인되면 새 DB 함수 `subdomain_verify_site(p_user, p_id, p_site_url, p_site_host)`(service_role 전용,
  소유자 재확인)가 `site_url`·`site_host`·`site_verified_at`을 기록한다. 상태는 `reserved` 그대로다.
- 원래 주소를 다른 것으로 바꾸면 다시 확인해야 한다(기록이 그 주소에 묶여 있음).
- **이미 연결된 주소의 호스트를 바꿀 때**(지금의 "호스트를 바꿨다면 다시 연결하기"): ②로 새 원래 주소를 확인한다.
  이 확인은 DNS를 건드리지 않는다. 지금 연결은 ③에서 새로 연결할 때까지 그대로 살아 있다. `site_*` 세 칸은 새 확인이
  **성공했을 때만** 덮어쓴다. (빌더 판단)

### ③ 호스트에 연결

- `site_verified_at`이 없으면 연결할 수 없다. 서버 액션도 막고, **DB 함수 `subdomain_connect`도 막는다**
  (`not_verified`). `p_host`는 `site_host`와 같아야 한다(`host_mismatch`).
- **연결 대상도 확인한 사이트에 묶는다**(빌더 판단, "매우 엄격하게" 원칙). 바로가기 호스트와 `prefillFromUrl`
  호스트(Netlify·Cloudflare Pages·GitHub Pages·GitLab Pages·Render)는 `target`이 확인한 원래 주소의 호스트 이름과
  같아야 한다(`target_mismatch`, 앱과 DB 둘 다). Vercel·Railway는 CNAME 값이 호스트가 따로 주는 값이라 묶을 수 없다.
  이 두 호스트는 연결 뒤 실제 주소에서 하는 토큰 확인이 지금처럼 최종 판정이다. 확인을 마친 학생이 일부러 남의
  Vercel 프로젝트에 붙이는 경우는 `pending`인 동안 열린다. 이건 남는 틈으로 받아들인다.
- CNAME 호스트: 지금 2단계(`HostPicker`의 안내·CNAME·TXT 칸)를 그대로 쓴다. 호스트는 ②에서 정해졌으므로
  카드 선택은 보여 주기만 하거나 숨긴다. `prefillFromUrl` 호스트는 CNAME 값을 원래 주소의 호스트 이름으로
  미리 채운다(GitHub Pages는 `user.github.io`).
- 바로가기 호스트(Workers·Firebase): 보낼 곳 = 원래 주소의 호스트 이름. 따로 입력받지 않는다. "바로가기 만들기"를
  누르면 **그 자리에서 바로 켠다**. 이미 확인됐으므로 "처음 확인될 때 켜기"(`needsActivation`·`activateRedirect`를
  `verifySubdomain`과 매일 점검에서 부르는 부분)는 없어진다.
- 순서: 자리표시를 포함한 옛 레코드를 지운다(`removeCloudflare(row.cf_record_ids)`, 지금도 재연결 때 하는 일)
  → 새 레코드를 만든다 → DB에 기록한다 → DB가 실패하면 방금 만든 것을 지운다(`runConnect`). 바로가기의 AAAA는
  자리표시와 내용이 같지만, 지우고 다시 만든다. 같은 AAAA는 81058로 거절되므로 지우기가 먼저다.
  - 레코드를 지운 뒤 새로 만들기가 실패하면 주소가 비어 있게 된다. 이때는 오류를 보여 주고 다시 누르면 된다.
    자리표시는 되살리지 않는다(풀리지 않는 주소도 "정상으로 열리지 않음"이라 목표는 지켜진다).
  - 다시 누를 때 DB의 `cf_record_ids`에는 이미 지운 id가 남아 있다. 그래서 **`RedirectClient.remove`도 없는 항목을
    성공으로 봐야 한다**(`DnsClient.remove`는 이미 404를 성공으로 봄). Cloudflare가 없는 목록 항목 삭제에 어떻게
    답하는지 구현 때 실측하고, 실패로 답하면 그 응답을 성공으로 처리한다. 테스트도 둔다.
- **바로가기 "처음 확인될 때 켜기"를 없애는 데 따른 안전장치**: `verifySubdomain`·매일 점검은 바로가기 행에
  `redirect:` 항목이 없으면 토큰이 보여도 `p_ok=false`로 기록한다. 그래야 실제로는 아무것도 없는데 "연결됨"이
  되지 않는다. 2026-10-26 운영에는 그런 행이 없다.
- 연결 뒤는 지금과 같다. `pending` → 실제 주소에서 토큰이 보이면 `active`, 7일 규칙, "바꾸기"·`UrlChangedDialog`
  모두 그대로 둔다. 토큰이 이미 사이트에 있으므로 호스트 설정만 끝나면 자동 확인이 곧 `active`로 바꾼다.
- 호스트가 인증서를 받는 몇 분 동안은 주소가 안 열릴 수 있다. ③ 화면에 "호스트가 인증서를 받는 데 몇 분 걸려요"
  한 줄을 둔다.

## 경고 페이지 `/pending-domain/[name]`

- 공개 페이지다(보호 라우트 아님). `/domains`는 보호 라우트라 그 아래에 두지 않는다.
- `(nav)` 레이아웃, `PageHero`(section=domains, `Globe`), 가운데 짧은 안내.
  - 제목: "아직 연결 확인 전인 주소예요"
  - 본문: "`<이름>.dshs.dev`는 주인이 연결 확인을 마치면 열려요."
  - 주 버튼(teal): "내 주소라면 연결 마치기" → `/domains`(비로그인은 로그인 화면으로 감).
  - 보조 링크: "도메인 마련하기 알아보기" → 홈 또는 `/domains`.
- **프로젝트 정보는 보여 주지 않는다.** DB를 읽지 않고 이름만 보여 준다. 이름은 `validateName`을 통과하지
  못하면 404로 보낸다. 로딩 뼈대는 다른 페이지 규칙을 따른다.
- `<meta name="robots" content="noindex">`.

## 화면 (`DomainSteps`)

- 단계 이름: ① 이름 정하기 → ② 내 사이트에 확인 코드 넣기 → ③ 호스트에 연결하기. 연결 뒤에는 "연결 확인 중 /
  연결됨" 상태를 ③ 아래에 둔다.
- 목록(`DomainList`)의 상태 알약에 "확인 기다림"(예약 + 미확인)과 "연결 기다림"(확인 완료 + 미연결)을 나눈다.
  기존 알약(설정 중·연결됨·끊김·회수됨)은 그대로 둔다. 연결된 적 없는 주소의 알약에는 끊김 알약처럼
  **"N일 뒤 자동 반납"**을 붙인다. 이 기능을 만든 이유가 "모르고 쓰다가 끊김"이기 때문이다. (빌더 판단)
- 자동 확인(`useDomainChecks`)은 `reserved` + 원래 주소 입력됨 + 미확인 행도 돌린다. 이때 대상은 원래 주소다.
- 홈 `DomainTeaser`의 3단계 문구(이름 정하기 → 호스트에 등록 → 연결 확인)도 새 순서에 맞춘다.
- `register.md` 가이드 끝의 안내와 CLAUDE.md의 도메인 마련하기 절도 새 순서로 고친다.

## DB (새 migration)

- `subdomains`에 컬럼 추가: `site_url text`, `site_host text`(호스트 키, `host` CHECK와 같은 값),
  `site_verified_at timestamptz`, `connected_at timestamptz`(`subdomain_connect`가 매번 기록).
- **7일 시계**: 연결된 적 없는 주소의 반납 기준을 `created_at`에서 `greatest(created_at, connected_at)`로 바꾼다
  (`check.ts` `decide`, `CheckRow`에 `connected_at` 추가). 6일째 확인하고 7일째 연결한 주소가 연결 직후 반납되지
  않게 한다. 연결하지 않고 미루기만 하면 지금처럼 7일 뒤 반납된다. (빌더 판단)
- 함수:
  - `subdomain_verify_site`(위). 주소 모양 검사는 앱이 하고, DB는 `site_host`가 허용 키인지와 소유자인지 본다.
  - `subdomain_set_placeholder_records`(위).
  - `subdomain_connect`: `not_verified`·`host_mismatch` 검사 추가. 바로가기 호스트면 `target`이
    `site_url`의 호스트 이름과 같아야 한다.
  - `subdomain_set_redirect_records`: 더 이상 쓰지 않는다. 지우지 않고 남겨 두되 앱에서 부르지 않는다.
- 모든 새 함수는 EXECUTE를 `service_role`에게만 준다(기존 규칙).
- **기존 행 처리**: `ever_active=true`인 행은 `site_verified_at = now()`, `site_host = host`로 채운다. 실제 주소에서
  이미 확인된 것이기 때문이다. `site_url`은 바로가기 행이면 `https://<target>/`로 채우고, CNAME 행이면 `target`이
  호스트 기본 주소 모양일 때(`prefillFromUrl` 호스트) `https://<target>/`로 채우고, 아니면(Vercel·Railway) 비워 둔다.
  비워 둔 행은 같은 호스트로 다시 연결할 때도 ②부터 하게 된다. `connected_at`은 기존 연결 행에 `updated_at`(없으면
  `created_at`)으로 채운다. 확인된 적 없는 `pending`/`broken` 행은 그대로 둔다(DNS가 살아 있으면 7일 규칙으로
  반납된다). 2026-10-26 운영 DB에는 `hwip`(active)과 `yako`(reserved)뿐이다. `yako`는 자리표시가 없으니 다음에 연결할
  때 ②부터 하면 된다.
- 검증 SQL(`docs/22-supabase-subdomains-verify.sql`과 같은 방식, 항상 롤백)에 새 검사를 추가한다.
- 운영 적용은 `supabase db push`로 직접 한다(사용자 규칙).

## 매일 점검 (`scripts/check-subdomains.mts`)

- `reserved` 행은 지금처럼 확인하지 않는다(7일 뒤 `never_connected_7d` 반납, 자리표시도 같이 지워짐).
- 바로가기 "처음 확인되면 켜기" 블록을 지운다.
- 바로가기 규칙 동작 점검(`redirectWorks`)은 그대로 둔다. 다만 그 점검은 `target`이 있는 행만 고르고 Location을
  `https://<target>/`로 비교하므로 자리표시는 확인하지 못한다. **자리표시 점검을 따로 하나 둔다**: 자리표시가 있는
  `reserved` 행 하나를 열어 302 + Location이 `https://dshs.dev/pending-domain/<이름>`인지 본다(`placeholderWorks`).

## 개발 환경

- 자리표시도 기존 가짜 클라이언트(`[dns:fake]`, `[redirect:fake]`)를 쓴다.

## 테스트 (`npm test`)

- `checkSite`: 기준 URL에 경로가 있을 때 meta·well-known 판정.
- 원래 주소 검사 함수(새로 만듦, `hosts.ts`): 프리셋 9개의 기본 주소 허용, `*.dshs.dev`·사용자 도메인·http·
  Firebase `--` 미리보기 거절, GitHub Pages 경로 허용.
- 자리표시 목록 항목 본문(경로·쿼리 안 붙임).
- 연결 순서: 옛 레코드 삭제 → 생성 → 기록, 기록 실패 시 정리(`connect.test.ts` 확장).
- `buildVerifyPrompt` 새 첫 문장(`ai-prompt.test.ts`).

## 빌더에게 맡기는 것

- 컴포넌트를 나누는 방식, 상태 알약 색, 문구의 세부 표현(해요체, 쉬운 말 규칙 안에서).
- `checkSite` 확장 시그니처.
