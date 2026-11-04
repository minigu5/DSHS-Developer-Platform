---
paths:
  - "src/app/page.tsx"
  - "src/components/home/**"
---

# 홈 페이지

> CLAUDE.md에서 옮겨 온 기능 문서(2026-11-02). 위 경로의 파일을 열면 자동으로 불러온다. 이 기능의 결정·변경 사항은 이 파일에 적는다.

### 홈 페이지 CTA 프리패치 — `src/app/page.tsx`
- 홈은 2026-10-25부터 `PageNav`·`MobileNav`가 있지만(`nav.md` 「적용 방법」), CTA 링크도 다른 링크처럼 마우스를 올릴 때만 미리 받는다(2026-11-04 `prefetch={true}` 제거 — `performance.md` 「링크 미리 받기」).
- **홈 구성** (2026-10-24 리뉴얼, 같은 날 세로 길이 보강): 히어로(모눈종이 배경 `.paper-grid`, **가운데 정렬 세로 스택** — 큰 2줄 제목 "발견하고, 공유하고, / 만들어요."(2줄째만 단색 blue-600) → 설명 → 알약형 CTA 2개 → **아이콘 나열**) → "최근 올라온 프로젝트"(공개 6개, `HomeProjectCard`) → "이렇게 써요"(zinc-50 띠, `HowItWorks`) → "요즘 올라온 글"(`RecentPosts`) → "직접 만들어 보고 싶다면"(zinc-50 띠, `GuideTeaser` + 아래 `DomainTeaser`) → "다음 아이콘은 내 프로젝트로."(`ClosingCta`) → 푸터(`SiteFooter`, `(nav)` 페이지 전체와 공통). 가운데 정렬 단일 컬럼이라 모바일에서도 구조가 같다 — 데스크탑 좌우 분할(텍스트 | 장식)은 모바일에서 장식이 쪼그라들어 사용자가 거부함(2026-10-23). 헤드라인에 프로젝트 개수는 넣지 않는다(수가 적을 때 빈약해 보임). 그라디언트 글자·블롭·환영 배지는 옛 히어로 구조를 되살릴 때도 쓰지 않는다. 통계 띠("프로젝트 N개")·리뷰 인용 섹션은 콘텐츠가 적어 보류, "프로젝트 말고도" 4열 메뉴 카드는 2026-10-24 제거(사용자 결정 — 역할을 "요즘 올라온 글"·푸터가 대신함). 홈은 모바일 좌우 여백 `px-6`(24px).
- **홈 섹션 공통 머리** (`src/components/home/section-header.tsx`): 제목(`font-heading`) + 한 줄 설명 + 오른쪽 "전체 보기"(선택). 새 홈 섹션은 모두 이 패턴.
- **홈 전용 프로젝트 카드** (`src/components/home/home-project-card.tsx`): 홈의 다른 섹션 카드와 같은 20px 모서리·테두리·그림자 없음·hover 테두리 진해짐. 카드 전체가 링크라 작성자는 링크 없이 표시. 탐색·프로필의 `ProjectCard`(24px, shadow-sm)와 별개 — 사용자가 홈만 통일하기로 함(2026-10-24).
- **이렇게 써요** (`how-it-works.tsx`): 올리기 → 리뷰 → 해줘 3단계 카드. 각 칸 아래 실제 최근 예시 한 줄(가장 최근 공개 프로젝트 / 공개 프로젝트의 최근 리뷰 1개(`reviews` + `projects!inner`, `visibility=public`) / 최근 해줘 1개), 없으면 안내 문구. 한국어 조사(이/가·을/를) 붙이지 말고 `제목 · 작성자 · 종류`처럼 점 구분으로.
- **요즘 올라온 글** (`recent-posts.tsx`): 개발 팁(최근 3, `tips_author_id_fkey`) · 해줘!(최근 3, `ideas_author_id_fkey`) · 공지(티커용 10개 중 앞 4개, 고정 우선) 세 칸. 비면 "첫 글 쓰기" 안내가 칸 하단 점선 위에. 공지 카테고리 색은 티커와 동일.
- **직접 만들어 보고 싶다면** (`guide-teaser.tsx`): 가이드 위저드 첫 질문(`GUIDE_STEPS[0]`, 옵션 4개: 웹사이트·앱·확장프로그램·그 밖의 도구)을 홈에 그대로 노출. 옵션 클릭 시 `/guide?type=<value>` — `GuideWizard`가 `initialType` prop으로 첫 질문을 미리 답한 상태로 시작, `/guide/page.tsx`가 `searchParams.type`을 넘김.
- **도메인 마련하기 소개** (`domain-teaser.tsx`, 2026-10-25 사용자 요청 — 새 기능 홍보): 같은 띠에서 `GuideTeaser` 바로 아래 같은 모양 카드(teal `SECTION_COLORS.domains`). 왼쪽 `Globe` 타일 + "웹사이트를 올렸다면, 짧은 주소도 무료로 받아요" + 설명(등록한 웹사이트 프로젝트·계정당 3개) + teal 주 버튼 "도메인 마련하기"(`/domains`, 비로그인은 로그인 화면). 오른쪽은 주소창 모양 예시 `https://omm.dshs.dev` + 3단계(이름 정하기 → 호스트에 등록 → 연결 확인, `DomainSteps`와 같은 순서). **사용 현황 줄**(2026-10-26 사용자 요청 — 홍보용, 시안 B): 카드 맨 아래 `border-t` 줄에 "벌써 N개 사이트가 무료 주소로 열려요" + 최근 연결된 주소 칩(`이름.dshs.dev`, 눌러 그 프로젝트 상세로, 데스크탑 6개·모바일 3개 + "외 N개"). 제목에도 "무료"가 들어감. 장식 점·알약·teal 띤 바탕은 쓰지 않음(사용자: 점이 "클로드가 디자인한 것 같다") — 칩은 프로젝트 카드 플랫폼 칩과 같은 `bg-zinc-100` 알약. 데이터는 DB 함수 `domain_showcase(p_limit)`(SECURITY DEFINER, anon·authenticated 실행 가능, migration `20261101100000`)를 브라우저가 부른다 — `status=active` + 프로젝트 `visibility=public`만 세고 읽는다(2026-11-01 전엔 서버가 서비스 키로 `getDomainShowcase()`)(비공개 프로젝트는 숫자에도 안 셈, 목록 RLS는 그대로). 실패하면 null → 줄만 조용히 빠짐. **연결된 주소가 3개 미만이면 줄을 숨긴다**(`SHOWCASE_MIN`, "벌써 1개"는 오히려 휑해 보여서 — 2026-10-26 운영 DB는 active 1개). 개인정보 처리방침 문구는 안 바꿈(공개 프로젝트 정보라 새 수집 아님 — 바꾸면 전원 재동의).
- **마무리 CTA** (`closing-cta.tsx`): 어두운 단색 카드(라이트 zinc-900 / 다크는 반전 zinc-100) + 아이콘 나열 상위 3개 미니 타일 + "내 프로젝트 등록하기"(blue-600)·"만드는 법부터 보기".
- **푸터** (`site-footer.tsx`): 소개 한 줄 + 메뉴 3열(둘러보기/만들기(도메인 마련하기 포함)/이 사이트: GitHub 저장소·이슈·마이페이지·개인정보 처리방침) + 저작권·로그인 안내. 홈(`src/app/page.tsx`)과 `(nav)/layout.tsx`(콘텐츠 아래, 모바일 탭바에 안 가리게 `pb-16 sm:pb-0` 래퍼 안)에서 같은 컴포넌트를 쓴다 — 모든 `(nav)` 페이지에 동일하게 나옴(2026-10-24 사용자 요청). 로그인 계열(`AuthShell`) 독립 화면에는 없음.
- **아이콘 나열** (`src/components/home/icon-shelf.tsx`): 사이트의 개성을 담당하는 장식 요소. 공개 프로젝트를 **많이 찾는 순**(`click_count` desc, 동률이면 최신 등록) `SHELF_LIMIT`(11)개 + "내 앱 올리기" 칸을 72px(sm 80px) `rounded-[22%]` 아이콘 스티커로 가운데 flex-wrap. 흰 `ring-[3px]`(다크 zinc-950) + 중립 그림자. 이름은 안 보이고 `aria-label`·`title`로만. 모바일(72px, 간격 14px)에서 4칸씩 3줄.
- **로딩 시퀀스** (`globals.css`): 페이지 로드 때 한 번만. 제목·설명·버튼 `.rise`(`--rise-delay` 0/90/180ms) → 아이콘 `.tile-pop`(`--pop-delay` 260ms부터 65ms 간격) → "내 앱 올리기" 칸 `.tile-invite`가 파란 테두리·배경으로 3번 깜빡임(다크는 `tile-invite-dark`). 동작 줄이기 설정이면 전역 규칙이 duration과 **delay**를 0으로 만들어 즉시 표시(delay를 안 지우면 `fill: both` 요소가 지연 동안 안 보이는 버그가 있었음).
- **스크롤 리빌** (`src/components/home/reveal-observer.tsx` + `globals.css` `.reveal`, 2026-10-24 사용자 요청): 히어로 아래 모든 섹션(`SectionHeader`·카드·`GuideTeaser`·`ClosingCta`)이 뷰포트에 15% 들어오면 한 번 올라오며 나타남(opacity 0→1, translate 28px, scale .97, 600ms). `RevealObserver`(클라이언트, UI 없음)가 마운트 시 `<html>`에 `reveal-ready`를 붙이고 IntersectionObserver로 `.is-in`을 추가 — `reveal-ready` 전에는 숨기지 않아 JS가 없어도 내용이 보임. 같은 줄 카드는 `revealOrder(n)`(`--reveal-delay` n×90ms)로 차례. 동작 줄이기면 관찰 없이 전부 `.is-in`. 처음엔 CSS `animation-timeline: view()`로 했으나 로드 때 이미 보이는 섹션은 안 움직이고 Safari/Firefox 지원이 갈려 교체함.
- **CTA 버튼 2개**: "프로젝트 둘러보기"(`/explore`) + "내 프로젝트 등록하기"(`/projects/new`). hover 확대 효과 없음.
- **홈 섹션 너비 통일**: 모든 섹션이 동일한 구조 — `<section class="px-6">` + `<div class="max-w-5xl mx-auto">` 내부 wrapper(홈은 모바일도 24px 여백). `max-w-5xl mx-auto`를 section에 직접 쓰면 padding이 max-width 안에서 소비돼 실제 콘텐츠 너비가 달라지는 문제 방지.
