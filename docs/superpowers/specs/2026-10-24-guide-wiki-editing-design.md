# 가이드 위키식 편집 — 설계

- 날짜: 2026-10-24
- 시안: https://claude.ai/artifact/7Wh7o1TxSvSjf24CK1K3zc (편집기는 **2-B 카드 세로 스택 + 미리보기** 채택)
- 관련: 가이드 콘텐츠 재작성 설계 `docs/superpowers/specs/2026-10-24-guide-rewrite-design.md`(다른 세션 작성 중)

## 1. 왜 만드나

`/guide`의 바이브 코딩 가이드는 도구가 빨리 바뀌어 금방 낡는다. 사용자 말로 학생이 가이드를 고치고 싶은 순간은 두 가지다.

1. 가이드가 오래돼서 명령어를 다른 것으로 바꿔야 할 때
2. 자기만의 노하우를 넣고 싶을 때

그래서 로그인한 학생 누구나 가이드를 고칠 수 있게 한다. 대신 나무위키처럼 모든 수정이 버전으로 남고, 버전마다 누가 고쳤는지 분명하며, 어느 버전으로든 되돌릴 수 있어야 한다.

## 2. 목표 / 비목표 / 실패 조건

**목표**
- 로그인 사용자 누구나 가이드 내용을 고쳐 즉시 반영(승인 대기 없음).
- 모든 저장이 새 버전. 버전마다 작성자·시각·한 줄 요약·바뀐 점이 남는다.
- 어느 옛 버전으로든 되돌리기. 되돌리기도 새 버전으로 기록된다(옛 버전은 절대 지워지지 않음).
- 단계 추가·삭제·수정·순서 변경이 아주 쉽고 자연스럽다.
- 두 버전을 단계 단위로 비교해 볼 수 있다.

**비목표** (사용자 결정: "다른 학생이 되돌리면 충분")
- 관리자 잠금, 사용자 차단, 승인제, 신고 기능
- 실시간 동시 편집
- 가이드 콘텐츠 자체 작성·구조 설계(재작성 세션 담당)

**실패 조건** (기술적으로 돌아가도 실패로 본다)
- 누가 고쳤는지 추적이 안 되는 버전이 생김
- 되돌리기가 기록을 덮어써서 옛 버전이 사라짐
- 단계 하나 옮기거나 끼워 넣는 데 마크다운 구분자(`---`)를 직접 다뤄야 함
- 다른 사람이 먼저 저장한 내용을 모르고 덮어씀

## 3. 다른 세션과의 분담 (2026-10-24 합의)

| 담당 | 범위 |
|---|---|
| 가이드 재작성 세션 | `src/lib/guide.ts`, `src/lib/guide-content.ts`, `src/content/guides/`, `src/components/guide/*`, `src/app/(nav)/guide/**` |
| 이 작업 (새 파일 위주) | `docs/18-supabase-guide-revisions.sql`, `src/lib/guide-wiki/*`, `src/components/guide-wiki/*`, `src/app/(nav)/guide-wiki/**`, `src/middleware.ts`(보호 라우트 추가), `src/components/shared/page-nav.tsx`(활성 판정 한 줄) |

재작성 세션이 설계 문서에 넣어 주기로 한 것:
- `getFragment(key)` — 조각 key → 저장소 원본 콘텐츠
- key → 그 조각을 쓰는 가이드 조합 목록(역색인)
- 결과 화면(guide-viewer)의 "고치기"·"기록" 링크 자리. href는 `/guide-wiki/<key>/edit`, `/guide-wiki/<key>/history`

**연결 순서**: 편집 단위는 "조각"이 유력하다(조각 하나를 고치면 그 조각을 쓰는 가이드 여러 곳이 함께 바뀜). 하지만 아직 확정되지 않았다. 그래서 편집 기능은 아래 4절의 **어댑터 경계** 뒤에서 완성한다. 실제 로더에 꽂는 일은 재작성 구조가 main에 올라온 뒤 한다. 그 전에는 개발용 샘플 조각 하나로 끝까지 동작을 확인한다.

## 4. 어댑터 경계

편집 기능이 아는 것은 이것뿐이다.

```ts
// src/lib/guide-wiki/types.ts
export type WikiStep = { id: string; body: string };  // body = 마크다운, 첫 줄 '# '/'## ' 헤딩이 단계 이름
export type WikiDoc = {
  key: string;             // 조각 key. ^[a-z0-9][a-z0-9-]{0,99}$
  title: string;           // 화면 표시용 이름
  steps: WikiStep[];       // 순서 있는 단계 목록 (1~50개)
  extra: unknown | null;   // 재작성 구조의 나머지 필드(예: 다음 단계 카드). 편집기는 건드리지 않고 다음 버전에 그대로 복사
};

// src/lib/guide-wiki/source.ts — 재작성 구조와 맞닿는 유일한 파일
export async function loadSourceDoc(key: string): Promise<WikiDoc | null>;  // 저장소 원본 → WikiDoc
export async function listUsages(key: string): Promise<{ label: string; href: string }[]>; // "이 내용은 가이드 N곳에 함께 쓰여요"

// src/lib/guide-wiki/read.ts — 재작성 세션 로더가 부를 함수
export async function getLatestDoc(key: string): Promise<WikiDoc | null>;  // DB 최신 버전 ?? 저장소 원본
```

- 연결 전 `source.ts`는 `src/lib/guide-wiki/dev-sample.ts`의 샘플 조각 하나(key `dev-sample`)만 돌려준다. 연결할 때 이 파일만 고친다.
- `dev-sample`은 `process.env.NODE_ENV !== 'production'`일 때만 존재한다. 운영 배포에서는 `notFound()`이다. Supabase는 운영 프로젝트 하나뿐이라 로컬 시험 버전도 운영 DB에 남는다. 시험이 끝나면 SQL 편집기에서 `DELETE FROM public.guide_revisions WHERE doc_key = 'dev-sample';`로 지운다(소유자 권한은 RLS를 우회). (내 결정)
- **한 화면에 조각이 여러 개일 수 있다**고 가정한다(내 결정). 모든 API는 key 하나 단위다. 결과 화면은 조각마다 `getDocMeta(key)`를 불러 조각별 "고치기" 링크를 단다. 편집기 링크는 `?from=<지금 가이드 경로>`를 붙이고, 저장·취소 후 `from`으로 돌아간다(`/guide`로 시작하는 경로만 허용, 없으면 기록 페이지). 재작성 세션에 전달함.
- 조각에 단계 개념이 없게 정해지면(본문 한 덩어리) `steps` 길이 1로 다룬다. 편집기는 그대로 쓸 수 있다.
- 단계 `id`는 버전 사이에서 같은 단계를 알아보는 데 쓴다(비교·이동 감지). 원본에서 처음 만들 때는 `s1`, `s2`…로 붙이고, 편집기에서 새로 만든 단계는 무작위 8자로 붙인다.

## 5. 데이터 (Supabase)

`docs/18-supabase-guide-revisions.sql` — 재실행 가능하게 작성한다(기존 SQL 파일 관례).

```sql
CREATE TABLE public.guide_revisions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_key       text NOT NULL CHECK (doc_key ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  rev_no        int  NOT NULL CHECK (rev_no >= 1),
  kind          text NOT NULL CHECK (kind IN ('seed','edit','revert','sync')),
  title         text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  steps         jsonb NOT NULL,   -- WikiStep[]
  extra         jsonb,
  summary       text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 100),
  base_rev      int,              -- 이 수정이 기준으로 삼은 버전 (seed는 NULL)
  revert_of     int,              -- kind='revert'일 때 되돌린 대상 버전
  stats         jsonb NOT NULL DEFAULT '{}'::jsonb, -- {added,removed,edited,moved,plus,minus}
  author_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  author_email  text NOT NULL,    -- 책임 추적용 스냅샷. 계정이 지워져도 남는다
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doc_key, rev_no)
);
CREATE INDEX guide_revisions_doc_idx ON public.guide_revisions (doc_key, rev_no DESC);
CREATE INDEX guide_revisions_author_idx ON public.guide_revisions (author_id);
```

- **RLS**: SELECT는 누구나(가이드처럼 비로그인도 기록을 볼 수 있음). INSERT·UPDATE·DELETE 정책은 **없다**. 직접 쓰기는 모두 막히고 아래 함수로만 저장된다. 버전은 한 번 쓰면 바뀌지 않는다.
- **저장 함수** `public.save_guide_revision(p_author_id uuid, p_doc_key, p_base_rev, p_kind, p_title, p_steps, p_extra, p_summary, p_revert_of, p_stats, p_seed jsonb)` — `SECURITY DEFINER`, `search_path` 고정. **EXECUTE는 `service_role`에만** 준다(`REVOKE ... FROM PUBLIC, anon, authenticated`). 학생 브라우저가 이 함수를 직접 부르면 zod 검증·stats 계산·`revert_of` 확인을 건너뛸 수 있기 때문이다. 서버 액션이 `getUser()`로 사용자를 확인한 뒤, 서비스 키 클라이언트(`SUPABASE_SERVICE_ROLE_KEY`, 이미 환경변수에 있음)로 `p_author_id`를 넘겨 부른다. 서비스 키 클라이언트는 `src/lib/guide-wiki/admin-client.ts`에 두고 `import "server-only"`로 막는다. (내 결정)
  1. `p_author_id`로 `users`에서 이메일을 읽는다. 없거나 `@ts.hs.kr`이 아니면 거부. `kind='revert'`면 `p_revert_of`가 그 문서에 있는 버전이고 최신보다 작은지 확인.
  2. `pg_advisory_xact_lock(hashtext('guide:' || p_doc_key))`로 같은 문서 저장을 줄 세운다.
  3. 그 문서의 버전이 하나도 없으면 먼저 `p_seed`(저장소 원본)를 `rev_no=1, kind='seed', summary='저장소 원본'`으로 넣는다. 작성자는 지금 저장하는 사람으로 기록한다(원본 행이 위조되더라도 책임자가 남게).
  4. 최신 `rev_no`가 `p_base_rev`와 다르면 `conflict` 오류(현재 최신 번호 포함)를 돌려준다.
  5. `rev_no = 최신+1`로 새 행을 넣고 그 번호를 돌려준다.
  6. 크기 검사: steps 1~50개, 단계 body 각 20,000자 이하, 전체 JSON 200KB 이하. kind는 `edit`·`revert`·`sync`만 받는다.
- **적용 방법(사용자 결정, 2026-10-24)**: 사용자가 SQL 편집기에서 실행하지 않는다. Claude가 연결된 Supabase CLI(`supabase/.temp/project-ref`로 이미 link됨)로 운영 프로젝트에 적용한다. `docs/18-…sql`이 source of truth이고, CLI 적용용 migration 파일은 같은 내용으로 둔다. 적용 전에 원격 migration 기록 상태를 먼저 확인한다(기존 `20260603085157_remote_schema.sql` 하나뿐).
- `types.generated.ts`는 SQL 적용 후 다시 생성한다. `src/lib/types.ts`에는 `GuideRevision` 타입을 손으로 추가한다.

## 6. 서버 액션 — `src/lib/guide-wiki/actions.ts`

`(nav)` 밖에 둔다(Turbopack 바인딩 문제, 기존 tips·haejwo와 같은 이유).

- `saveGuideEdit({ key, baseRev, title, steps, summary })`
  - zod 검증(5절 한도 + summary 1~100자, 앞뒤 공백 제거 후 빈 값 거부, 단계 id 중복 거부).
  - 직전 버전(없으면 원본)과 비교해 `stats`를 서버에서 계산한다.
  - 바뀐 게 하나도 없으면 저장하지 않고 "바뀐 점이 없어요"를 돌려준다.
  - `extra`는 클라이언트에서 받지 않고 서버가 직전 버전 값을 그대로 복사한다.
  - 원본이 처음 기록될 때를 위해 `loadSourceDoc(key)`를 `p_seed`로 넘긴다.
  - 성공 시 `revalidatePath('/guide', 'layout')`와 `/guide-wiki/<key>` 하위 경로를 갱신한다.
  - 반환: `{ revNo }` | `{ error }` | `{ conflict: { latestRev } }`.
- `revertGuide({ key, targetRev, baseRev, reason })` — 대상 버전의 title·steps·extra를 새 버전(`kind='revert'`, `revert_of=targetRev`, summary=reason)으로 저장한다. 지금 최신 버전으로 되돌리는 요청은 거부한다.
- `syncFromSource({ key, baseRev })` — 저장소 원본이 마지막 seed·sync 이후 바뀌었을 때, 그 원본을 새 버전(`kind='sync'`, summary='저장소 원본 가져오기')으로 저장한다(8절).

## 7. 화면

경로는 모두 `src/app/(nav)/guide-wiki/[key]/` 아래에 둔다. 헤더 내비게이션의 "나도 개발해볼래!"(purple)가 활성으로 보이게 `page-nav.tsx`의 판정에 `/guide-wiki/*`를 추가한다.

| 경로 | 보호 | 내용 |
|---|---|---|
| `/guide-wiki/[key]/edit` | 로그인 필요(미들웨어) | 편집기 |
| `/guide-wiki/[key]/history` | 공개 | 고친 기록 |
| `/guide-wiki/[key]/diff?from=a&to=b` | 공개 | 두 버전 비교(`from` 없으면 `to-1`) |
| `/guide-wiki/[key]/rev/[n]` | 공개 | 옛 버전 그대로 보기(+ "이 버전으로 되돌리기") |

모든 페이지는 `force-dynamic`이다(기록은 저장 즉시 보여야 함). key가 원본에도 없고 DB에도 없으면 `notFound()`를 돌려준다.

미들웨어: `/guide-wiki/<key>/edit`는 접두사 목록에 못 넣으므로 정규식 `^/guide-wiki/[^/]+/edit/?$`로 따로 검사한다.

### 7.1 편집기 (`GuideWikiEditor`, 시안 2-B)

- **머리**: "가이드로" 뒤로가기, "고치는 중 · 버전 N 기준", 제목(Plex), "이 내용은 가이드 N곳에 함께 쓰여요" 알약(`listUsages`, 0~1곳이면 숨김, 누르면 목록 팝오버).
- **단계 카드 세로 스택** (`max-w-3xl`)
  - 카드 머리 = 번호 타일 + 단계 이름(본문 첫 헤딩, 없으면 "제목 없는 단계") + 상태 칩("새 단계" emerald / "고침" zinc) + 위로·아래로·삭제 아이콘 버튼(각각 `aria-label`에 단계 이름 포함).
  - 머리를 누르면 펼침·접힘(`aria-expanded`). 한 번에 하나만 펼친다. 접힌 카드는 본문 첫 줄을 회색 한 줄로 보여 준다.
  - 펼친 카드 = "작성 / 나란히 / 미리보기" 탭(기본 나란히, `aria-pressed`). 작성 칸은 TipEditor와 같은 Tab 들여쓰기(Shift+Tab 해제). 미리보기는 실제 `Markdown` 컴포넌트를 쓴다. 나란히는 `sm:` 이상에서 좌우, 모바일에서는 위아래로 쌓는다.
  - 카드 사이와 맨 앞에 "+ 여기에 단계 넣기" 줄 버튼. 누르면 `## 새 단계\n\n`이 든 카드가 그 자리에 생기고 펼쳐지며, 작성 칸에 포커스가 간다.
  - 삭제: 원본에 있던 단계는 그 자리에 "~~이름~~ 단계를 지웠어요 [되돌리기]" 점선 칸으로 남는다. 새로 만든 단계는 바로 사라진다. 마지막 남은 단계는 지울 수 없다.
  - 이동 후에는 포커스가 옮긴 카드의 같은 버튼에 남는다(연속 이동 가능).
- **오른쪽 위 "전체 미리보기"** 토글: 저장 뒤 가이드처럼 모든 단계를 `Markdown`으로 이어 보여 준다. "편집으로 돌아가기"로 돌아온다.
- **아래 고정 저장 바** (`sticky bottom-0`, 모바일은 하단 탭바 위): "바뀐 점: 단계 1개 추가 · 1개 삭제 · 2개 수정 · 순서 바뀜" 실시간 요약 + "무엇을 고쳤나요?" 입력(필수, 100자) + 취소 + 저장하기(purple-600). 바뀐 게 없거나 요약이 비면 비활성이다.
- **저장 결과**
  - 성공: sonner 토스트 "버전 N으로 저장했어요"를 띄우고 `from` 경로(없으면 기록)로 이동한다.
  - 충돌: 저장 바 위에 경고를 띄운다. "편집을 시작한 뒤 ○○님이 버전 N을 저장했어요." 버튼은 둘이다. [그 사이 바뀐 점 보기](새 탭 diff) / [내 내용으로 저장](baseRev를 N으로 바꿔 다시 저장, 덮어쓰기 경고 문구 포함). 내 편집 내용은 그대로 둔다.
- 저장 안 한 변경이 있으면 페이지를 떠날 때 `beforeunload` 경고를 띄운다. 취소 버튼은 Dialog로 확인한다.
- 비로그인 사용자가 가이드에서 "고치기"를 누르면 미들웨어가 `/login?next=…`로 보낸다.

### 7.2 고친 기록 (`/history`)

- 머리: 제목 + "버전 N개 · 기여자 M명. 어느 버전으로든 되돌릴 수 있고, 되돌린 것도 새 버전으로 남아요."
- 최신순 목록(30개씩 "더 보기"). 행마다 표시하는 것:
  - `rN` 번호(mono), 작성자 아바타 + 닉네임(`/developers/[id]` 링크, 계정이 지워졌으면 "탈퇴한 사용자"), 상대 시각(`title`에 절대 시각)
  - 칩: "지금 보이는 버전", "버전 K로 되돌림"(kind=revert), "버전 R에서 되돌려짐", "저장소 원본"(seed/sync)
  - "되돌려짐" 규칙(내 결정): 버전 R이 버전 K로 되돌렸다면 **K+1부터 R−1까지 모든 버전**에 "버전 R에서 되돌려짐" 칩을 붙이고 요약에 취소선을 긋는다. 한 버전이 여러 번 무효가 됐으면 가장 나중 R을 보여 준다. 계산은 `diff.ts`의 순수 함수로, 건너뛴 되돌리기(5→2) 테스트를 포함한다.
  - 요약, 단계 변화("단계 1개 추가"), `+글자수` emerald / `−글자수` rose
  - 버튼: 보기(`/rev/n`) · 바뀐 점(`/diff?to=n`, seed 제외) · 이 버전으로 되돌리기(최신 행 제외, 로그인 필요)
- **되돌리기 Dialog**: "버전 K로 되돌릴까요?"를 묻고 "지금 내용(버전 N)은 지워지지 않아요. 버전 K의 내용이 새 버전 N+1로 저장되고, 기록에 내 이름으로 남아요."라고 안내한다. "왜 되돌리나요?" 입력은 필수다. 비로그인 사용자가 누르면 로그인으로 보낸다.

### 7.3 두 버전 비교 (`/diff`)

- 머리: "버전 a → 버전 b에서 바뀐 점" + 작성자 카드(아바타, 닉네임, 절대 시각, **학교 이메일**, 요약) + "이 버전으로 되돌리기".
- 요약 칩: + 단계 n개 추가 / n개 수정 / ↕ n개 이동 / 변경 없는 n개 접힘.
- 단계는 `id`로 짝을 짓고 b의 순서대로 보여 준다(삭제된 단계는 a에 있던 자리 근처에).
  - 변경 없음: 접힌 한 줄(펼치기 가능)
  - 수정: 줄 단위 diff. 삭제 줄은 rose 배경 + `−`, 추가 줄은 emerald 배경 + `+`. 색만으로 구분하지 않게 기호와 `aria-label`을 같이 단다.
  - 새 단계: emerald 테두리 카드에 전체 줄을 `+`로
  - 삭제된 단계: rose 점선 카드에 이름 취소선(펼치면 전체 줄을 `−`로)
  - 이동: "↕ 3단계 → 4단계로 이동" 칩(내용도 바뀌었으면 diff도 같이)
- 아래: ← 이전 변경 / 다음 변경 →
- 줄 diff는 `diff`(jsdiff) 패키지의 `diffLines`를 쓴다. 계산은 서버 컴포넌트에서 한다(클라이언트 번들에 안 실림).

### 7.4 옛 버전 보기 (`/rev/[n]`)

- 상단 띠: "버전 n · 작성자 · 시각 — 지금 보이는 버전이 아니에요"(최신이면 띠 없음). 오른쪽에 [이 버전으로 되돌리기] [지금 버전과 비교].
- 본문: 단계를 모두 `Markdown`으로 이어서 보여 준다(전체 미리보기와 같은 컴포넌트).

### 7.5 가이드 결과 화면에 들어갈 것 (재작성 세션이 자리를 남김)

- 단계 위 오른쪽: "이 가이드 고치기"(Pencil) · "기록"(History) ghost 버튼
- 단계 카드 아래: "마지막으로 ○○님이 고침 · 3일 전 · 버전 N · 기여자 M명"(기록 링크)
- 이 데이터를 주는 함수: `getDocMeta(key): Promise<{ latestRev; lastAuthor; lastAt; contributors } | null>`(`read.ts`)

## 8. 저장소 원본이 나중에 바뀌면 (내 결정)

DB에 버전이 생긴 뒤에는 **DB 최신 버전이 이긴다**. 개발자가 저장소 md를 고쳐도 자동으로 덮어쓰지 않는다(학생이 고친 내용이 사라지면 안 됨).

대신 원본의 해시를 seed·sync 행의 `stats.sourceHash`에 저장해 둔다. 지금 원본의 해시가 다르면 편집기와 기록 페이지에 안내 띠를 띄운다. "저장소 원본이 새로 바뀌었어요 [바뀐 점 보기] [원본 가져오기]". 가져오기는 `kind='sync'` 새 버전이라 이것도 되돌릴 수 있다.

## 9. 접근성·스타일 규칙 (CLAUDE.md 따름)

- 선택·펼침 상태는 무채색(zinc-900 테두리/반전)이다. 보라(purple-600)는 저장하기·되돌리기 확정 버튼과 단계 번호 강조에만 쓴다.
- 카드 `rounded-[20px]`, 글 미리보기 카드 `rounded-3xl`이다. 다크모드에서 긴 글은 zinc-900 카드 안에 넣는다(본문 zinc-300).
- 모든 아이콘 버튼에 한국어 `aria-label`을 단다. 장식 아이콘은 `aria-hidden`. `transition-all`은 쓰지 않는다. hover 확대도 쓰지 않는다.
- 모바일 좌우 여백 `px-6`이다. 저장 바는 `MobileNav`(56px) 위에 붙인다. 터치 대상은 44px 이상이다.
- 로딩 문구는 `…`를 쓴다. 카피는 해요체다.

## 10. 확인 방법

- `npx tsc --noEmit` 에러 0, `npm run lint` 통과
- `dev-sample` 조각으로 수동 시나리오:
  1. 비로그인 → 편집 진입 시 로그인으로 이동, 기록·비교는 열림
  2. 단계 추가·삭제(되돌리기 포함)·이동·수정 후 저장 → 버전 2(seed=1) 생성, 바뀐 점 요약이 맞음
  3. 두 창에서 같은 버전 기준으로 편집 → 두 번째 저장이 충돌 안내를 받음
  4. 기록에서 버전 1로 되돌리기 → 버전 3 생성, 칩 "버전 1로 되돌림"·"버전 2에서 되돌려짐" 표시
  5. 비교 화면에서 추가·삭제·이동·수정이 각각 맞게 보임
  6. Supabase에서 `guide_revisions`에 직접 INSERT/UPDATE/DELETE가 거부됨
  7. 모바일 폭(390px)과 다크모드 확인
- `diff` 계산·stats 계산은 순수 함수(`src/lib/guide-wiki/diff.ts`)로 분리하고 간단한 테스트를 둔다. 테스트 러너가 없으면 `npx tsx`로 도는 assert 스크립트를 `scripts/`에 둔다.

## 11. 빌더에게 맡기는 것

- 컴포넌트 세부 분할, 상태 관리 방식(useReducer 권장)
- 새 단계 id 생성 방식(8자 무작위면 충분)
- 기록 페이지 "더 보기"의 페이지네이션 방식
- CLAUDE.md·AGENTS.md 갱신 문구(기능 섹션 1개 추가, 보호 라우트·SQL 적용 안내 포함)
