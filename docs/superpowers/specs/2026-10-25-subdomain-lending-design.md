# 서브도메인 빌려주기 ("주소 받기") 설계

- 날짜: 2026-10-25
- 상태: 초안 (사용자 승인 대기)
- 관련 메모: 2026-10-24 방향 결정(CNAME 방식·계정당 3개·별도 화면·권한 엄격), 2026-10-25 브레인스토밍
- 시안: `.superpowers/brainstorm/40965-1792918724/content/` — `layout.html`(A/B 중 **B 채택**), `hosts.html`(호스트 고르기)

## 1. 왜 만드나

학생이 만든 웹사이트에 `omm.dshs.dev` 같은 짧은 주소를 붙여 준다. **성공 기준(사용자)**: 학생이 자기 사이트를 이 주소에 연결해서, 이 주소가 그 사이트의 **대표 주소**가 되는 것 — 포트폴리오·친구에게 주는 주소가 `*.dshs.dev`.

우리는 서버를 빌려주지 않는다. Cloudflare DNS API로 `dshs.dev` 존에 **CNAME(필요하면 TXT) 레코드만** 만든다. 학생은 자기 호스트(Vercel 등)에 커스텀 도메인을 직접 등록해야 HTTPS가 켜진다.

학생이 이 기능을 찾는 순간은 **배포 직후**다. 그래서 홍보가 중요하고, 내비에 칸을 하나 준다.

## 2. 목표 / 비목표 / 반목표

**목표**
- 등록된 프로젝트의 소유자가 `<이름>.dshs.dev`를 받아 자기 호스트에 연결할 수 있다.
- 여러 호스트(Vercel만이 아니라)를 지원한다. 호스트마다 다른 절차를 화면이 단계별로 안내한다.
- 권한을 **매우 엄격하게** 지킨다(사용자 강조). 남의 주소를 건드리거나 3개 제한을 넘는 일은 서버 액션을 우회해도 DB가 막는다.

**비목표**
- Worker 프록시나 호스팅 제공(방식 B는 하지 않음).
- 이름 변경 기능(반납 후 다시 받기로 대신).
- 루트 도메인(`dshs.dev`)이나 2단계 이름(`a.b.dshs.dev`) 발급.

**반목표** — 돌아가도 이렇게 되면 실패
- 학생 사이트가 본 사이트(`dshs.dev`) 로그인을 건드릴 수 있다(쿠키 투척).
- 주인이 떠난 주소를 제3자가 가로챈다(서브도메인 탈취).
- 프로젝트·주소를 지웠는데 DNS 레코드가 남는다.
- 학생이 임의의 서버(학교 밖 개인 서버, 피싱 사이트 호스트 등)로 CNAME을 걸 수 있다.

## 3. 사용자가 정한 것

| 항목 | 결정 |
|---|---|
| 방식 | CNAME(+필요한 TXT)만. 프록시 없음 |
| 발급 대상 | **이 플랫폼에 등록된 프로젝트**에만. 프로젝트 1개당 주소 1개 |
| 개수 | **계정당 3개** (반납·회수된 것 제외) |
| 권한 | 신청·연결·반납은 **프로젝트 소유자(`author_id`)만**. 팀원 불가 |
| 관리자 | 관리자(`isDeveloper` / SQL `is_admin()`)가 **강제 회수** 가능 |
| 이름 | 학생이 자유롭게 정함, **선착순** |
| 화면 | 등록 폼 안이 아니라 **별도 화면**. 시안 **B**: 내 웹사이트 프로젝트 목록, 각 줄에 "주소 받기" → 그 자리에서 1·2·3단계 펼침 |
| 호스트 | **Vercel 외 여러 호스트** 지원 |
| 방문 주소 | 연결이 확인돼도 프로젝트 `url`을 **자동으로 바꾸지 않는다**. "방문 주소를 `x.dshs.dev`로 바꿀까요?" 제안 띠 + 그 자리에서 바로 바꾸는 버튼 |
| 소유 확인 | "열리기만 하면 연결됨"이 아니라, 학생 사이트에 **확인 코드(meta 태그)**가 보여야 연결됨. 매일 점검도 코드를 확인 |
| 비로그인 | 내비 "주소 받기"를 누르면 **로그인 화면으로** (보호 라우트) |
| 내비 | 5번째 칸 "주소 받기", **가이드 다음** 위치 (2026-10-24 결정) |

## 4. 화면 (`/domains`, 보호 라우트)

- 경로 `/domains`(내가 고름). `src/middleware.ts`의 `PROTECTED_PREFIXES`에 추가 → 비로그인은 `/login?next=/domains`.
- 머리: `PageHero` — 섹션 키 `domains`, 아이콘 lucide `Globe`, 제목 "주소 받기", 설명 "내 웹사이트에 이름.dshs.dev 주소를 붙여요". 섹션 색은 **teal-700**(흰 글자 AA 통과, 기존 색과 겹치지 않음 — 내가 고름).
- 본문: "내 프로젝트" 목록 + 오른쪽에 "주소 N / 3".
  - 대상: 로그인 사용자가 `author_id`인 프로젝트 중 **`types`에 `website`가 있고** `url`이 있는 것(내 판단 — 앱·확장의 `url`은 스토어 페이지라 연결할 수 없음). 공개 여부는 따지지 않는다(내 판단 — 이 화면은 본인만 보고, DNS에는 이름만 드러남). 웹사이트 프로젝트가 없으면 빈 상태 문구는 "웹사이트 프로젝트를 등록하면 주소를 받을 수 있어요".
  - `url` 없는 프로젝트는 회색 줄 + "방문 주소가 있어야 받을 수 있어요"(수정 링크).
  - 프로젝트가 없으면 빈 상태 + "프로젝트 등록하기" 링크.
  - 각 줄의 상태 알약: 없음(버튼 "주소 받기") / 설정 중("설정 이어서 하기") / 연결됨 / 끊김 / 회수됨(이유 표시).
- 펼친 3단계(한 줄에서 하나만 펼침):
  1. **이름** — `[____].dshs.dev` 입력. 입력 중 사용 가능 여부 확인(디바운스, 로그인 필요). 확정하면 이름이 **예약**된다(DB 행 생성, 3개 제한에 포함). DNS는 아직 안 만듦.
  2. **어디에 올렸어요?** — 호스트 카드(프리셋). 프로젝트 `url`의 호스트로 하나를 미리 고름("자동으로 골랐어요"), 학생이 바꿀 수 있음. 고른 프리셋의 안내(호스트 설정 화면 **직접 링크** 포함 — 가이드 설치 링크 규칙과 같음)와 입력 칸(CNAME 값, 필요하면 TXT 값). "연결하기" → 서버가 값 검증 후 DNS 레코드 생성.
  3. **연결 확인(소유 확인 포함, 사용자 결정)** — 화면이 그 주소 전용 확인 코드를 보여 준다: `<meta name="dshs-verify" content="<토큰>">`(복사 버튼 + "AI에게 이 줄을 사이트 `<head>`에 넣어 달라고 하세요" 안내). HTML이 아닌 사이트를 위해 대안으로 `https://<이름>.dshs.dev/.well-known/dshs-verify.txt` 파일 내용이 토큰과 같아도 인정. "확인하기" 버튼으로 서버가 `https://<이름>.dshs.dev/`를 불러(본문 앞 256KB만) **HTTPS로 열리고 토큰이 보일 때만** "연결됨". 실패면 원인을 나눠 안내 — 열리지 않음(인증서 발급 중일 수 있음, 보통 몇 분 / 호스트에 도메인 미등록) vs 열리지만 코드 없음(배포가 아직 안 됐거나 다른 사이트가 열림). 다시 확인 버튼.
     - 토큰은 주소 행마다 새로 만드는 무작위 값(예: 16바이트 hex). 반납 후 같은 이름을 다시 받아도 토큰이 다르므로, 이전 주인 사이트나 가로챈 사이트는 통과하지 못한다.
  - 연결되면 **제안 띠**: 프로젝트 `url`이 이미 그 주소가 아니면 "방문 주소를 `x.dshs.dev`로 바꿀까요? [바꾸기]". 바꾸기는 서버 액션으로 `projects.url`만 갱신. 원래 호스트 주소는 주소 기록(`target`)에 남는다.
- 줄 메뉴: "반납하기"(shadcn `Dialog` 확인 — "DNS 레코드가 바로 지워지고 이 이름은 다른 사람이 받을 수 있어요").
- 관리자에게는 줄마다 "회수"가 아니라 **별도 관리 목록**(`/domains`에 관리자만 보이는 "전체 주소" 탭 또는 `/domains/admin`)에서 회수 + 이유 입력. 구현 형태는 빌더 재량.
- 디자인은 「하위 페이지 공통 톤」을 따른다: 흰 바탕, `max-w-5xl`, 알약 버튼, 줄은 `rounded-2xl` 테두리, 3단계 칸은 점선 테두리. 호스트 카드는 한 개만 고르는 선택이라 섹션 색 tone을 써도 되지만, 시안처럼 zinc-900 반전도 무방.
- 모바일: 호스트 카드 2열, 입력·버튼은 세로로 쌓음.

## 5. 호스트 프리셋 (`src/lib/domains/hosts.ts`)

호스트별 절차를 코드 상수로 둔다. 호스트 추가 = 프리셋 하나 추가.

```ts
type HostPreset = {
  key: 'vercel' | 'netlify' | 'github-pages' | 'render' | 'cloudflare-pages' | 'firebase';
  label: string;
  detect: RegExp;            // 프로젝트 url 호스트로 미리 고르기 (예: /\.vercel\.app$/)
  cnameTarget: RegExp;       // 학생이 붙여 넣는 CNAME 값 허용 패턴 (호스트 소유 도메인만)
  txt?: { name: (label: string) => string; value: RegExp }[]; // 호스트가 요구하는 확인용 TXT
  settingsUrl?: string;      // 호스트 설정 화면 직접 링크
  steps: string[];           // 2단계 안내 문구 (해요체)
  notFound?: (res: Response, body: string) => boolean; // 탈취 점검: "사이트 없음" 응답 판별
};
```

- 대상 값은 반드시 **호스트 소유 도메인으로 끝나는 이름**이어야 한다(예: `*.vercel-dns*.com`·`*.vercel.app`, `*.netlify.app`, `<user>.github.io`, `*.onrender.com`, `*.pages.dev`). IP·임의 도메인 거부. 이것이 "임의 서버로 CNAME 금지" 반목표를 지킨다.
- TXT 레코드 이름은 **그 학생의 이름 아래**(`*.<이름>.dshs.dev`)만 허용. 예외는 호스트가 고정 이름을 요구하는 경우(예: Vercel `_vercel.dshs.dev`)뿐이며, 이때 값은 반드시 그 학생의 전체 도메인(`<이름>.dshs.dev`)을 포함해야 한다(그 도메인만 확인되도록). 예외 목록은 프리셋에 명시.
- **구현 전 확인 필요(빌더)**: 각 호스트의 현재 공식 문서로 CNAME 대상·TXT 요구를 확인한다. 특히
  - Firebase Hosting은 CNAME이 아니라 A 레코드 + TXT를 요구할 수 있다. A 레코드는 이 설계에서 허용하지 않으므로, 확인 결과 CNAME이 불가하면 **첫 버전에서 뺀다**.
  - Cloudflare Pages는 학생 계정이 우리 Cloudflare 계정과 다르면 교차 계정 제한(1014류)으로 안 될 수 있다. 실제 테스트로 안 되면 뺀다.
  - 빠진 호스트는 화면에서 "곧 지원" 대신 아예 숨긴다.
- 모든 레코드는 **DNS only(`proxied: false`)**. 프록시를 켜면 호스트가 인증서를 못 받고 우리 존 설정이 학생 트래픽에 적용된다.

## 6. 데이터 (Supabase)

새 테이블 `public.subdomains`(이름은 빌더 재량). SQL은 `docs/21-supabase-subdomains.sql` + `supabase/migrations/…`로 남기고, 운영 적용은 **내가 `supabase db push`로** 한다(사용자 지침).

| 컬럼 | 설명 |
|---|---|
| `id` | uuid PK |
| `name` | 이름(소문자). 활성 행 사이에서 UNIQUE |
| `project_id` | FK → projects, **`ON DELETE RESTRICT`** (DNS 정리 없이 프로젝트가 지워지지 않게). 활성 행 사이에서 UNIQUE(프로젝트당 1개) |
| `owner_id` | FK → users. 생성 시 `projects.author_id`로 채움 |
| `host` | 프리셋 key |
| `target` | CNAME 값 |
| `txt_records` | jsonb (`{name, value}[]`) |
| `cf_record_ids` | text[] — Cloudflare 레코드 id(삭제용) |
| `verify_token` | 소유 확인 토큰. 행 생성 시 DB가 무작위로 채움(`gen_random_bytes`), 바꿀 수 없음. 본인·관리자만 조회 |
| `status` | `reserved` → `pending`(DNS 생성, 미확인) → `active` → `broken` / `revoked` / `released` |
| `broken_since`, `checked_at`, `revoked_reason`, `revoked_by`, `created_at`, `updated_at` | |

- **이름 규칙**: 3~30자, `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`. 예약어 차단 — `www`, `api`, `admin`, `mail`, `smtp`, `ftp`, `ns1`, `ns2`, `dev`, `staging`, `status`, `auth`, `login`, `static`, `assets`, `cdn`, `_` 시작, 사이트가 쓰는 경로 이름 등. 규칙은 **DB CHECK + 예약어 테이블(또는 함수)**에서도 강제.
- **3개 제한**: `status IN ('reserved','pending','active','broken')`인 행이 `owner_id`당 3개 이하 — 트리거에서 `owner_id` 단위로 잠그고 센다(동시 요청 대비). 서비스 롤로 써도 트리거는 돈다.
- **권한(엄격)**: 가이드 위키(`guide_revisions`)와 같은 틀.
  - RLS: SELECT만 — 본인(`owner_id = auth.uid()`) 또는 `is_admin()`. INSERT/UPDATE/DELETE 정책 **없음**.
  - 쓰기는 `security definer` 함수 몇 개(예약·DNS 반영 기록·반납·회수·상태 갱신)로만, **EXECUTE는 `service_role` 전용**. 함수 안에서 소유자(`projects.author_id = p_user`)·관리자 여부를 다시 확인한다.
  - 서버 액션(`src/lib/domains/actions.ts`, `(nav)` 밖 — Turbopack 바인딩 문제)이 `getUser()` → 도메인 검사 → `createAdminClient()`로 함수 호출 → Cloudflare API 호출 순.
- 반납·회수된 행은 기록으로 남긴다. 반납된 이름은 바로 다시 받을 수 있다. **회수된 이름은 막아 둔다**(같은 이름으로 다시 받지 못하게 — 내 판단, 관리자가 풀 수 있게).

## 7. DNS 반영과 실패 처리

- 환경변수(비밀): `CLOUDFLARE_DNS_API_TOKEN`(권한: `dshs.dev` 존 **DNS 편집만**), `CLOUDFLARE_ZONE_ID`. Workers에는 `wrangler secret put`, GitHub Actions에는 저장소 Secrets. **토큰 생성은 사용자가 직접**.
- 레코드 `comment`에 `dshs-subdomain:<행 id>`를 넣어 우리가 만든 레코드를 구분한다.
- 순서: DB에 상태 기록 → Cloudflare 생성 → 성공하면 `cf_record_ids` 저장. Cloudflare 실패면 DB를 이전 상태로 되돌리고 오류 안내. 중간에 끊겨 생긴 고아 레코드는 아래 점검 작업이 지운다.
- 2단계 값을 다시 연결하면(호스트 바꿈 등) 기존 레코드를 지우고 새로 만든다.

## 8. 쿠키 투척 방어 (본 사이트)

학생 사이트(`*.dshs.dev`)의 JS는 `Domain=.dshs.dev` 쿠키를 심어 본 사이트의 같은 이름 쿠키를 덮을 수 있다. 방어:

- Supabase 세션 쿠키 이름을 **`__Host-` 접두사**로 바꾼다. 브라우저는 `__Host-` 쿠키를 `Domain` 속성 없이 `Secure`·`Path=/`로만 받으므로 서브도메인이 같은 이름을 심을 수 없다. `@supabase/ssr`의 `cookieOptions.name`(정확한 옵션명은 구현 때 확인)을 **세 곳 모두**(`src/lib/supabase/server.ts`, `client.ts`, `middleware.ts`)에 같은 값으로.
- `ds_onboarded`도 `__Host-ds_onboarded`로.
- 영향: 배포하는 순간 **모든 사용자가 한 번 로그아웃**된다. 로컬 `http://localhost`에서 `Secure` 쿠키가 동작하는지 확인(Chrome은 localhost 허용).
- 본 사이트는 앞으로도 `Domain=.dshs.dev` 쿠키를 쓰지 않는다(CLAUDE.md 보안 항목에 추가).
- 이 변경은 **주소 발급 기능보다 먼저** 배포한다.
- **같은 사이트(same-site) CSRF**: `x.dshs.dev`는 `dshs.dev`와 same-site라 `SameSite=Lax`가 막아 주지 않는다. 서버 액션은 Next가 Origin을 검사하지만 **쿠키로 인증하는 Route Handler**(`POST /api/upload`, `/api/track`, `/api/github-readme` 등 상태를 바꾸거나 로그인 필요한 것)는 아니다 → 모든 해당 Route Handler에 `Origin`(없으면 `Referer`) 호스트가 `NEXT_PUBLIC_SITE_URL` 호스트와 같은지 확인하는 공용 가드를 넣는다(내 판단, 이 작업 범위에 포함).
- **쿠키 폭탄**(학생 JS가 큰 `.dshs.dev` 쿠키를 심어 그 방문자에게 `dshs.dev` 전체가 431 오류): 서버에서 막을 방법이 없다. 남는 위험으로 받아들이고, 대응은 관리자 회수(내 판단). CLAUDE.md 보안 항목에 적어 둔다.

## 9. 매일 점검 (탈취 방지·정리)

`.github/workflows/check-subdomains.yml` + `scripts/check-subdomains.mts` — README 동기화 작업과 같은 틀(매일 03:30 KST, `workflow_dispatch` + `dry_run`, 실패 시 exit 1). 판단 로직은 `src/lib/domains/check.ts`(순수, 네트워크 주입, `node --test`).

- `pending`/`active`/`broken` 행마다 `https://<이름>.dshs.dev`를 불러 본다(타임아웃 10초, 리다이렉트 따라가지 않음).
  - HTTPS로 열리고 **확인 토큰이 보임**(meta 또는 `.well-known` 파일, 3단계와 같은 판정 함수) → `active`, `broken_since` 비움.
  - 열리지 않음, 프리셋 `notFound`(호스트의 "사이트 없음" 페이지), 또는 **토큰 없음**(가로챈 사이트·이전 주인 사이트 포함) → `broken`, `broken_since` 기록.
  - `broken`이 **7일** 넘으면 DNS 레코드 삭제 + `released` + 사유 기록.
  - `pending`이 7일 넘게 한 번도 연결 안 되면 같은 처리(이름 묶어 두기 방지).
- 대조: Cloudflare에서 `comment`가 `dshs-subdomain:`인 레코드를 모두 받아 DB 활성 행과 비교 → DB에 없거나 `released`/`revoked`인 레코드는 삭제.
- 학생 알림: 사이트에 알림 기능이 없으므로 `/domains` 줄에 "끊김 · N일 뒤 자동 반납" 표시로 대신(내 판단). 이메일은 비목표.
- 로그는 공개 저장소라 모두에게 보인다 — 이름은 공개 DNS라 찍어도 되지만 **프로젝트 제목·이메일은 찍지 않는다**.

## 10. 다른 곳과의 연결

- **내비**: `PageNav`/`MobileNav`의 `NAV_ITEMS`에 `{ href: '/domains', label: '주소 받기', icon: Globe }`를 가이드와 커뮤니티 사이에. 활성 판정 `/domains/*`. `SECTION_COLORS`에 `domains` 키 추가.
- **프로젝트 삭제**: 지금은 `project-form.tsx`가 브라우저 클라이언트로 직접 지운다. 주소가 있으면 FK `RESTRICT` 때문에 실패하므로, 삭제를 서버 액션으로 옮겨 **주소 반납(DNS 삭제) → 프로젝트 삭제** 순으로 처리한다. 삭제 확인창에 "이 프로젝트의 주소 `x.dshs.dev`도 반납돼요" 표시.
- **프로젝트 상세**: 주소가 `active`면 정보 카드에 "주소 x.dshs.dev" 한 줄(내 판단, 선택).
- **가이드**: `src/content/guides/register.md` 마지막 단계 뒤에 "내 주소 받기" 단계 추가(→ `/domains`). 등록 후에만 받을 수 있으므로 3장(ship)이 아니라 4장 끝. 위키로 편집되는 콘텐츠라 저장소 원본만 바꾸고 DB 최신본엔 "원본 가져오기" 안내가 뜬다.
- **문서**: CLAUDE.md에 기능 절·환경변수·보안 항목, `docs/19-cloudflare-workers.md`에 토큰 만드는 법.

## 11. 빌더에게 맡기는 것

- 관리자 회수 화면의 형태(탭/별도 경로), 컴포넌트 쪼개기, 함수 이름.
- 이름 사용 가능 확인의 방식(서버 액션 vs 라우트), 디바운스 시간.
- 연결 확인 요청은 기존 `ssrf-guard.ts`를 거칠 것(대상은 우리 서브도메인이지만 CNAME이 바깥을 가리킴).
- 호스트 프리셋의 정확한 패턴·문구(공식 문서 확인 후).

## 12. 미결 / 사용자 손이 필요한 것

- Cloudflare **DNS 편집 전용 API 토큰** 만들기와 Zone ID 확인(사용자). 없으면 개발 중에는 Cloudflare 호출을 흉내 내는 가짜 클라이언트로 진행.
- main의 `wrangler.jsonc`는 `routes`가 아직 주석이다. `dshs.dev` 연결을 대시보드에서 했는지 확인하고, 학생 레코드가 루트·`www` 레코드와 부딪히지 않는지 본다.
