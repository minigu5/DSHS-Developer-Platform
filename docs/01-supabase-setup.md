# 📘 Supabase 프로젝트 생성 가이드

> DSHS Developer Platform을 위한 Supabase 백엔드 초기 설정 가이드입니다.
> 이 문서를 따라 하면 **DB + 인증(Auth) + Storage**가 준비된 Supabase 프로젝트를 만들 수 있습니다.

---

## 🎯 이 가이드를 마치면 얻게 되는 것

- ✅ Supabase 프로젝트 1개
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

이 3개의 값을 Step 1에서 만든 `.env.local`에 입력하면 됩니다.

---

## 1️⃣ Supabase 계정 생성

### 1-1. 회원가입

1. 브라우저에서 **[https://supabase.com](https://supabase.com)** 접속
2. 오른쪽 상단 **`Start your project`** 클릭
3. **`Continue with GitHub`** 으로 가입 (권장)
   - GitHub 계정이 없다면 이메일로 가입해도 됩니다.

> 💡 **GitHub 가입을 권장하는 이유**
> 추후 Vercel 배포 시 GitHub 연동이 필요하기 때문에 동일한 계정으로 통일하면 편합니다.

---

## 2️⃣ 새 프로젝트 생성

### 2-1. Organization 선택

처음 가입했다면 자동으로 개인 Organization이 만들어집니다. 그대로 사용하세요.

### 2-2. `New Project` 클릭

대시보드에서 **`New Project`** 버튼을 누릅니다.

### 2-3. 프로젝트 정보 입력

| 항목 | 값 | 비고 |
|---|---|---|
| **Name** | `dshs-developer-platform` | 영문 소문자 + 하이픈 권장 |
| **Database Password** | 강력한 비밀번호 직접 입력 | ⚠️ **반드시 별도로 안전하게 보관** |
| **Region** | `Northeast Asia (Seoul)` | 서울 리전 선택 (지연 시간 최소화) |
| **Pricing Plan** | `Free` | 무료 플랜으로 시작 |

> ⚠️ **Database Password 주의**
> - 한 번 분실하면 복구가 어렵습니다. 1Password / Bitwarden 같은 비밀번호 관리자에 저장하세요.
> - SQL Editor에서 직접 DB 접속할 때 필요합니다.

### 2-4. `Create new project` 클릭

프로젝트가 프로비저닝되는 데 **약 1~2분** 소요됩니다. ☕

---

## 3️⃣ API Keys 확인 및 복사

프로젝트가 생성되면 자동으로 대시보드로 이동합니다.

### 3-1. 프로젝트 설정 페이지로 이동

왼쪽 사이드바 맨 아래 **⚙️ `Project Settings`** 클릭 → **`API`** 탭 선택

### 3-2. 다음 값들을 복사해서 `.env.local`에 붙여넣기

#### 🔗 Project URL

```
Project URL: https://xxxxxxxxxx.supabase.co
```
→ `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`

#### 🔑 anon public key

```
Project API keys → anon public
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
→ `.env.local`의 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> 이 키는 **브라우저에 노출되어도 안전**합니다. RLS(Row Level Security)가 보안을 책임집니다.

#### 🔐 service_role secret key

```
Project API keys → service_role  ⚠️ secret
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
→ `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **절대 클라이언트(브라우저)에 노출 금지**
> - `NEXT_PUBLIC_` 접두사를 붙이지 마세요.
> - Git에 커밋하지 마세요. (`.gitignore`에 `.env.local`이 포함되어 있는지 확인)
> - 서버사이드(API Route, Server Action, 미들웨어)에서만 사용합니다.

---

## 4️⃣ `.env.local` 최종 예시

프로젝트 루트(`/Users/shinmingyu/Project/DSHS_Developer_Platform/.env.local`)의 파일은 이렇게 보여야 합니다.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmno.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi...

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ALLOWED_EMAIL_DOMAIN=ts.hs.kr
```

---

## 5️⃣ 동작 확인 (선택사항)

대시보드 왼쪽 사이드바에서 다음 메뉴들이 정상적으로 열리는지 확인하세요.

- 🗃️ **Table Editor** — 비어 있어야 정상 (Step 3에서 테이블 생성 예정)
- 📝 **SQL Editor** — SQL 실행 가능한 화면
- 🔐 **Authentication** → **Providers** — 로그인 제공자 설정 화면 (Step 2에서 사용)
- 📦 **Storage** — 파일 저장소

---

## 🆘 트러블슈팅

### Q1. 프로젝트 생성이 너무 오래 걸려요
- 무료 플랜은 가끔 5분 이상 걸리기도 합니다. 새로고침해서 확인하세요.
- 그래도 안 되면 다른 Region(예: `Tokyo`)으로 다시 만들어보세요.

### Q2. Database Password를 잊어버렸어요
- 대시보드 → ⚙️ **Project Settings** → **Database** → **Reset database password**에서 재설정 가능
- 단, 기존 비밀번호로 만든 외부 연결은 모두 끊깁니다.

### Q3. API Key를 노출시킨 것 같아요
- ⚙️ **Project Settings** → **API** → **JWT Settings** → **Generate a new JWT secret**으로 모든 키 재발급
- 즉시 `.env.local` 업데이트 및 배포 환경(Vercel)도 갱신 필요

---

## ✅ 체크리스트

가이드를 모두 마쳤다면 아래 항목들을 확인하세요.

- [ ] Supabase 회원가입 완료
- [ ] `dshs-developer-platform` 프로젝트 생성 완료 (Seoul Region)
- [ ] Database Password를 안전한 곳에 저장
- [ ] `.env.local`에 3개의 키(`URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`) 모두 입력
- [ ] `.gitignore`에 `.env*.local` 포함 여부 확인

---

## 👉 다음 단계

다음은 **[02-google-oauth-setup.md](./02-google-oauth-setup.md)** 가이드를 따라 Google OAuth를 설정합니다.

> 끝나면 채팅창에서 **"Supabase 셋업 완료"** 라고 알려주세요. Step 2 코드 구현으로 넘어가겠습니다! 🚀
