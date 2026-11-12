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
# 릴리스 폴더 이름 규칙(<sha>-<UTC 시각>, 옛 것은 <sha>만)
RELEASE_RE='^/srv/dshs/releases/[0-9a-f]{40}(-[0-9]{14})?$'
# root 가 만드는 파일(빌드 로그 등)은 남이 못 읽게
umask 027

log() { echo "[$(date '+%F %T')] $*"; }
as_app() { runuser -u "$APP_USER" -- "$@"; }

mkdir -p "$LOG_DIR" "$STATE_DIR"
# sudo 로 손으로 돌리면 작업 폴더가 내 홈이라 dshs-app 으로 돈 find 가 "initial working directory" 에서 실패하고 멈췄다
cd /
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

# current 는 root 가 만든 링크라 그 글자만 읽는다(-f 로 따라가면 dshs-app 이 바꿀 수 있는 폴더 쪽 링크를 믿게 됨, 2026-11-12 보안 점검).
# 처음엔 current 가 없다. 릴리스 이름 규칙에 안 맞으면 없는 것으로.
PREV=""
[[ -L "$ROOT/current" ]] && PREV="$(readlink "$ROOT/current")"
[[ "$PREV" =~ $RELEASE_RE ]] || PREV=""
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
  # 빌드에는 공개 값(NEXT_PUBLIC_*, 번들에 박힘)만 — 서비스 키·토큰은 npm 패키지 설치·빌드 코드에 넘기지 않는다(2026-11-12 보안 점검).
  # 의존성 install 스크립트는 돌리지 않는다(--ignore-scripts) — 패키지 하나가 악성이면 빌드 중에 서버에서 코드가 돈다.
  local pub=()
  mapfile -t pub < <(grep -E '^NEXT_PUBLIC_[A-Z0-9_]+=' "$ENV_FILE")
  cd "$REL"
  as_app env -i PATH=/usr/bin:/bin HOME=/srv/dshs "${pub[@]}" nice -n 19 npm ci --ignore-scripts --no-audit --no-fund --loglevel=error
  as_app env -i PATH=/usr/bin:/bin HOME=/srv/dshs "${pub[@]}" DSHS_RUNTIME=node NEXT_TELEMETRY_DISABLED=1 nice -n 19 npm run build
}
fail() {
  echo "$SHA" > "$STATE_DIR/failed-sha"
  log "$1"
  exit 1
}
if ! (build) > "$LOG" 2>&1; then
  tail -20 "$LOG"
  as_app rm -rf -- "$REL"
  fail "빌드 실패 — 지금 릴리스 유지 (로그 $LOG, sudo $0 --force 로 다시)"
fi

# 앱이 쓰는 유일한 곳(dshs.service ReadWritePaths) — 없으면 systemd 가 건너뛰고 캐시 쓰기만 실패하므로 미리 만든다
as_app mkdir -p "$REL/.next/cache"

# 옛 /_next/static 채우기: 이번 빌드를 모아 두는 곳에 더하고(14일 지난 건 지움), 모아 둔 것 중 없는 파일만 새 릴리스에
as_app mkdir -p "$ROOT/static-pool"
# 지금 돌고 있는 릴리스의 조각은 덮어써서 날짜를 새로 — 오래 배포가 없다가 배포해도 직전 릴리스 조각이 14일 정리에 안 걸리게(2026-11-11 리뷰)
[[ -n "$PREV" && -d "$PREV/.next/static" ]] && as_app cp -r "$PREV/.next/static/." "$ROOT/static-pool/"
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

# 오래된 릴리스·로그 정리(지금 것은 남김). releases/ 는 dshs-app 폴더라 이름을 믿지 않는다 — 줄바꿈 든 이름으로
# root 가 /etc 를 지우게 할 수 있었다(2026-11-12 보안 점검). 그래서 NUL 구분 + 이름 규칙 검사 + 지우기도 dshs-app 으로.
CUR="$(readlink "$ROOT/current")"
as_app find "$ROOT/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\0' | sort -z -rn | {
  n=0
  while IFS= read -r -d '' line; do
    old="${line#* }"
    [[ "$old" =~ $RELEASE_RE && "$old" != "$CUR" ]] || continue
    n=$((n + 1))
    [[ $n -le $KEEP ]] || as_app rm -rf -- "$old"
  done
}
find "$LOG_DIR" -type f -mtime +30 -delete
