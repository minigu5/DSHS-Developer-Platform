## GitHub에 코드 올리기

GitHub는 코드를 인터넷에 보관하는 곳이에요. 나중에 Vercel이 여기서 코드를 가져가서 사이트로 만들어요.

[github.com/signup](https://github.com/signup)에서 가입해요. 가입했으면 에이전트에게 맡겨요.

> [!say]
> 이 프로젝트를 내 GitHub 계정에 새 저장소로 올려 줘. 로그인이 필요하면 내가 할 수 있게 알려 줘.

중간에 브라우저가 열리면서 GitHub 로그인이나 승인을 물어보면, 그건 내가 눌러 줘요. 명령어는 에이전트가 쳐요.

> [!ok]
> `github.com/내아이디/저장소이름`에 들어가면 내 폴더의 파일 목록이 보여요.

> [!route] GitHub

> [!next] 올렸어요, 다음

---

## Supabase로 로그인·저장 붙이기

Supabase는 회원 가입, 로그인, 글 저장을 맡아 주는 데이터베이스예요. 무료로 시작할 수 있어요.

1. [supabase.com/dashboard](https://supabase.com/dashboard)에서 **GitHub로 가입**해요.
2. **New project**를 눌러 프로젝트를 만들어요. 지역(Region)은 **Northeast Asia (Seoul)**로 골라요. 우리나라에서 쓰면 이게 제일 빨라요. 데이터베이스 비밀번호는 따로 적어 둬요.
3. 프로젝트가 다 만들어지면 설정(Settings) › **API Keys**에서 두 값을 찾아요. **Project URL**과 **Publishable key**예요. 프로젝트 화면의 **Connect** 버튼을 눌러도 두 값이 한꺼번에 나와요.

두 값을 복사해서 에이전트에게 맡겨요.

> [!say]
> Supabase로 로그인하고 저장하는 기능을 붙여 줘. Project URL과 Publishable key는 아래에 붙여 넣을게. 이 값은 .env.local 파일에 넣어 줘.

> [!ok]
> 내 컴퓨터에서 띄운 사이트로 가입해 보면, Supabase의 **Authentication › Users**에 내 계정이 보여요.

> [!warn]
> **Secret key**(예전 이름 service_role)는 모든 데이터를 마음대로 지울 수 있는 열쇠예요. 코드에 쓰거나 GitHub에 올리면 안 돼요. 에이전트에게 줄 때도 Publishable key만 줘요.
>
> 에이전트가 GitHub에 다시 올려도 `.env.local`은 안 올라가요. 일부러 빼 둔 거라 정상이에요. 그래서 다음 단계에서 Vercel에 따로 넣어 줘요.

> [!route] Supabase

> [!next] 가입돼요, 다음

---

## Vercel로 인터넷에 띄우기

Vercel은 GitHub에 있는 코드를 받아서 누구나 들어올 수 있는 사이트로 만들어 줘요. 개인 프로젝트는 무료예요.

먼저 에이전트에게 "지금까지 고친 걸 GitHub에 올려 줘"라고 해요. 그다음:

1. [vercel.com/signup](https://vercel.com/signup)에서 **GitHub로 가입**해요. 요금제는 개인용(Hobby)을 골라요.
2. 대시보드 오른쪽 위의 **New Project**를 누르고, 목록에서 내 저장소를 골라요.
3. 설정 화면의 **Environment Variables**를 펼쳐서 `.env.local`에 있는 값을 이름과 값 그대로 한 줄씩 옮겨 적어요.
4. **Deploy**를 눌러요.

앞으로 GitHub에 다시 올릴 때마다 Vercel이 알아서 사이트를 새로 만들어요.

> [!ok]
> `○○.vercel.app` 주소가 생기고, 휴대폰으로 열어도 내 사이트가 떠요.

> [!warn] 빌드가 실패하면
> 빨간 오류 화면이 나오면 오류 내용을 통째로 복사해서 에이전트에게 붙여 넣고 "Vercel에서 이렇게 실패했어, 고쳐서 다시 올려 줘"라고 해요. Environment Variables를 빠뜨린 경우가 많아요.

> [!route] Vercel

> [!next] 사이트 떴어요, 다음

---

## Supabase에 내 사이트 주소 알려 주기

Supabase는 아직 내 사이트가 내 컴퓨터(localhost)에 있는 줄 알아요. 진짜 주소를 알려 줘야 해요. 가장 많이 놓치는 단계예요.

1. Supabase 프로젝트에서 **Authentication › URL Configuration**으로 가요.
2. **Site URL**을 Vercel 주소(`https://○○.vercel.app`)로 바꾸고 저장해요.
3. 같은 화면의 Redirect URLs에 `https://○○.vercel.app/**`를 추가해요.

> [!warn] 안 하면
> 친구가 가입하거나 로그인할 때 `localhost` 주소로 튕겨서 "사이트에 연결할 수 없음"이 떠요. 내 컴퓨터에서는 잘 되니까 원인을 찾기 어려워요.

> [!ok]
> 휴대폰으로 `○○.vercel.app`에 들어가 새로 가입하고 로그인해도 내 사이트로 돌아와요. 이제 친구에게 주소를 보내면 돼요.

> [!route] Site URL

> [!next] 로그인돼요, 다음
