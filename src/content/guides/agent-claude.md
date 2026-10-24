## Claude 앱 설치하고 로그인

Claude 데스크톱 앱을 받아 설치하고, 내 Claude 계정으로 로그인해요.

> [!only os=mac]
> [Mac용 다운로드](https://claude.ai/api/desktop/darwin/universal/dmg/latest/redirect) — 받은 파일을 열고 Claude를 응용 프로그램 폴더로 끌어다 놓아요.

> [!only os=windows]
> [Windows용 다운로드](https://claude.ai/api/desktop/win32/x64/setup/latest/redirect) — 받은 설치 파일을 실행해요. 시작 메뉴에서 Claude를 열 수 있어요.

> [!warn]
> 에이전트로 쓰는 **Code 탭은 Pro 이상 유료 요금제**에서만 열려요. 무료 계정이면 업그레이드하라는 창이 떠요. 돈을 안 들이고 시작하려면 [ChatGPT(Codex)로 바꿔 고르기](guide:ai=chatgpt)

> [!next] 로그인했어요, 다음

---

## 채팅 말고 Code 탭으로

Claude 앱에는 Chat, Cowork, Code가 있어요. 사이드바 맨 위의 **Code**를 눌러요. 아이콘만 보이면 마우스를 올려 이름을 확인해요.

Chat 탭에서 "만들어 줘"라고 하면 Claude는 코드를 글로 보여 주기만 해요. 아무리 오래 대화해도 내 컴퓨터에는 파일이 하나도 안 생겨요. **Code 탭**에서는 Claude가 내 폴더에 파일을 직접 만들고, 고치고, 실행해서 확인까지 해요. 이게 "에이전트"예요.

> [!next] Code 탭에 들어왔어요

---

## 일할 폴더 정해 주기

입력창 바로 아래 줄에서 정해요.

1. 맨 앞 칸(환경)을 눌러 **Local** 묶음의 맨 위 항목을 골라요. 내 컴퓨터에서 일하겠다는 뜻이에요.
2. 그 옆 칸(폴더)을 눌러 **Open folder…**로 폴더 하나를 골라요. 새로 만들어도 돼요(예: 문서 › my-site).

Claude는 이 폴더 안에서만 일해요. 프로젝트마다 폴더를 하나씩 만들면 헷갈리지 않아요.

> [!only os=windows]
> 처음 열 때 Git을 설치하라고 하면 [Git for Windows](https://git-scm.com/downloads/win)를 설치하고 Claude 앱을 다시 켜요.

> [!ok]
> 입력창 아래에 내 폴더 이름이 보여요.

> [!next] 폴더 골랐어요, 다음

---

## 처음엔 하나씩 허락하기

입력창 아래 줄에 권한 모드가 있어요. 처음엔 **Manual**로 두면 Claude가 파일을 바꾸거나 명령을 실행하기 전에 매번 물어봐요. 뭘 하는지 보면서 배울 수 있어요. 익숙해지면 **Accept edits**로 바꿔 파일 수정은 알아서 하게 해도 돼요.

> [!ok]
> 첫 요청을 보내면 무엇을 바꿀지 보여 주고 허락을 기다려요. 허락하면 `+12 -1` 같은 표시가 생겨요. 진짜 내 폴더의 파일이 바뀌었다는 뜻이에요.

> [!more] 터미널이 편하면
> 데스크톱 앱 대신 터미널에서 `claude` 명령으로 써도 똑같아요.
>
> > [!only os=mac]
> > ```bash
> > # Node.js가 없다면 먼저 설치
> > curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
> > source ~/.zshrc
> > nvm install --lts && nvm use --lts
> >
> > # Claude Code 설치
> > npm install -g @anthropic-ai/claude-code
> > ```
>
> > [!only os=windows]
> > PowerShell을 열고:
> > ```powershell
> > irm https://claude.ai/install.ps1 | iex
> > ```
>
> 설치한 뒤 작업할 폴더로 이동해서 `claude`를 실행해요.

> [!next] 준비 끝, 만들러 가기
