#!/usr/bin/env bash
# DSHS 개발자 플랫폼 자동 배포 — /usr/local/lib/dshs/deploy.sh (2026-11-11). dshs-deploy.timer 가 2분마다 root 로 부른다.
# 받을 곳의 커밋이 지금 릴리스와 다를 때만 새 릴리스를 서버에서 직접 빌드하고(1코어라 nice 19), 성공하면 바꿔 끼우고 재시작한다.
# 빌드가 실패하면 아무것도 안 바꾸고, 재시작 뒤 /login 이 200 이 아니면 이전 릴리스로 되돌린다. 실패한 커밋은 --force 전까지 다시 안 한다.
#
# root 가 실행·읽는 것은 전부 root 만 바꿀 수 있는 곳에 둔다 — 앱 계정(dshs-app)이 뚫려도 이 스크립트·설정·.env 를 바꿔치기해 root 가 되지 못하게.
#   /usr/local/lib/dshs/        이 스크립트·preload.js (root)
#   /etc/dshs/env               비밀 값(root 600, systemd EnvironmentFile). NEXT_PUBLIC_* 는 빌드 때 번들에 박힌다
#   /etc/dshs/deploy.conf       받을 곳 바꾸기(선택, root)
#   /srv/dshs/                  root 755 — current(→ 지금 릴리스) 링크도 root 가 만든다
#   /srv/dshs/{repo,releases,static-pool}   dshs-app 소유. git·npm·빌드는 dshs-app 으로만(runuser)
#   /var/log/dshs-deploy/       빌드 로그(root), /var/lib/dshs-deploy/failed-sha  실패한 커밋
# 수동:  sudo systemctl start dshs-deploy                 (바뀐 것 없으면 아무것도 안 함)
#        sudo /usr/local/lib/dshs/deploy.sh --force       (같은 커밋도 새 폴더에 다시 빌드 — env 의 NEXT_PUBLIC_* 바꿨을 때)
# 되돌리기: sudo ln -sfn /srv/dshs/releases/<이전 폴더> /srv/dshs/current && sudo systemctl restart dshs
set -euo pipefail

ROOT=/srv/dshs
REPO="$ROOT/repo"
APP_USER=dshs-app
REPO_URL=https://github.com/minigu5/DSHS-Developer-Platform.git
BRANCH=main
KEEP=3
ENV_FILE=/etc/dshs/env
LOG_DIR=/var/log/dshs-deploy
STATE_DIR=/var/lib/dshs-deploy
# 시험 때는 /etc/dshs/deploy.conf 로 받을 곳을 바꾼다(예: REPO_URL=/srv/dshs/src.bundle, BRANCH=naru-server — git bundle 파일도 원격으로 쓸 수 있다)
# shellcheck disable=SC1091
[[ -f /etc/dshs/deploy.conf ]] && . /etc/dshs/deploy.conf

FORCE=0
[[ "${1:-}" == "--force" ]] && FORCE=1

log() { echo "[$(date '+%F %T')] $*"; }
as_app() { runuser -u "$APP_USER" -- "$@"; }

mkdir -p "$LOG_DIR" "$STATE_DIR"
exec 9>/run/dshs-deploy.lock
flock -n 9 || { log "다른 배포가 도는 중 — 건너뜀"; exit 0; }

if [[ ! -d "$REPO/.git" ]]; then
  as_app git clone -q --no-checkout "$REPO_URL" "$REPO"
fi
as_app git -C "$REPO" remote set-url origin "$REPO_URL"
# 네트워크가 멈추면 이번 회차는 포기한다
if ! as_app timeout 120 git -C "$REPO" fetch -q origin "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"; then
  log "git fetch 실패 — 다음 회차에"
  exit 0
fi
SHA="$(as_app git -C "$REPO" rev-parse "origin/$BRANCH")"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { log "커밋 이름이 이상함 — 중단"; exit 1; }

# 처음엔 current 가 없다 — readlink -f 는 없는 경로도 그대로 돌려줘서, 되돌릴 때 current 가 자기 자신을 가리켰다(2026-11-11)
PREV=""
[[ -L "$ROOT/current" ]] && PREV="$(readlink -f "$ROOT/current")"
PREV_BASE="$(basename "${PREV:-none}")"
if [[ $FORCE -eq 0 ]]; then
  [[ "${PREV_BASE%%-*}" == "$SHA" ]] && exit 0
  # 빌드·기동에 실패한 커밋을 2분마다 다시 하지 않는다(사이트가 매번 끊김)
  [[ "$(cat "$STATE_DIR/failed-sha" 2>/dev/null)" == "$SHA" ]] && exit 0
fi

# 늘 새 폴더에 — 같은 커밋을 --force 로 다시 빌드해도 돌고 있는 폴더를 건드리지 않는다
STAMP="$(date -u +%Y%m%d%H%M%S)"
REL="$ROOT/releases/$SHA-$STAMP"
LOG="$LOG_DIR/$SHA-$STAMP.log"
log "배포 시작 ${SHA:0:7} → $(basename "$REL")"
as_app mkdir -p "$REL"
as_app git -C "$REPO" archive "$SHA" | as_app tar -x -C "$REL"

build() {
  # env 는 root 소유 파일이라 root 가 읽어 넘긴다(NEXT_PUBLIC_* 가 번들에 박힘). runuser 는 환경을 그대로 넘긴다.
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
  cd "$REL"
  as_app nice -n 19 npm ci --no-audit --no-fund --loglevel=error
  as_app env DSHS_RUNTIME=node NEXT_TELEMETRY_DISABLED=1 nice -n 19 npm run build
}
fail() {
  echo "$SHA" > "$STATE_DIR/failed-sha"
  log "$1"
  exit 1
}
if ! (build) > "$LOG" 2>&1; then
  tail -20 "$LOG"
  rm -rf "$REL"
  fail "빌드 실패 — 지금 릴리스 유지 (로그 $LOG, sudo $0 --force 로 다시)"
fi

# 옛 /_next/static 채우기: 이번 빌드를 모아 두는 곳에 더하고(14일 지난 건 지움), 모아 둔 것 중 없는 파일만 새 릴리스에
as_app mkdir -p "$ROOT/static-pool"
as_app cp -r --update=none "$REL/.next/static/." "$ROOT/static-pool/"
as_app find "$ROOT/static-pool" -type f -mtime +14 -delete
as_app cp -r --update=none "$ROOT/static-pool/." "$REL/.next/static/"

ln -sfn "$REL" "$ROOT/current.new"
mv -Tf "$ROOT/current.new" "$ROOT/current"
systemctl restart dshs.service

ok=0
for _ in $(seq 1 30); do
  if [[ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:8080/login)" == "200" ]]; then ok=1; break; fi
  sleep 2
done
if [[ $ok -ne 1 ]]; then
  if [[ -n "$PREV" && -d "$PREV" ]]; then
    ln -sfn "$PREV" "$ROOT/current.new"
    mv -Tf "$ROOT/current.new" "$ROOT/current"
    systemctl restart dshs.service
  fi
  fail "새 릴리스 /login 실패 — 이전 릴리스로 되돌림"
fi
rm -f "$STATE_DIR/failed-sha"
log "배포 완료 ${SHA:0:7}"

# 오래된 릴리스·로그 정리(지금 것은 남김)
CUR="$(readlink -f "$ROOT/current")"
ls -1dt "$ROOT"/releases/*/ 2>/dev/null | sed 's#/$##' | grep -vx "$CUR" | tail -n +$((KEEP + 1)) | while read -r old; do
  rm -rf "$old"
done
find "$LOG_DIR" -type f -mtime +30 -delete
