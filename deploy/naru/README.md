# 대곽나루 서버 배포 파일 (2026-11-11)

대곽나루에서 빌린 서버(`ssh dshs-srv-acad2ff0`, Ubuntu 24.04·1코어·2GB)에서 앱을 `next start`로 돌리는 파일들. 서버에는 손으로 복사한다.
설계 `docs/superpowers/specs/2026-11-11-naru-server-hosting-design.md`, 운영 설명 `docs/25-naru-server.md`.

root가 실행·읽는 것은 전부 root만 바꿀 수 있는 곳에 둔다 — 앱 계정(`dshs-app`)이 뚫려도 배포 스크립트·설정·비밀 값을 바꿔치기해 root가 되지 못하게(2026-11-11 리뷰).

| 파일 | 서버 위치 |
|---|---|
| `dshs.socket`·`dshs.service`·`dshs-deploy.service`·`dshs-deploy.timer` | `/etc/systemd/system/` |
| `deploy.sh` | `/usr/local/lib/dshs/deploy.sh` (root 755) |
| `preload.js`·`preload-lib.js` | `/usr/local/lib/dshs/` (root 644) — systemd 포트 넘겨받기, 요청 주소를 공개 주소로(`start` 뒤에 `-H`·`-p 443`), 멈출 때 서버 닫기 |
| `firewall.nft` | `/usr/local/lib/dshs/firewall.nft` (root 644) — 8080은 노드 게이트웨이 10.250.0.1과 서버 자신만, 우리 표 `inet dshs`만 만든다 |
| `dshs-firewall.service` | `/etc/systemd/system/` — 소켓이 Requires(방화벽 없이 8080이 열리지 않음) |
| `dshs.service.d/zzzz-harden.conf`·`dshs-deploy.service.d/zzzz-harden.conf` | `/etc/systemd/system/<유닛>.d/` — LXC 가 `zzz-lxc-service.conf`로 끈 `ProtectProc`·`NoNewPrivileges`를 이름 순으로 뒤에서 다시 켬(앱·빌드가 다른 계정 프로세스 명령줄을 못 봄) |
| `env.example` | `/etc/dshs/env`의 키 이름 (root 600, 값은 서버에만) |

그 밖: `/etc/dshs/deploy.conf`(받을 곳 바꾸기, 선택), `/srv/dshs`(root 755) 아래 `current` 링크(root)와 `repo/`·`releases/`·`static-pool/`(dshs-app), 빌드 로그 `/var/log/dshs-deploy/`, 실패한 커밋 `/var/lib/dshs-deploy/failed-sha`.

## 처음 설치

```bash
sudo apt-get install -y git nftables            # Node 22는 NodeSource
sudo useradd --system --home-dir /srv/dshs --shell /usr/sbin/nologin dshs-app
sudo install -d -m 755 -o root -g root /srv/dshs /usr/local/lib/dshs
sudo install -d -m 700 -o root -g root /etc/dshs
sudo install -d -m 755 -o dshs-app -g dshs-app /srv/dshs/releases /srv/dshs/static-pool
# 파일 복사(위 표) 후
# nftables.service 는 켜지 않는다(그 유닛은 멈출 때 flush ruleset) — 방화벽은 dshs-firewall.service 가
sudo systemctl daemon-reload && sudo systemctl enable --now dshs-firewall.service dshs.socket dshs.service dshs-deploy.timer
```

## 자주 쓰는 것

```bash
journalctl -u dshs-deploy --since today --no-pager | grep -E '배포|실패'   # 배포 기록
journalctl -u dshs -f                                                      # 앱 로그([naru] …)
sudo systemctl start dshs-deploy                                           # 지금 배포(바뀐 것 없으면, 실패했던 커밋이면 그대로)
sudo /usr/local/lib/dshs/deploy.sh --force                                 # 같은 커밋도 새 폴더에 다시 빌드(env 의 NEXT_PUBLIC_* 바꿨을 때·실패 뒤 재시도)
sudo systemctl stop dshs.socket dshs                                       # 일부러 멈추기
```

받을 곳은 기본 GitHub `main`. 시험 때는 `/etc/dshs/deploy.conf`에 `REPO_URL=/srv/dshs/src.bundle`·`BRANCH=naru-server`를 두고
맥에서 `git bundle create … naru-server`로 만든 파일을 `/srv/dshs/src.bundle`(root 644)로 올린다.

시험: `node --test deploy/naru/test/`(preload 순수 함수). 앱 쪽 Node 경로는 `npm test`.
