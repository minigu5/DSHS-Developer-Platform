# Cloudflare Workers 이전 (Vercel → Workers, 2026-10-24)

호스팅만 Vercel에서 Cloudflare Workers로 옮긴다. **DB·인증은 Supabase 그대로**(사용자 결정 — D1 이전은 RLS·Postgres 함수 재작성이 커서 보류). 새 주소는 `https://dshs.dev`.

## 구성

| 파일 | 역할 |
|---|---|
| `wrangler.jsonc` | Worker 이름 `dshs-developer-platform`, `nodejs_compat`, 정적 자산, Images 바인딩, 배치 `aws:ap-northeast-2`, `keep_names: false`, 런타임 변수 |
| `open-next.config.ts` | OpenNext 캐시 설정 — 정적 자산 캐시만 (아래 "캐시") |
| `next.config.ts` 끝 | `initOpenNextCloudflareForDev()` — `next dev`에서 바인딩 사용 |
| `public/_headers` | `/_next/static/*` 1년 캐시 |
| `.dev.vars` (커밋 안 함, `.dev.vars.example` 참고) | `NEXTJS_ENV=development` — 로컬 preview가 읽을 `.env` 종류 |
| `scripts/gen-guide-fragments.mjs` | 가이드 조각 md → `src/content/guides/fragments.generated.ts` (커밋 안 함) |

### 코드에서 바뀐 것
- **가이드 조각**: Workers엔 파일 시스템이 없어 운영은 빌드 때 묶은 `fragments.generated.ts`를 읽는다. 개발(`NODE_ENV=development`)은 지금처럼 md를 직접 읽어 고치면 바로 보인다. 생성은 `postinstall`·`predev`·`prebuild`에서 자동.
- **SSRF 방어**(`src/lib/ssrf-guard.ts`): `node:dns` `lookup`이 실패하면 DNS-over-HTTPS(`cloudflare-dns.com` → `dns.google`)로 다시 찾는다. 로컬 workerd에서는 `node:dns`가 실패했다(이 네트워크에서 1.1.1.1 DoH가 막힘). 모두 실패하면 막는다.
- **Vercel Analytics 제거** (`@vercel/analytics`). 필요하면 Cloudflare 대시보드 → Web Analytics(도메인이 Cloudflare 프록시라 스크립트 없이 켤 수 있음).
- **Next 16.2.7 → 16.4.3**: `@opennextjs/cloudflare@1.20`의 peer 요구(`>=16.4.1`).
- Cloudinary SDK는 Workers에서 그대로 동작(로컬 workerd에서 `api.ping` 확인).

### 캐시
`revalidate = 30/60`을 단 페이지(홈·팁·해줘·공지)도 Supabase 쿠키를 읽어서 실제로는 요청마다 그려진다(`next build` 표의 ƒ). 미리 만든 페이지는 정적(○) 4개(`/_not-found`, `/auth/forbidden`, `/icon.svg`, `/projects/new`)뿐이다. 그래서 ISR용 R2·Durable Object 대기열·D1 태그 캐시를 두지 않고 `static-assets-incremental-cache`만 쓴다. 쿠키 없는 ISR 페이지를 새로 만들면 [OpenNext 캐시 문서](https://opennext.js.org/cloudflare/caching)대로 R2 + `do-queue` + `d1-next-tag-cache`로 바꾼다.

### 명령
```bash
npm run dev       # 평소처럼 next dev
npm run preview   # Workers 런타임으로 빌드 후 로컬 실행 (http://localhost:8787)
npm run deploy    # 빌드 후 배포
npm run upload    # 빌드 후 새 버전만 올리기(배포 안 함)
```

## 환경 변수

| 이름 | 언제 필요 | 어디에 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **빌드 때** (코드에 박힘) | 로컬 배포면 `.env.local`, Workers Builds면 "빌드 변수" |
| `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | 실행 때 (비밀) | `npx wrangler secret put <이름>` |
| `ALLOWED_EMAIL_DOMAIN` | 실행 때 | `wrangler.jsonc` `vars` |

`NEXT_PUBLIC_SITE_URL`은 코드에서 쓰지 않는다(로그인 콜백은 `window.location.origin`·`request.url` 기준).

⚠️ 로컬에서 `npm run deploy`하면 `.env.local`이 빌드에 들어간다. `NEXT_PUBLIC_*`만 코드에 박히고 나머지는 박히지 않지만, `.env.local`의 Supabase가 운영 프로젝트인지 확인하고 배포할 것.

## 전환 순서

1. **계정** — 개인 계정(`370e521d89a70d895de8448a36449b93`, `wrangler.jsonc`의 `account_id`). `dshs.dev` 영역이 여기 있다.
2. **비밀 등록** — 위 표의 4개를 `npx wrangler secret put`.
3. **첫 배포** — `npm run deploy` → `https://dshs-developer-platform.<서브도메인>.workers.dev`.
4. **Supabase Auth URL** (대시보드 → Authentication → URL Configuration)
   - Redirect URLs에 `https://dshs.dev/**`와 3번의 `workers.dev` 주소 `/**` 추가. 옛 `vercel.app`은 전환이 끝날 때까지 남겨 둔다.
   - 전환 직전 Site URL을 `https://dshs.dev`로.
5. **workers.dev에서 확인** — Google 로그인(`@ts.hs.kr`, 외부 계정 차단), 프로젝트 등록·이미지 업로드, 파비콘 자동 추출, 가이드, 위키 저장, 다크모드.
6. **CPU 시간 확인** — 대시보드 Worker → Metrics의 CPU time. **무료 요금제는 요청당 10 ms 제한**이라 SSR 페이지가 넘으면 오류(1102)가 난다. 넘으면 Workers Paid(월 $5) 필요.
7. **도메인 연결** — `wrangler.jsonc`의 `routes` 주석 해제(`vars` 블록 끝에 쉼표) 후 `npm run deploy`. `dshs.dev`·`www.dshs.dev`에 기존 DNS 레코드가 있으면 먼저 지운다.
8. **Google OAuth** — 콜백이 `https://aclcleemnsmxyixcfqro.supabase.co/auth/v1/callback`이라 **Google Cloud Console은 바꿀 것 없음**. 동의 화면의 홈페이지 주소만 원하면 `dshs.dev`로(승인된 도메인 추가 시 Search Console 소유 확인 필요).
9. **자동 배포** — Cloudflare 대시보드 → Worker → Settings → Builds에서 GitHub 저장소 연결. 빌드 명령 `npx opennextjs-cloudflare build`, 배포 명령 `npx opennextjs-cloudflare deploy`, 빌드 변수에 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY`.
10. **Vercel 정리** — Git 연결 해제(안 하면 push마다 Vercel도 배포됨). 옛 주소 리디렉트 방법은 미정.
11. **문서** — CLAUDE.md·AGENTS.md 인프라 표, Supabase Redirect URL에서 `vercel.app` 제거.

## 참고
- [OpenNext Cloudflare 시작하기](https://opennext.js.org/cloudflare/get-started)
- [Workers 한도](https://developers.cloudflare.com/workers/platform/limits/) — 무료: 요청 10만/일, CPU 10 ms/요청
- OpenNext는 Next 16 `proxy.ts`를 아직 인식하지 못한다는 보고가 있어 `src/middleware.ts`를 유지한다.
