---
paths:
  - "next.config.ts"
  - "src/app/layout.tsx"
  - "src/app/api/**"
  - "src/middleware.ts"
  - "src/components/shared/image-upload-input.tsx"
  - "src/lib/cloudinary*.ts"
  - "src/lib/parse-image-url.ts"
  - "src/app/**/projects/**"
---

# 성능 설정(next.config·이미지·API 캐시·preconnect)

> CLAUDE.md에서 옮겨 온 기능 문서(2026-11-02). 위 경로의 파일을 열면 자동으로 불러온다. 이 기능의 결정·변경 사항은 이 파일에 적는다.

## ⚡ 성능 최적화 적용 내역

### 미들웨어 온보딩 쿠키 캐시 (`src/middleware.ts`)
- 문제: 로그인된 사용자의 **모든 페이지 이동마다** Supabase DB에 닉네임 확인 쿼리 발생.
- 해결: 닉네임 확인 성공 시 `ds_onboarded=1` 쿠키(30일)를 발급. 이후 요청은 DB 쿼리 없이 쿠키만 확인.

### 프로젝트 상세 쿼리 병렬화 (`src/app/(nav)/projects/[id]/(detail)/page.tsx`)
- 문제: `project` → `user` → `reviews` 쿼리가 직렬 실행.
- 해결: `Promise.all`로 3개 쿼리 동시 실행.

### Router Cache (클라이언트 캐시) — `next.config.ts`
- Next.js 15+에서 `staleTimes.dynamic` 기본값이 `0`으로 바뀌어 `force-dynamic` 페이지가 매 이동마다 서버 요청을 발생시키는 문제 해결.
- `experimental.staleTimes: { dynamic: 30, static: 180 }` 설정으로 동적 페이지도 클라이언트 Router Cache에 30초, 정적 페이지는 3분간 캐시.
- Router Cache는 클라이언트·사용자별 독립 저장소이므로 RLS 우회 없음. 서버 액션의 `revalidatePath()` 호출 시 관련 캐시 항목은 자동 무효화됨.

### Cloudinary 이미지 업로드 (`src/app/api/upload/route.ts`)
- 프로필 아바타 · 프로젝트 아이콘 · 팁 커버 이미지를 사이트 내에서 직접 업로드.
- 공용 컴포넌트: `src/components/shared/image-upload-input.tsx` — 파일 드래그·선택 드롭존 + URL 직접 입력 폴백.
- 서버: `POST /api/upload` — 로그인 검증 후 Cloudinary에 업로드, `secure_url` 반환. 최대 10MB, 이미지 포맷만 허용.
- 자동 압축: `quality: "auto:good"`, `fetch_format: "auto"` 변환 적용. **SVG는 변환 없이 SVG 그대로 저장**(2026-11-05) — `fetch_format: auto`가 SVG 자체 크기(아이콘은 보통 24px)의 PNG로 바꿔 상세 112px 아이콘이 흐렸다. `<img>`로만 보여 주므로 SVG 속 스크립트는 실행 안 됨, `.svg`는 `isExternalImage`로 `unoptimized`.
- 환경변수 3개 필요: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (Cloudflare에는 `wrangler secret put`으로 설정).
- `src/lib/parse-image-url.ts`와 `GET /api/resolve-image`는 기존 imgbb URL을 위해 유지.

### 이미지 포맷 최적화 — `next.config.ts`
- `images.formats: ['image/avif', 'image/webp']` 설정으로 브라우저 지원 시 AVIF(WebP 대비 ~50% 작음) → WebP 순으로 자동 변환 제공.
- `images.remotePatterns`에 `i.ibb.co`, `ibb.co`, `res.cloudinary.com` 추가 → 각 이미지 소스도 Next.js 이미지 최적화 파이프라인 적용 가능.
- 실제로 최적화를 거치는 건 `isExternalImage`(`src/lib/utils.ts`)의 `ALLOWED_IMAGE_HOSTS`(지금 `i.ibb.co`만)·Supabase·로컬 이미지뿐, 나머지는 `unoptimized`. **구글·GitHub 프로필 사진은 2026-11-05에 뺐다** — 원본이 이미 작고(구글 `=s96-c`) 서울 CDN인데 `/_next/image`를 거치면 장마다 Worker(LA 경유) 1.6~2초에 `fill`+`sizes` 없음이라 `w=1920`으로 불렀다.

### 패키지 import 최적화 — `next.config.ts`
- `experimental.optimizePackageImports: ['lucide-react', 'date-fns']` 설정.
- lucide-react는 1000개 이상의 아이콘을 포함하나 이 설정으로 실제 사용하는 아이콘만 번들에 포함됨 (JS 크기 대폭 감소).

### API 라우트 캐시 헤더
- `/api/favicon`: `Cache-Control: public, s-maxage=86400, stale-while-revalidate=3600` — 엣지에서 1일 캐시, 이후 1시간 stale 허용.
- `/api/resolve-image`: 동일한 캐시 헤더 추가 (기존엔 없었음). ibb.co URL 변환 결과를 엣지에 캐시해 반복 요청 제거.

### preconnect / dns-prefetch — `src/app/layout.tsx`
- `<link rel="preconnect" href="https://aclcleemnsmxyixcfqro.supabase.co" />` — 모든 페이지 요청 전 Supabase DNS·TCP·TLS 핸드셰이크를 미리 수행.
- `<link rel="preconnect" href="https://lh3.googleusercontent.com" />` — 구글 프로필 사진 도메인 사전 준비.
- `<link rel="dns-prefetch" />` — preconnect 미지원 구형 브라우저 대응.

### 정적 파일은 pages.dev에서 (2026-11-06)
- 문제: 새 브라우저로 홈에 처음 들어오면 HTML은 1.1초인데 `/_next/static` JS 20개를 dshs.dev(LA)에서 다 받는 데 **13.7초**(KT → Cloudflare 무료 = LAX, `lesson-lax-network-slow` 메모). `*.pages.dev`는 같은 회선에서 서울(ICN) 응답.
- `npm run deploy` = `scripts/deploy.sh`(Workers Builds도 이걸 돈다): `ASSET_PREFIX=https://d<UTC시각>.dshs-assets.pages.dev`로 OpenNext 빌드(`next.config.ts` `assetPrefix`) → `.open-next/assets/_next/static`을 Pages 프로젝트 `dshs-assets`(계정 370e521d…, `wrangler pages project create … --force`로 만듦 — `--force` 없으면 wrangler 4가 Workers로 넘겨 workers.dev=LAX)의 **배포마다 새 브랜치**에 올리고(옛 화면이 옛 파일을 찾아도 404 없음) 한 파일이 열리는지 확인 → 실패하면 접두사 없이 다시 빌드(예전처럼 Worker가 줌). `_headers`로 `Access-Control-Allow-Origin: *`(CSS 속 글꼴)·1년 immutable.
- 사이트 주소·HTML·RSC·API·`public/` 파일·`/_next/image`는 그대로 dshs.dev. 영화대교·대곽나루와 같은 방식.
- 운영 HTML의 `<script src>`가 `dshs-assets.pages.dev`인지로 켜졌는지 확인한다(안 켜지면 조용히 예전 방식). 필요한 대시보드 설정(2026-11-06 완료): Workers Builds Build command 비움 + Deploy command `npm run deploy`, 빌드 토큰("dorm-network-check build token" — dshs가 같이 씀)에 Account · Cloudflare Pages · Edit. 확인은 빌드 로그의 "Executing user deploy command" 줄.

### 요청 수 줄이기 — Cloudflare 속도 제한(2026-11-04)
- 문제: 사용자가 Cloudflare에 IP당 속도 제한(사용자는 100회로 기억했으나 실제 200회/10초)을 걸어 뒀는데 학교는 IP 하나라 자주 걸렸다. 실측(로그아웃, 첫 방문): 10초 안에 dshs.dev 요청 131개 — 글꼴 103·스크립트 17·RSC 미리 받기 ~30. 두 번째 페이지부터도 ~33개(대부분 미리 받기 = Worker 호출이라 CPU 10ms 한도도 같이 씀).
- **제목 글꼴 직접 두기** (`src/app/layout.tsx`, `src/app/fonts/`): `next/font/google`의 `IBM_Plex_Sans_KR`은 한글이 조각 ~100개(unicode-range)로 나뉘어 있고 제목 글자가 거의 모든 조각에 흩어져 preload를 꺼도 ~100개를 받았다. 지금은 `next/font/local`로 600·700 woff2 2개(각 ~270KB, 라이선스 `IBMPlexSansKR-OFL.txt`). 한글은 KS X 1001 완성형 2,350자만 — 빠진 글자는 `--font-heading`의 다음 글꼴(Apple SD Gothic Neo 등)로 보인다.
  - **2026-11-05부터 Supabase 저장소에서 받는다**: `next/font/local`을 빼고 `globals.css`의 `@font-face`(이름 `IBM Plex Sans KR Subset`, `:root --font-plex-kr`)가 공개 버킷 `static`의 `fonts/v1/IBMPlexSansKR-{SemiBold,Bold}.woff2`를 가리킨다(원본은 그대로 `src/app/fonts/`). 이유: KT 접속은 dshs.dev가 LA를 거쳐 이 파일이 7~14초, Supabase는 서울(ICN) CDN이라 0.1~0.3초·`public, max-age=31536000`·`access-control-allow-origin: *`. 버킷은 `font/woff2`만·1MB 제한, 서비스 키로 Storage API에 올렸다(`cache-control: max-age=31536000` 헤더). **파일을 바꾸면 `fonts/v2/`로 새로 올리고 `globals.css` 주소를 바꿀 것**(1년 캐시라 덮어쓰면 안 바뀜). Supabase는 이미 위탁 업체라 처리방침 변경 없음. **본문 영문 글꼴 Geist·Geist Mono도 같은 날 옮겼다**: `next/font/google`을 빼고 그것이 만들던 woff2 11개(latin·latin-ext·cyrillic(-ext)·vietnamese, Mono는 symbols까지)를 같은 unicode-range로 `fonts/v1/geist-*.woff2`·`geist-mono-*.woff2`에 올렸다. `Geist Fallback`·`Geist Mono Fallback`(Arial 보정값)도 next/font 값 그대로 `globals.css`에 두고, `:root`에서 `--font-geist-sans`·`--font-geist-mono`를 정한다. `layout.tsx`가 `geist-latin.woff2`만 preload(next/font가 하던 것). 브라우저는 화면에 쓰인 범위의 파일만 받는다(보통 latin 1개, 29KB). `layout.tsx`의 Supabase preconnect에 `crossOrigin="anonymous"`를 붙였다 — 글꼴·`fetch`는 CORS 요청이라 없으면 미리 연 연결을 못 쓴다.
  - 다시 만들기: google/fonts `ofl/ibmplexsanskr/IBMPlexSansKR-{SemiBold,Bold}.ttf`를 받아 EUC-KR `0xB0A1~0xC8FE`를 디코드한 2,350자를 `hangul.txt`로 만든 뒤 `pyftsubset <ttf> --text-file=hangul.txt --unicodes="U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-205E,U+20A9,U+2190-2199,U+3000-303F,U+3131-318E,U+FF01-FF5E" --layout-features='*' --flavor=woff2`(fonttools + brotli 필요).
- **링크 미리 받기** (`src/components/shared/link.tsx`): `next/link` 기본값은 화면에 보이는 링크를 전부 미리 받는다(로그인 필요 경로는 비로그인 때 `/login` 리다이렉트까지 두세 번). 공용 `Link`는 `prefetch={false}` — **미리 받지 않는다**. 11-04~05엔 `onMouseEnter`·`onTouchStart`·`onFocus`에서 `router.prefetch(href)`를 불렀는데, 그 요청이 끝나기 전에 누르면(폰 터치는 거의 항상) Next 16.4.3이 뼈대(`loading.tsx`) 없이 머리·바닥 사이를 비운 채 서버 응답을 기다렸다 — 서버가 느린 상세(주인이면 확인할 게 많음)는 몇 초 빈 화면(2026-11-05 사용자 제보, 운영에서 rAF 기록으로 7번 중 5번 재현, 미리 받기를 막으면 7번 모두 뼈대). 미리 받지 않으면 누른 뒤 0.5~1초 이전 화면이 남았다가 뼈대가 뜬다. **hover 미리 받기를 되살리지 말 것**(Next를 올려 고쳐졌는지 확인하기 전엔). 모든 파일이 `next/link` 대신 이것을 import. 예외: `prefetchOnView` prop을 주면 화면에 보일 때 내용까지 미리 받는다(`prefetch={true}`) — 메뉴 5칸에만(2026-11-05, `nav.md`).
- 결과(로컬 `next build`+`next start`): 페이지당 요청 ~160 → ~24(글꼴 4·스크립트 ~15, RSC 0), hover 시 RSC 2개(11-05부터 hover도 0).
- 대시보드 규칙 `rate limit protection`(IP당 **200회/10초**, 넘으면 10초 Block): 2026-11-04 사용자가 식을 `(starts_with(http.request.uri.path, "/") and not starts_with(http.request.uri.path, "/_next/static/"))`로 바꿈 — 캐시되는 정적 파일은 세지 않는다. 확인: `/_next/static/` 300회/7초 전부 200, `/logo.svg` 300회/12초는 203회 뒤 429.
