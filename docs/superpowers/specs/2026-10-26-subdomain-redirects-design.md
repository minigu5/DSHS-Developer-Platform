# 도메인 마련하기 — 바로가기 주소 (Cloudflare Workers · Firebase Hosting)

2026-10-26. 기존 설계 `2026-10-25-subdomain-lending-design.md`에 덧붙이는 기능이다. 그 문서에서 정한 규칙(이름·3개 제한·소유자만·관리자 회수·소유 확인 토큰·매일 점검)은 바뀌지 않는다.

## 1. 왜 만드나

- Cloudflare Workers는 무료 혜택이 좋아서 쓰는 학생이 꽤 있다. 그런데 이 학생들은 도메인 마련하기에서 **실제로 막혀 있다**(사용자 확인).
- 막히는 이유는 두 가지다.
  - Workers는 커스텀 도메인을 붙이려면 그 존(`dshs.dev`)이 같은 Cloudflare 계정에 있어야 한다. 다른 계정의 Worker에 CNAME을 거는 것도 막혀 있다(1014).
  - Firebase Hosting은 CNAME이 아니라 A 레코드를 요구한다. 그래서 2026-10-25에 둘 다 제외했다.
- 그래서 이 두 호스트에는 연결 대신 **바로가기 주소**를 준다. `foo.dshs.dev`로 들어오면 학생 사이트(`foo.아이디.workers.dev`, `이름.web.app`)로 보낸다.

## 2. 사용자 결정

- 들어간 뒤 주소창이 `workers.dev`·`web.app`으로 바뀌어도 **괜찮다**.
- Workers와 Firebase를 **같이** 연다.
- 우리 Worker가 학생 사이트를 대신 받아와 보여 주는 방식(프록시)은 **하지 않는다**. 이유는 셋이다.
  - Workers 무료 한도(하루 10만 요청)는 **계정 전체**에 걸린다. 따로 Worker를 만들어도 `dshs.dev`와 나눠 쓴다. 넘으면 계정의 Worker가 모두 1027 오류를 낸다.
  - 다른 계정에 두면 위의 같은 계정 제한 때문에 `*.dshs.dev`에 붙일 수 없다.
  - 학생 내용이 우리 도메인 밑에서 그대로 보이게 되어 쿠키·피싱 문제가 다시 생긴다.
- 구현은 **Cloudflare Bulk Redirects**로 한다. 우리 Worker를 거치지 않아 요청 한도를 쓰지 않는다. 무료 요금제 한도는 계정당 목록 5개, 규칙 15개, 바로가기 1만 개다.
- 토큰은 기존 DNS 토큰(`CLOUDFLARE_DNS_API_TOKEN`)을 **그대로 두고**, 목록 편집 전용 새 토큰을 따로 만든다. 권한은 **Account → Account Filter Lists → Edit** 하나다(사용자 동의, 토큰 생성은 사용자가 함).
- 나중에 주소창 유지가 꼭 필요해지면 Workers 유료($5/월)로 바꾼 뒤 프록시 방식을 다시 검토한다. 이번 범위는 아니다.

## 3. 목표 · 하지 않을 것 · 실패로 볼 것

**목표**
- Workers·Firebase로 올린 웹사이트 프로젝트도 `이름.dshs.dev`를 받아 공유할 수 있다.
- 기존 흐름(1 이름 → 2 호스트 → 3 확인)과 같은 화면에서 끝난다. 학생이 호스트 쪽에서 따로 설정할 것은 없다.

**하지 않을 것**
- 주소창 유지(프록시), Surge·Heroku 등 다른 호스트, Firebase 커스텀 도메인(A 레코드) 연결, 유료 요금제.

**실패로 볼 것** (동작하더라도)
- `dshs.dev`가 아무 사이트로나 보내는 **열린 리다이렉터**가 되어 피싱 링크로 쓰인다.
- 바로가기 때문에 `dshs.dev` 본 사이트가 느려지거나 한도에 걸린다.
- 학생 JS가 `*.dshs.dev`에서 돈다. 바로가기는 Cloudflare가 응답하므로 이 일이 없어야 한다.
- 반납·회수·탈퇴·프로젝트 삭제 뒤에 바로가기가 남아 다음 주인이나 엉뚱한 곳으로 계속 보낸다.

## 4. 동작

### 4.1 학생 화면
- 2단계 호스트 카드에 **Cloudflare Workers**와 **Firebase Hosting**을 추가한다(7개 → 9개). 프로젝트 url이 `*.workers.dev`·`*.web.app`·`*.firebaseapp.com`이면 미리 고른다.
- 이 두 호스트를 고르면 CNAME·TXT 칸 대신 **"보낼 곳 주소" 한 칸**만 보인다. 프로젝트 url의 호스트 이름으로 미리 채운다.
- 안내 문구에 두 가지를 쓴다. ① 들어가면 주소창이 보낼 곳 주소로 바뀐다. ② 호스트 쪽에서 할 일은 없다.
- 3단계(소유 확인)는 같다. 다만 확인하는 곳이 **보낼 곳 사이트**다(4.3).
- 목록(`DomainList`)과 프로젝트 상세 정보 카드의 "주소" 행에는 상태 알약 옆에 **"바로가기"** 표시를 단다. 상태(설정 중/연결됨/끊김/회수됨)는 그대로 쓴다.
- 연결이 확인되면 기존처럼 제안 띠 "바꾸기"(방문 주소를 `foo.dshs.dev`로)를 보여 준다. 다만 `UrlChangedDialog`(DB·로그인 설정을 새 주소로 바꾸라는 안내)는 **띄우지 않는다**. 사이트는 여전히 원래 주소에서 돌기 때문이다.

### 4.2 보낼 곳 규칙 (열린 리다이렉터 방지)
- 받는 주소는 아래 둘뿐이다. 앱(`hosts.ts`)과 DB(`subdomain_target_ok`) **양쪽**에서 검사한다.
  - Workers: `^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$` (`워커이름.계정서브도메인.workers.dev`)
  - Firebase: `^[a-z0-9-]+\.(web\.app|firebaseapp\.com)$`. 단, `--`가 들어간 이름은 거부한다. 기한이 지나면 사라지는 미리보기 채널(`site--channel-xxxx.web.app`)이기 때문이다.
- 저장하는 `target`은 호스트 이름뿐이다(경로·포트·쿼리 없음). 보낼 주소는 항상 `https://<target>/`이다.
- Workers 버전 미리보기 주소(`<8자>-<워커>.<계정>.workers.dev`)는 정규식으로 확실히 가릴 수 없어서 **막지 않는다(제 결정)**. 보낼 곳 칸 아래에 "미리보기 주소 말고 워커 기본 주소를 넣어요" 안내를 한 줄 둔다. 미리보기가 사라지면 토큰 확인이 실패해 끊김 → 반납 경로를 탄다.

### 4.3 소유 확인
- 행의 `verify_token`을 그대로 쓴다. `https://<target>/`의 meta 또는 `https://<target>/.well-known/dshs-verify.txt`에 토큰이 있어야 "연결됨"이다.
- 리다이렉트는 지금처럼 **같은 호스트 안에서만** 따라간다(`target` 호스트 기준).
- 요청 전에 `assertSafePublicUrl`로 target을 검사한다.
- 자동 확인(20초마다), 지금 확인하기, 매일 점검, 끊긴 지 7일·연결 없이 7일 뒤 반납은 기존과 같다.
- "AI에게 보낼 글"은 바로가기용 문구로 바꾼다. 첫 줄은 "도메인을 바꿨어"가 아니라 "`foo.dshs.dev` 바로가기 주소를 받았어"로 시작한다. 확인할 곳은 `https://<target>`이다. 구조별 자리에는 다음을 더한다.
  - Workers: Worker가 돌려주는 HTML의 `<head>`. 정적 자산을 쓰면 그 폴더의 `index.html`.
  - Firebase: `public/index.html`.
  - 푸시·배포 문장은 호스트에 맞춘다. Workers는 `wrangler deploy` 또는 연결된 Git, Firebase는 `firebase deploy`.
  - 문구 초안은 구현자가 쓴다. 사용자가 확정한 기존 문구(2026-10-25)의 형식과 조건 줄은 유지한다.

### 4.4 Cloudflare 쪽 구성
- **DNS 레코드**(주소마다 하나): `AAAA foo.dshs.dev → 100::`, **proxied: true**, `ttl: 1`. comment는 기존과 같은 `dshs-subdomain:<행 id>`다. Bulk Redirects는 proxied 레코드에만 동작한다.
  - `foo.dshs.dev`는 한 단계 서브도메인이라 Universal SSL(`*.dshs.dev`)이 덮는다.
  - 기존 CNAME은 계속 DNS only다. `cloudflare.ts` 머리 주석(“모든 레코드는 DNS only”)을 고친다.
- **바로가기 목록 항목**(주소마다 하나), 계정 목록 `dshs_subdomain_redirects`(type `redirect`)에 넣는다.
  - `source_url: "foo.dshs.dev/"`(scheme 생략 → http·https 둘 다)
  - `target_url: "https://<target>/"`
  - `status_code: 302`(301은 브라우저가 오래 기억해서 보낼 곳을 바꿔도 안 바뀐다)
  - `subpath_matching: true`, `preserve_path_suffix: true`, `preserve_query_string: true`, `include_subdomains: false`
  - `comment: "dshs-subdomain:<행 id>"`
  - 결과: `foo.dshs.dev/a/b?x=1` → `https://<target>/a/b?x=1`
- **바로가기 규칙**(계정에 하나, 한 번만): 위 목록을 쓰는 Bulk Redirect Rule이다. 기본 식은 `http.request.full_uri in $dshs_subdomain_redirects`다. 새 토큰에는 규칙 권한이 없으므로 **사용자가 대시보드에서 한 번 만든다**(구현 계획에 1분짜리 안내 단계를 넣는다). 목록 자체는 새 토큰으로 API에서 만들 수 있다.
- 목록 API(`/accounts/{account}/rules/lists/{list}/items`)는 추가·삭제가 **비동기**다(operation_id → `bulk_operations/{id}`로 완료 확인). 목록 전체를 바꾸는 PUT은 쓰지 않는다. 동시에 하는 다른 학생의 작업을 지울 수 있기 때문이다. 추가·삭제(POST/DELETE)만 쓴다. 목록에 진행 중인 작업이 있어 거절되면 짧게 재시도한다.
- 개발(`next dev`)에서는 DNS처럼 **메모리 가짜**를 쓴다(`[redirect:fake]` 로그). 진짜 호출은 `DOMAINS_REAL_DNS=1`일 때만 한다.

### 4.5 수명 주기와 정리 (실패 조건 1·4번 방지)
- **바로가기는 토큰이 확인된 뒤에만 켠다(제 결정).** CNAME과 달리, 확인 전에 켜 두면 남의 `workers.dev`·`web.app` 사이트로 보내는 주소를 누구나 만들 수 있기 때문이다. 확인은 target에 직접 하므로 바로가기가 없어도 되고, 그래서 학생 쪽 불편은 없다.
  - `connectHost`(바로가기 호스트): 옛 레코드·항목을 지우고 DB에 host·target만 기록한다(`pending`, `cf_record_ids` 비움). Cloudflare에는 아무것도 만들지 않는다.
  - 확인이 처음 성공할 때(`verifySubdomain`·매일 점검에서 결과 ok이고 Cloudflare 것이 아직 없을 때): AAAA 생성 → 목록 항목 추가(완료까지 대기) → DB에 id 기록 + `active`. 중간에 실패하면 이번에 만든 것을 지우고 상태는 바꾸지 않는다(다음 확인 때 다시 시도). id를 기록하는 새 DB 함수가 필요하다(`subdomain_record_check`는 `cf_record_ids`를 쓰지 않는다). 이 함수도 service_role 전용이고 소유자 확인 대신 "바로가기 호스트이고 살아 있는 행"인지 확인한다.
  - **끊김(`broken`) 동안은 바로가기를 그대로 둔다(제 결정).** 기존 CNAME 주소와 같은 규칙이다. 재배포하다 meta를 빠뜨린 정도로 링크가 바로 죽지 않게 하려는 것이다. 7일 뒤 반납되면 지워진다.
- 호스트를 바로가기 ↔ CNAME 사이에서 바꿔 다시 연결하면 옛 것을 먼저 지운다. CNAME 호스트로 가면 기존 경로(레코드 생성 → DB 기록)를 그대로 탄다.
- **배포 순서**: 바로가기 규칙(4.4)을 대시보드에 만든 다음에 호스트 카드 두 개를 운영에 내보낸다. 규칙 없이 카드가 열리면 "연결됨"인데 들어가지지 않는 주소가 생긴다.
- **Cloudflare id 저장(제 결정)**: DB 함수(`subdomain_release`·`subdomain_revoke`·`withdraw_account`)는 이미 `cf_record_ids text[]`를 돌려준다. 그래서 목록 항목 id도 같은 배열에 **`redirect:<항목 id>`** 형태로 넣는다. 이렇게 하면 DB 함수의 반환형을 바꾸지 않아도 된다.
  - 대신 지금 `getDnsClient().remove(ids)`를 부르는 네 곳은 접두어로 나눠 지우는 공용 함수 하나로 바꾼다: `domains/actions.ts`(반납·회수·재연결), `projects/actions.ts`(프로젝트 삭제), `privacy/actions.ts`(탈퇴), `scripts/check-subdomains.mts`(자동 반납).
- **매일 점검** 추가:
  - 바로가기 주소는 target에서 토큰을 확인한다(4.3).
  - 목록 항목 중 comment의 행이 살아 있지 않으면 지운다(고아 정리, DNS와 같은 규칙).
  - **바로가기 동작 점검**: 살아 있는 바로가기가 하나라도 있으면 그중 하나에 `https://<이름>.dshs.dev/`를 요청한다. 302와 `Location: https://<target>/`가 오지 않으면 실패로 센다(exit 1 → 메일). 규칙이 지워지거나 꺼진 것을 알아채기 위해서다. 학생 상태는 바꾸지 않는다. 주소마다 확인하지 않고 하나만 보는 건 제 결정이다. 규칙은 계정에 하나뿐이라 하나가 되면 다 된다.
  - 로그에는 지금처럼 주소 이름만 찍는다(공개 저장소).

### 4.6 DB (새 migration, `docs/22` 사본에도 덧붙임)
- `subdomains_host_check`에 `'cloudflare-workers'`, `'firebase'`를 추가한다.
- `subdomain_target_ok`에 4.2의 두 규칙을 추가한다.
- `subdomain_txt_ok`: 두 호스트는 TXT를 **받지 않는다**(빈 배열만 통과).
- 3개 제한·이름·프로젝트당 1개·삭제 트리거·탈퇴는 그대로 둔다. 바로가기도 같은 행이고 같은 상태를 쓰기 때문이다.
- 운영 적용은 `supabase db push`로 직접 한다. 검증은 `docs/22-supabase-subdomains-verify.sql`에 두 호스트 경우를 더해 롤백 트랜잭션으로 돌린다.

### 4.7 환경변수
| 변수 | 어디에 | 비고 |
|---|---|---|
| `CLOUDFLARE_LISTS_API_TOKEN` | `.env.local`, Workers `wrangler secret put`, Actions Secrets | Account Filter Lists Edit만 |
| `CLOUDFLARE_ACCOUNT_ID` | `.env.local`, Workers `vars`, Actions Secrets | 비밀 아님 |
| `CLOUDFLARE_REDIRECT_LIST_ID` | 위와 같음 | 목록을 만든 뒤 나온 id |

- 운영에서 셋 중 하나라도 없으면 바로가기 호스트로 연결할 때 오류를 낸다. 기존 CNAME 호스트는 영향을 받지 않는다.
- `CLAUDE.md`의 환경변수 표와 「도메인 마련하기」 절(호스트 목록, "제외" 문장)을 고친다. `hosts.ts` 머리 주석의 제외 목록도 고친다.

## 5. 구현자에게 맡기는 것
- 호스트 프리셋 모양: `HostPreset`에 `mode: 'cname' | 'redirect'`를 둘지, 별도 타입으로 나눌지. 단, 호스트 추가 절차("프리셋 + migration")는 한 곳에서 유지한다.
- 두 호스트의 `notFound` 판별. 모르는 `workers.dev`·`web.app` 주소가 무엇을 돌려주는지 실측해서 정한다. 가릴 수 없으면 `() => false`.
- 목록 클라이언트의 파일 구조, 재시도 횟수·대기 시간, 비동기 작업 완료를 기다리는 시간 한도(서버 액션 안이라 짧게).
- 목록 항목 id를 얻는 방법(추가 후 comment로 검색 등).
- 화면 문구 세부와 "바로가기" 표시 모양. `SECTION_COLORS.domains` 범위 안에서 정하고, 섹션 색은 주 버튼·활성 칩에만 쓰는 규칙을 지킨다.
- 테스트: 순수 로직(target 검증, 접두어 분리, 목록 항목 본문 만들기, AI 문구, 매일 점검 판단)은 `node --test`. 네트워크는 주입한다.

## 6. 사용자가 할 일
1. 새 토큰 만들기(안내 완료) → `.env.local`에 `CLOUDFLARE_LISTS_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`를 넣는다.
2. 목록이 만들어진 뒤 대시보드에서 Bulk Redirect Rule을 한 번 만든다(구현 중 안내).
3. 운영 비밀값(Workers secret, Actions Secrets)을 넣는다(구현 중 안내).
