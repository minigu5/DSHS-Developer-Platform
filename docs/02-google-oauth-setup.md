# 🔐 Google OAuth + Supabase 연동 가이드

> Google 로그인을 Supabase Auth와 연동하고, **`@ts.hs.kr` 도메인만 허용**하도록 설정합니다.
> Google Cloud Console 사용이 처음이어도 따라할 수 있도록 자세히 작성했습니다.

---

## 🎯 이 가이드를 마치면 얻게 되는 것

- ✅ Google Cloud 프로젝트 1개
- ✅ OAuth 2.0 Client ID + Secret
- ✅ Supabase Auth에 Google Provider 활성화
- ✅ `@ts.hs.kr` 도메인 제한 1차 방어선 (Google측)

> ⚠️ **중요:** Google측 도메인 제한은 1차 방어선이며, 우회 가능성이 있습니다.
> **진짜 도메인 검증은 Next.js Middleware + Supabase RLS에서** Step 2 코드 구현 시 처리합니다.

---

## 📋 사전 준비

- ✅ Google 계정 (개인 Gmail 계정으로 진행 가능)
- ✅ [01-supabase-setup.md](./01-supabase-setup.md) 완료

---

## 1️⃣ Google Cloud Console 프로젝트 생성

### 1-1. 콘솔 접속

브라우저에서 **[https://console.cloud.google.com](https://console.cloud.google.com)** 접속하고 로그인합니다.

> 처음 접속 시 약관 동의 및 국가/지역 선택이 나옵니다. 선택 후 진행하세요.

### 1-2. 새 프로젝트 생성

1. 상단 네비게이션 바 **왼쪽의 프로젝트 선택 드롭다운** 클릭
2. 우측 상단 **`새 프로젝트 (NEW PROJECT)`** 클릭
3. 프로젝트 정보 입력:
   - **프로젝트 이름:** `DSHS Developer Platform`
   - **조직:** `조직 없음` (개인 계정인 경우)
   - **위치:** 기본값 그대로
4. **`만들기 (CREATE)`** 클릭

생성 완료까지 **약 30초** 소요됩니다. 알림(우상단 🔔)에서 완료를 확인하고, **상단 프로젝트 드롭다운에서 방금 만든 프로젝트를 선택**합니다.

---

## 2️⃣ OAuth 동의 화면 (OAuth Consent Screen) 구성

OAuth Client를 만들기 전에 **동의 화면**을 먼저 설정해야 합니다.

### 2-1. 메뉴 이동

왼쪽 사이드바 **☰ 메뉴** → **`API 및 서비스 (APIs & Services)`** → **`OAuth 동의 화면 (OAuth consent screen)`**

> 검색이 더 빠릅니다. 상단 검색창에 `OAuth consent` 입력!

### 2-2. User Type 선택

- **`외부 (External)`** 선택 → **`만들기 (CREATE)`**

> 💡 `Internal`은 Google Workspace 조직 계정에서만 선택 가능합니다.
> 우리는 `External`로 만들고 도메인 제한은 코드로 처리합니다.

### 2-3. 앱 정보 입력 (Step 1: App information)

| 항목 | 값 |
|---|---|
| **앱 이름 (App name)** | `DSHS Developer Platform` |
| **사용자 지원 이메일** | 본인 Gmail |
| **앱 로고** | (선택사항, 비워둬도 됨) |

**앱 도메인 (App domain)** 섹션:
- 일단 모두 **비워두기** (Vercel 배포 후 설정 가능)

**승인된 도메인 (Authorized domains)** 섹션:
- 다음 2개를 추가:
  1. `supabase.co`
  2. `vercel.app` (배포 후 사용 예정)

**개발자 연락처 정보 (Developer contact information)**:
- 본인 Gmail 입력

→ **`저장 후 계속 (SAVE AND CONTINUE)`**

### 2-4. 범위 (Scopes) 설정 (Step 2)

- **`범위 추가 또는 삭제 (ADD OR REMOVE SCOPES)`** 클릭
- 다음 3개에 ✅ 체크:
  - `.../auth/userinfo.email`
  - `.../auth/userinfo.profile`
  - `openid`
- **`업데이트 (UPDATE)`** → **`저장 후 계속`**

### 2-5. 테스트 사용자 (Test users) (Step 3)

> ⚠️ 앱이 `Testing` 상태일 때는 등록한 테스트 사용자만 로그인할 수 있습니다.

- **`+ ADD USERS`** 클릭
- 본인 `@ts.hs.kr` 이메일 (또는 본인 Gmail) 입력 → **추가**
- 개발 중 사용할 다른 학교 이메일도 함께 등록 가능

> 💡 **나중에 학교 전체에 배포할 때:** OAuth 동의 화면 메인 페이지에서 **`앱 게시 (PUBLISH APP)`** 클릭 → `Production` 상태로 전환

→ **`저장 후 계속`**

### 2-6. 요약 (Summary) (Step 4)

내용 확인 후 **`대시보드로 돌아가기 (BACK TO DASHBOARD)`**

---

## 3️⃣ OAuth 2.0 Client ID 생성

### 3-1. 사용자 인증 정보 메뉴 이동

왼쪽 사이드바 **`API 및 서비스`** → **`사용자 인증 정보 (Credentials)`**

### 3-2. 새 클라이언트 ID 만들기

상단 **`+ 사용자 인증 정보 만들기 (+ CREATE CREDENTIALS)`** → **`OAuth 클라이언트 ID`**

### 3-3. 클라이언트 정보 입력

| 항목 | 값 |
|---|---|
| **애플리케이션 유형** | `웹 애플리케이션 (Web application)` |
| **이름** | `DSHS Platform Web Client` |

### 3-4. 승인된 JavaScript 원본 (Authorized JavaScript origins)

**`+ URI 추가`** 클릭 후 다음을 추가:

```
http://localhost:3000
```

> 배포 후에는 본인의 Vercel URL (예: `https://dshs-developer-platform.vercel.app`)도 추가합니다.

### 3-5. 승인된 리디렉션 URI (Authorized redirect URIs) ⭐ 가장 중요

> ⚠️ 여기에 **Supabase Callback URL**을 정확히 입력해야 OAuth가 동작합니다.

#### Supabase Callback URL 확인 방법

1. Supabase 대시보드 → 왼쪽 **🔐 Authentication** → **`Providers`**
2. **`Google`** 항목 클릭하여 펼치기
3. 하단에 표시되는 **`Callback URL (for OAuth)`** 복사
   - 형식: `https://<your-project-id>.supabase.co/auth/v1/callback`

#### Google Cloud Console에 입력

**승인된 리디렉션 URI**에 **`+ URI 추가`** 클릭 후 위에서 복사한 URL 그대로 붙여넣기:

```
https://abcdefghijklmno.supabase.co/auth/v1/callback
```

(추가로 로컬 개발용)

```
http://localhost:3000/auth/callback
```

### 3-6. 만들기 (CREATE)

생성되면 팝업으로 **클라이언트 ID**와 **클라이언트 보안 비밀번호 (Client Secret)**가 표시됩니다.

> ⚠️ **이 두 값을 안전한 곳에 즉시 복사하세요.**
> Client Secret는 다시 확인 가능하지만, 노출되면 즉시 재발급해야 합니다.

| 받게 될 값 | 예시 |
|---|---|
| **Client ID** | `1234567890-abcdefg.apps.googleusercontent.com` |
| **Client Secret** | `GOCSPX-xxxxxxxxxxxxxxxxxxx` |

---

## 4️⃣ Supabase에 Google Provider 활성화

### 4-1. Supabase Auth Provider 페이지 이동

Supabase 대시보드 → **🔐 Authentication** → **`Providers`** → **`Google`** 클릭

### 4-2. 설정 입력

| 항목 | 값 |
|---|---|
| **Enable Sign in with Google** | ✅ ON |
| **Client ID (for OAuth)** | 위 3-6에서 복사한 Client ID |
| **Client Secret (for OAuth)** | 위 3-6에서 복사한 Client Secret |
| **Authorized Client IDs** | 비워두기 |
| **Skip nonce check** | ❌ OFF (기본값 유지) |

### 4-3. Save 클릭

저장이 완료되면 **`Google ✅ Enabled`** 상태가 됩니다.

---

## 5️⃣ Site URL & Redirect URLs 설정

Supabase가 인증 완료 후 어디로 리디렉트할지 알려줘야 합니다.

### 5-1. URL Configuration 이동

Supabase 대시보드 → **🔐 Authentication** → **`URL Configuration`**

### 5-2. Site URL 설정

```
Site URL: http://localhost:3000
```

> 배포 후에는 Vercel URL로 변경합니다.

### 5-3. Redirect URLs 추가

**`Add URL`** 클릭 후 다음 항목들을 추가:

```
http://localhost:3000/**
http://localhost:3000/auth/callback
```

(배포 후 추가 예정)
```
https://your-app.vercel.app/**
```

→ **Save** 클릭

---

## 6️⃣ (선택) Google측 도메인 제한 — `hd` 파라미터

Google OAuth는 `hd` (hosted domain) 파라미터로 특정 도메인 사용자만 동의 화면을 통과시킬 수 있습니다.

> ⚠️ **주의:** `hd`는 Google Workspace 도메인에서만 안정적으로 동작합니다.
> `@ts.hs.kr`이 Google Workspace로 운영되고 있다면 효과적이지만, 그렇지 않다면 코드 레벨 검증이 더 안전합니다.

이 부분은 Step 2의 코드 구현 시 다음과 같이 사용합니다 (미리보기):

```ts
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${siteUrl}/auth/callback`,
    queryParams: {
      hd: 'ts.hs.kr',       // Google측 도메인 힌트
      prompt: 'select_account',
    },
  },
});
```

**진짜 보안은 다음 3단 검증으로 처리합니다:**
1. ✅ Google `hd` 파라미터 (UX 측면 1차 필터)
2. ✅ Middleware에서 `session.user.email`의 `@ts.hs.kr` 확인 (2차)
3. ✅ Supabase RLS에서 DB 레벨 보호 (3차, 최종 방어선)

---

## ✅ 최종 체크리스트

가이드를 모두 마쳤다면 아래 항목들을 확인하세요.

### Google Cloud Console
- [ ] `DSHS Developer Platform` 프로젝트 생성
- [ ] OAuth 동의 화면 설정 (External, 앱 이름, 승인 도메인 `supabase.co`)
- [ ] 테스트 사용자에 본인 이메일 추가
- [ ] OAuth 2.0 Client ID 생성 (웹 애플리케이션)
- [ ] **승인된 리디렉션 URI**에 Supabase Callback URL 입력
- [ ] **Client ID + Client Secret을 안전한 곳에 보관**

### Supabase
- [ ] **Authentication → Providers → Google** 활성화
- [ ] Client ID, Client Secret 입력 후 저장
- [ ] **URL Configuration**의 Site URL을 `http://localhost:3000`으로 설정
- [ ] Redirect URLs에 `http://localhost:3000/**` 추가

---

## 🆘 트러블슈팅

### Q1. `redirect_uri_mismatch` 에러가 나요
- Google Console에 등록한 **승인된 리디렉션 URI**와 Supabase의 Callback URL이 **완전히 동일**해야 합니다.
- 끝에 `/`가 있는지, http/https가 맞는지, 오탈자가 없는지 확인하세요.

### Q2. `access_denied` 또는 `App is being tested`
- OAuth 동의 화면이 `Testing` 상태이고, 해당 이메일이 **테스트 사용자에 등록되어 있지 않은** 경우입니다.
- Google Console → OAuth 동의 화면 → 테스트 사용자 추가하세요.

### Q3. 다른 학생들도 사용하려면?
- 두 가지 방법:
  1. **테스트 사용자에 모두 등록** (최대 100명 제한)
  2. **앱 게시 (Publish App)** → Production 모드 전환
- Production 모드에서는 도메인 검증을 위해 Google이 추가 심사를 요구할 수 있습니다. 이 시점에서 안내드릴게요.

### Q4. Client Secret를 잊어버렸어요
- Google Console → 사용자 인증 정보 → 해당 클라이언트 클릭 → **`다시 설정 (Reset Secret)`** 으로 재발급
- 재발급 후 Supabase에도 새 값으로 업데이트 필요

### Q5. `@ts.hs.kr` 이 아닌 계정으로 로그인되면?
- 이 가이드 시점에서는 **Supabase가 로그인을 허용**합니다.
- 진짜 차단은 Step 2의 **Middleware + 콜백 라우트 코드**에서 처리합니다.
- 비도메인 사용자는 로그인 직후 즉시 강제 로그아웃 + 에러 페이지로 리디렉트됩니다.

---

## 👉 다음 단계

모든 설정이 끝났다면 채팅창에서 **"OAuth 셋업 완료"** 라고 알려주세요.

다음으로 **Step 2: 코드 구현**을 진행합니다.
- Supabase 클라이언트 (`@supabase/ssr`) 설정
- Google 로그인 버튼 + 콜백 라우트
- `@ts.hs.kr` 도메인 검증 미들웨어
- 보호된 라우트 (로그인 필수 페이지)

🚀
