# 대곽나루 서버 배포 파일 (2026-11-11)

대곽나루에서 빌린 서버(`ssh dshs-srv-acad2ff0`, Ubuntu 24.04·1코어·2GB)에서 앱을 `next start`로 돌리는 파일들. 서버에는 손으로 복사한다.
설계 `docs/superpowers/specs/2026-11-11-naru-server-hosting-design.md`, 운영 설명 `docs/25-naru-server.md`.

| 파일 | 서버 위치 |
|---|---|
| `dshs.socket`·`dshs.service`·`dshs-deploy.service`·`dshs-deploy.timer` | `/etc/systemd/system/` |
| `deploy.sh` | `/srv/dshs/deploy.sh` (root 750) |
| `socket-fd.js` | `/srv/dshs/socket-fd.js` (root 644) |
| `nftables.conf` | `/etc/nftables.conf` (8080은 노드 게이트웨이 10.250.0.1과 서버 자신만) |
| `env.example` | `/srv/dshs/.env`의 키 이름 (dshs-app 600, 값은 서버에만) |

## 처음 설치

```bash
sudo apt-get install -y git nftables            # Node 22는 NodeSource
sudo useradd --system --home-dir /srv/dshs --shell /usr/sbin/nologin dshs-app
sudo mkdir -p /srv/dshs/releases && sudo chown -R dshs-app:dshs-app /srv/dshs && sudo chmod 750 /srv/dshs
# 파일 복사(위 표) 후
sudo nft -f /etc/nftables.conf && sudo systemctl enable nftables
sudo systemctl daemon-reload && sudo systemctl enable --now dshs.socket dshs.service dshs-deploy.timer
```

## 자주 쓰는 것

```bash
journalctl -u dshs-deploy --since today --no-pager | grep -E '배포|실패'   # 배포 기록
journalctl -u dshs -f                                                      # 앱 로그([naru] …)
sudo systemctl start dshs-deploy                                           # 지금 배포(바뀐 것 없으면 그대로)
sudo /srv/dshs/deploy.sh --force                                           # 같은 커밋 다시 빌드(.env 의 NEXT_PUBLIC_* 바꿨을 때)
sudo systemctl stop dshs.socket dshs                                       # 일부러 멈추기
```

받을 곳은 기본 GitHub `main`. 시험 때는 `/srv/dshs/deploy.conf`에 `REPO_URL=/srv/dshs/src.bundle`·`BRANCH=naru-server`를 두고
맥에서 `git bundle create … naru-server`로 만든 파일을 올린다.
