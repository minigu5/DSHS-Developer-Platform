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
- 자동 압축: `quality: "auto:good"`, `fetch_format: "auto"` 변환 적용.
- 환경변수 3개 필요: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (Cloudflare에는 `wrangler secret put`으로 설정).
- `src/lib/parse-image-url.ts`와 `GET /api/resolve-image`는 기존 imgbb URL을 위해 유지.

### 이미지 포맷 최적화 — `next.config.ts`
- `images.formats: ['image/avif', 'image/webp']` 설정으로 브라우저 지원 시 AVIF(WebP 대비 ~50% 작음) → WebP 순으로 자동 변환 제공.
- `images.remotePatterns`에 `i.ibb.co`, `ibb.co`, `res.cloudinary.com` 추가 → 각 이미지 소스도 Next.js 이미지 최적화 파이프라인 적용 가능.

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

### 요청 수 줄이기 — Cloudflare 속도 제한(2026-11-04)
- 문제: 사용자가 Cloudflare에 IP당 100회/10초 속도 제한을 걸어 뒀는데 학교는 IP 하나라 자주 걸렸다. 실측(로그아웃, 첫 방문): 10초 안에 dshs.dev 요청 131개 — 글꼴 103·스크립트 17·RSC 미리 받기 ~30. 두 번째 페이지부터도 ~33개(대부분 미리 받기 = Worker 호출이라 CPU 10ms 한도도 같이 씀).
- **제목 글꼴 직접 두기** (`src/app/layout.tsx`, `src/app/fonts/`): `next/font/google`의 `IBM_Plex_Sans_KR`은 한글이 조각 ~100개(unicode-range)로 나뉘어 있고 제목 글자가 거의 모든 조각에 흩어져 preload를 꺼도 ~100개를 받았다. 지금은 `next/font/local`로 600·700 woff2 2개(각 ~270KB, 라이선스 `IBMPlexSansKR-OFL.txt`). 한글은 KS X 1001 완성형 2,350자만 — 빠진 글자는 `--font-heading`의 다음 글꼴(Apple SD Gothic Neo 등)로 보인다. `preload: false`.
  - 다시 만들기: google/fonts `ofl/ibmplexsanskr/IBMPlexSansKR-{SemiBold,Bold}.ttf`를 받아 EUC-KR `0xB0A1~0xC8FE`를 디코드한 2,350자를 `hangul.txt`로 만든 뒤 `pyftsubset <ttf> --text-file=hangul.txt --unicodes="U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-205E,U+20A9,U+2190-2199,U+3000-303F,U+3131-318E,U+FF01-FF5E" --layout-features='*' --flavor=woff2`(fonttools + brotli 필요).
- **링크 미리 받기** (`src/components/shared/link.tsx`): `next/link` 기본값은 화면에 보이는 링크를 전부 미리 받는다(로그인 필요 경로는 비로그인 때 `/login` 리다이렉트까지 두세 번). 공용 `Link`는 `prefetch={false}`로 넘기고 `onMouseEnter`·`onTouchStart`·`onFocus`에서 `router.prefetch(href)`(문자열 내부 경로만). Next 16.4는 `prefetch={false}`면 hover 미리 받기도 꺼서 직접 부른다. 모든 파일이 `next/link` 대신 이것을 import.
- 결과(로컬 `next build`+`next start`): 페이지당 요청 ~160 → ~24(글꼴 4·스크립트 ~15, RSC 0), hover 시 RSC 2개.
- 대시보드 쪽 권장: 속도 제한 규칙 조건에 `not starts_with(http.request.uri.path, "/_next/static/")` — 캐시되는 정적 파일은 세지 않게.
