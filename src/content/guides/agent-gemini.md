## Antigravity 설치하고 로그인

> [!warn] 먼저 확인해요
> Google Antigravity는 **만 18세 미만은 쓸 수 없어요.** 또 **개인 Google 계정(@gmail.com)**만 돼요. 학교 계정(@ts.hs.kr)으로는 로그인이 안 돼요. 둘 중 하나라도 해당하면 [ChatGPT로 바꿔 고르기](guide:ai=chatgpt)

[antigravity.google/download](https://antigravity.google/download)에서 **Antigravity App** 칸의 내 컴퓨터용 버튼을 눌러요. 같은 페이지의 Antigravity IDE가 아니라 App을 받아요.

> [!only os=mac]
> M1 이후 Mac이면 Apple Silicon, 그 전 Mac이면 Intel을 받아요. 받은 파일을 열고 Antigravity를 응용 프로그램 폴더로 끌어다 놓아요.

> [!only os=windows]
> 대부분의 Windows 컴퓨터는 x64를 받으면 돼요. 받은 설치 파일을 실행해 안내대로 설치해요.

앱을 열고 개인 Google 계정으로 로그인해요. Google AI Pro 같은 유료 요금제가 없어도 매주 채워지는 사용량으로 쓸 수 있어요.

> [!ok]
> 로그인한 뒤 앱 왼쪽에 사이드바가 보여요. "계정을 쓸 수 없다"는 안내가 뜨면 나이나 계정 조건에 걸린 거예요. 위의 ChatGPT 링크로 바꿔 골라요.

> [!next] 로그인했어요, 다음

---

## 채팅 말고 프로젝트로

gemini.google.com 채팅창에서 "만들어 줘"라고 하면 Gemini는 코드를 글로 보여 주기만 해요. 아무리 오래 대화해도 내 컴퓨터에는 파일이 하나도 안 생겨요. Antigravity에서는 Gemini가 내 폴더에 파일을 직접 만들고, 고치고, 실행해서 확인까지 해요. 이게 "에이전트"예요.

에이전트에게 일할 폴더를 정해 줘요.

1. 왼쪽 사이드바의 **New Project** 아이콘을 눌러요.
2. **Add Folder**로 폴더 하나를 골라요. 새로 만들어도 돼요(예: 문서 › my-site).
3. **Create**를 눌러요.

Gemini는 이 폴더 안에서 일해요. 만들 것마다 폴더를 하나씩 따로 두면 헷갈리지 않아요.

> [!ok]
> 사이드바에 내 프로젝트가 생기고, 요청을 적을 입력창이 열려요.

> [!next] 프로젝트 만들었어요

---

## 처음엔 하나씩 허락하기

두 가지를 정해요.

- 대화를 시작할 때 고르는 모드는 **Local mode**로 해요. 내 폴더에서 바로 일한다는 뜻이에요.
- 권한은 처음엔 **Request Review**로 둬요. **Settings › General › Global Permissions › Permission Preset**에서 바꿔요. 이러면 Gemini가 명령을 실행하기 전에 매번 물어보고, 파일은 내 프로젝트 폴더 안에서만 건드려요. 익숙해지면 **Default**로 바꿔도 돼요.

> [!warn]
> **Turbo**는 고르지 마세요. 명령을 묻지 않고 실행하고, 컴퓨터의 모든 파일에 손댈 수 있어요.

> [!ok]
> 첫 요청을 보내면 Gemini가 명령을 실행하기 전에 허락을 기다려요. 일이 끝난 뒤 Finder나 파일 탐색기로 내 폴더를 열어 보면 새 파일이 생겨 있어요.

> [!more] 터미널이 편하면
> 앱 대신 터미널에서 `agy` 명령으로 써도 돼요.
>
> > [!only os=mac]
> > ```bash
> > curl -fsSL https://antigravity.google/cli/install.sh | bash
> > ```
> >
> > 설치한 뒤 작업할 폴더로 이동해서 `agy`를 실행해요.
>
> > [!only os=windows]
> > Windows 설치 명령은 [Antigravity 시작하기 문서](https://antigravity.google/docs/getting-started)의 CLI 칸에 있어요. 설치한 뒤 작업할 폴더로 이동해서 `agy`를 실행해요.

> [!next] 준비 끝, 만들러 가기
