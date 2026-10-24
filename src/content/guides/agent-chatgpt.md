## ChatGPT 가입하고 앱 설치하기

ChatGPT 계정이 없으면 [chatgpt.com](https://chatgpt.com)에서 먼저 무료로 가입해요. 그다음 ChatGPT 데스크톱 앱을 받아요. Codex는 이 앱 안에 들어 있어요.

> [!only os=mac]
> [Mac용 다운로드](https://persistent.oaistatic.com/codex-app-prod/Codex.dmg) — M1 이후(Apple Silicon) Mac용이에요. 받은 파일을 열고 앱을 응용 프로그램 폴더로 끌어다 놓아요.

> [!only os=windows]
> [Windows용 다운로드](https://get.microsoft.com/installer/download/9PLM9XGG6VKS?cid=website_cta_psi) — Microsoft Store 설치 파일이에요. 실행하면 설치가 끝나고, 시작 메뉴에서 ChatGPT를 열 수 있어요.

앱을 열고 방금 만든 ChatGPT 계정으로 로그인해요.

> [!warn]
> 무료 요금제로도 Codex를 쓸 수 있지만, 짧은 작업용이라 사용량이 적어요. 한 번에 크게 시키지 말고 작게 나눠서 요청해요. 무료 제공은 차례로 열리는 중이라 계정에 따라 아직 안 보일 수도 있어요. 만 18세 미만은 보호자 동의를 받고 써야 해요(OpenAI 이용약관).

> [!ok]
> 앱 왼쪽에 사이드바가 보이고, 내 계정으로 로그인돼 있어요.

> [!next] 로그인했어요, 다음

---

## 채팅 말고 Codex로

사이드바 맨 위의 **ChatGPT**를 눌러 목록을 열고 **Codex**를 골라요.

chatgpt.com 채팅창이나 앱의 ChatGPT 쪽에서 "만들어 줘"라고 하면 코드를 글로 보여 주기만 해요. 아무리 오래 대화해도 내 컴퓨터 폴더에는 파일이 하나도 안 생겨요. **Codex**에서는 AI가 내 폴더에 파일을 직접 만들고, 고치고, 실행해서 확인까지 해요. 이게 "에이전트"예요.

> [!ok]
> 사이드바 맨 위가 **Codex**로 바뀌고, 그 아래에 **New chat**이 보여요.

> [!next] Codex로 바꿨어요

---

## 일할 폴더 정해 주기

Codex에게 내 컴퓨터의 폴더 하나를 맡겨요. 사이드바에서 새 프로젝트를 만들고 내 폴더를 붙여요. 폴더는 새로 만들어도 돼요(예: 문서 › my-site). 프로젝트에 붙인 폴더를 바꾸려면 프로젝트 메뉴의 **Edit project**에서 **Add folder**를 눌러요.

Codex는 이 폴더 안에서만 파일을 고쳐요. 만들 것마다 폴더를 하나씩 따로 두면 헷갈리지 않아요.

> [!ok]
> 사이드바에 내 프로젝트가 보이고, 그 안에서 새 대화를 열면 입력창 아래에 **Local**이 보여요. 내 컴퓨터에서 일한다는 뜻이에요.

> [!next] 폴더 골랐어요, 다음

---

## 권한은 기본값 그대로

입력창 아래 권한 칸은 **Default permissions** 그대로 둬요. 이 상태에서 Codex는 내 폴더 안의 파일만 고치고, 폴더 밖을 건드리거나 인터넷이 필요한 명령은 실행하기 전에 먼저 물어봐요. 무엇을 하려는지 읽어 보고 허락하면 돼요.

> [!warn]
> 전체 권한(full access)으로 바꾸지 마세요. 폴더 밖의 파일까지 마음대로 바꾸거나 지울 수 있어요.

> [!ok]
> 첫 요청을 보내면 Codex가 일하는 과정을 보여 주고, 끝나면 `1 file changed`나 `+12 -3` 같은 표시가 생겨요. 진짜 내 폴더의 파일이 바뀌었다는 뜻이에요.

> [!more] 터미널이 편하면
> 데스크톱 앱 대신 터미널에서 `codex` 명령으로 써도 돼요. 다만 OpenAI 요금표에는 터미널용 Codex CLI가 Plus 요금제부터 들어 있어요.
>
> > [!only os=mac]
> > ```bash
> > curl -fsSL https://chatgpt.com/codex/install.sh | sh
> > ```
>
> > [!only os=windows]
> > PowerShell을 열고:
> > ```powershell
> > powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"
> > ```
>
> 설치한 뒤 작업할 폴더로 이동해서 `codex`를 실행하고, 처음 한 번 **Sign in with ChatGPT**로 로그인해요.

> [!next] 준비 끝, 만들러 가기
