---
paths:
  - "src/components/shared/page-nav.tsx"
  - "src/components/shared/site-header.tsx"
  - "src/components/shared/announcements-link.tsx"
  - "src/components/community/**"
  - "src/app/**/layout.tsx"
  - "src/app/page.tsx"
  - "src/lib/section-colors.ts"
---

# 전역 내비게이션

> CLAUDE.md에서 옮겨 온 기능 문서(2026-11-02). 위 경로의 파일을 열면 자동으로 불러온다. 이 기능의 결정·변경 사항은 이 파일에 적는다.

## 🧭 전역 페이지 내비게이션 (`PageNav` / `MobileNav`)

- 파일: `src/components/shared/page-nav.tsx` (`"use client"`, 두 컴포넌트 모두 export)
- **5개 항목**(2026-10-24 6칸에서 병합해 4칸 → 2026-10-25 "도메인 마련하기" 추가): 모든 프로젝트(→ `/explore`), 프로젝트 등록(→ `/projects/new`), 나도 개발해볼래!(→ `/guide`), **도메인 마련하기(→ `/domains`, teal-700)**, **커뮤니티(→ `/tips`)**. 커뮤니티 = 개발 팁 + 해줘!(URL은 `/tips`·`/haejwo` 그대로, 두 목록 사이는 `CommunityTabs`로 오감). **공지사항은 내비 칸이 아니라 헤더 오른쪽 벨 아이콘**(`src/components/shared/announcements-link.tsx`, 프로필 옆, 글자·안 읽음 점 없음, 모바일 포함).
- **미리 받기는 마우스를 올릴 때만**(2026-11-04): 예전엔 모든 Link가 `prefetch={true}`(화면에 보이면 미리 받기)였는데 페이지마다 요청이 25~30개라 학교 IP가 속도 제한(100회/10초)에 걸렸다. 지금은 사이트 공용 `Link`(`src/components/shared/link.tsx`)가 hover·터치·포커스 때만 `router.prefetch` — 「성능」 문서 참고. **단, 메뉴 5칸(`PageNav`·`MobileNav`)은 `prefetchOnView`로 화면에 보일 때 미리 받는다**(2026-11-05) — 무료 Cloudflare는 한국 접속이 LA를 거쳐 왕복 1~2초라 폰에서 메뉴를 누를 때마다 멈췄다. 동적 페이지는 `loading.tsx` 뼈대까지만(각 3KB 이하), 비로그인은 `/projects/new`·`/domains`가 `/login` 리다이렉트까지 받아 첫 화면 RSC 8개, 이동 뒤엔 라우터 캐시라 거의 다시 안 받음(로컬 `next start` 실측).
- **활성 버튼 판정**:
  - `/explore`, `/projects/*`(등록·수정 제외), `/developers/*` → "모든 프로젝트"
  - `/projects/new`, `*/edit` → "프로젝트 등록"
  - `/guide/*` → "나도 개발해볼래!"
  - `/tips/*`, `/haejwo/*` → "커뮤니티" (활성 키는 `href`인 `"/tips"` — `useOptimisticActive`가 href로 비교)
  - `/announcements/*` → 내비 알약은 모두 꺼지고 헤더 벨이 활성(`SECTION_COLORS.announcements.chip` 연한 sky + `aria-current`)
- **버튼별 고유 색**: `src/lib/section-colors.ts`의 `SECTION_COLORS`에서 가져온다 — 모든 프로젝트=blue-600, 프로젝트 등록=emerald-700, 나도 개발해볼래!=purple-600, **커뮤니티=화면 따라 바뀜: `/tips*`=tip-600(분홍 `#db2777`, `globals.css` `@theme`의 `--color-tip-*` 커스텀 토큰), `/haejwo*`=orange-700**(`pillFor()`, PC 알약은 `background-color`도 transition). 같은 맵이 페이지 머리 타일·주 버튼·활성 칩에도 쓰인다(`tips`·`haejwo`·`announcements` 키는 합치지 않음).
- **커뮤니티 탭 도구줄** (`src/components/community/community-tabs.tsx`, 서버 컴포넌트, `current` prop): `/tips`·`/haejwo` 목록의 머리(`PageHero`) 아래 `main` 맨 위 한 줄 — 왼쪽 탭(개발 팁 | 해줘!, 활성은 섹션 색 칩), 오른쪽은 팁 개수 / 해줘! 상태 세그먼트. `flex-wrap`이라 모바일에선 오른쪽 요소가 아래 줄로. ISR 유지를 위해 탭은 `usePathname`을 안 쓴다. 로딩 뼈대는 `ListPageSkeleton community="count"|"segment"`.

### 데스크탑 (`PageNav`, `sm:` 이상)
- `SiteHeader` 로고 우측에 얇은 구분선(`hidden sm:block w-px h-5`)으로 분리하여 인라인 배치. `<div className="hidden sm:block">` 래퍼로 모바일에서 완전히 숨김.
- **슬라이딩 pill 애니메이션**: `absolute` pill 하나가 활성 버튼 위치로 부드럽게 이동·확장(`transition-all duration-300 ease-out`). `useRef` 배열 + `useEffect`로 활성 항목의 `offsetLeft`/`offsetWidth`를 읽어 `translateX` + `width` 적용.
- **라벨 펼침**: 활성 버튼만 라벨 텍스트 노출, 비활성은 **아이콘만**. 전환 시 부드럽게 slide-in/out.
- **너비 통일**: 모든 버튼 `min-w-9 justify-center` → 비활성 아이콘 크기 균일.

### 모바일 (`MobileNav`, `sm:` 미만)
- **`(nav)/layout.tsx` DOM 최하단**에 `<SiteHeader>` 및 콘텐츠와 분리된 독립 컴포넌트로 배치. 헤더 CSS stacking context 영향 없음.
- `fixed bottom-0 inset-x-0 z-50 flex sm:hidden` — 뷰포트 바닥에 고정.
- **아이콘 전용** (`h-5 w-5`). 활성 항목은 `h-9 w-9 rounded-full` **원형 컬러 배경 + 흰색 아이콘**, 비활성은 배경 없이 zinc 아이콘.
- 모바일 헤더: 로고(아이콘 + 2줄 텍스트) + 공지 벨 + 프로필만 표시(간격 `gap-1`). 다크모드 토글은 폭이 모자라 모바일에선 숨기고 **프로필 드롭다운의 "다크/라이트 모드로 전환" 항목**으로 옮겼다(`auth-buttons.tsx`, matchMedia로 모바일일 때만 렌더 — `sm:hidden` 항목은 데스크탑 화살표 이동에 걸릴 수 있어서). 비로그인 모바일은 토글 없이 시스템 테마. 로고 텍스트는 1줄 "DSHS Developer Platform"(`text-[15px] sm:text-[17px]`, `font-heading` — 360px 비로그인에서 벨에 붙지 않게 모바일 15px, 헤더 두 묶음 사이 `gap-2`) + 2줄 읽는 이름 "대곽 개발자 플랫폼"(`text-[11px]` zinc-600). 공식 이름은 영문(도메인 dshs.dev·옛 dshs-developer-platform.vercel.app과 일치)이고 한글은 부르는 이름일 뿐이라 탭 제목·푸터는 영문만 쓴다.
- **로고 정렬**: 아이콘은 `<Image width={32} height={32} className="block ...">` (fill 미사용 — inline baseline 문제 방지). 텍스트는 `<span>` 2줄 세로 스택(`flex flex-col gap-px`, 각 줄 `leading-[1.1]`), Link의 `items-center`로 아이콘과 중앙 정렬.
- `(nav)/layout.tsx`에서 콘텐츠를 `<div className="pb-16 sm:pb-0">` 로 감싸 탭바(56px)에 가려지지 않도록 여백 확보.

### 적용 방법
- `SiteHeader`에 `showNav` prop → `<SiteHeader showNav />`. 로그인 계열(`AuthShell`)은 미적용. **홈(`/`)도 2026-10-25 사용자 요청으로 적용**: `<SiteHeader variant="transparent" maxWidth="md" showNav />` + 푸터를 `pb-16 sm:pb-0` 래퍼로 감싸고 맨 아래에 `<MobileNav />`(홈은 `(nav)` 레이아웃 밖이라 직접 둠). 홈에서는 활성 항목이 없어 슬라이딩 알약이 숨고 아이콘만 보인다. 이유: 모바일 홈에 메뉴가 전혀 없었고 메뉴가 5칸으로 늘어 가이드·도메인 마련하기·커뮤니티가 푸터까지 내려가야 보였음.
- `(nav)/layout.tsx`: `<SiteHeader showNav />` + 콘텐츠 래퍼 + `<SiteFooter />`(`pb-16 sm:pb-0` 래퍼) + `<MobileNav />` 순서로 배치.
