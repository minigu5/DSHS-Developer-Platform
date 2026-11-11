#!/usr/bin/env bash
# DSHS 개발자 플랫폼 자동 배포 — /srv/dshs/deploy.sh (2026-11-11). dshs-deploy.timer 가 2분마다 root 로 부른다.
# origin/main 이 지금 릴리스와 다를 때만 새 릴리스를 서버에서 직접 빌드하고(1코어라 nice 19), 성공하면 바꿔 끼우고 재시작한다.
# 빌드가 실패하면 아무것도 안 바꾸고, 재시작 뒤 /login 이 200 이 아니면 이전 릴리스로 되돌린다.
#
# 구조:  /srv/dshs/repo             git clone(공개 저장소, https — 이 서버에서 github.com:22 는 막혀 있다)
#        /srv/dshs/releases/<sha>   빌드 결과(최근 3개 + 지금 것)
#        /srv/dshs/current          → 지금 릴리스(dshs.service 가 여기서 실행)
#        /srv/dshs/static-pool      지난 빌드들의 /_next/static(14일) — 배포 전에 연 탭이 옛 조각을 찾아도 404 가 안 나게 새 릴리스에 채운다
#        /srv/dshs/.env             비밀 값(dshs-app 600). NEXT_PUBLIC_* 는 빌드 때 번들에 박힌다
# 수동:  sudo systemctl start dshs-deploy        (바뀐 것 없으면 아무것도 안 함)
#        sudo /srv/dshs/deploy.sh --force        (같은 커밋도 다시 빌드 — .env 의 NEXT_PUBLIC_* 를 바꿨을 때)
# 되돌리기: sudo ln -sfn /srv/dshs/releases/<이전 sha> /srv/dshs/current && sudo systemctl restart dshs
set -euo pipefail

ROOT=/srv/dshs
REPO="$ROOT/repo"
APP_USER=dshs-app
REPO_URL=https://github.com/minigu5/DSHS-Developer-Platform.git
BRANCH=main
KEEP=3
# 시험 때는 /srv/dshs/deploy.conf 로 받을 곳을 바꾼다(예: REPO_URL=/srv/dshs/src.bundle, BRANCH=naru-server — git bundle 파일도 원격으로 쓸 수 있다)
# shellcheck disable=SC1091
[[ -f "$ROOT/deploy.conf" ]] && . "$ROOT/deploy.conf"

FORCE=0
[[ "${1:-}" == "--force" ]] && FORCE=1

log() { echo "[$(date '+%F %T')] $*"; }
as_app() { runuser -u "$APP_USER" -- "$@"; }

exec 9>"$ROOT/.deploy.lock"
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
PREV="$(readlink -f "$ROOT/current" 2>/dev/null || true)"
if [[ $FORCE -eq 0 && "$(basename "${PREV:-none}")" == "$SHA" ]]; then
  exit 0
fi

REL="$ROOT/releases/$SHA"
log "배포 시작 ${SHA:0:7}"
rm -rf "$REL"
as_app mkdir -p "$REL"
as_app git -C "$REPO" archive "$SHA" | as_app tar -x -C "$REL"

build() {
  # .env 를 읽어 빌드에 넘긴다(NEXT_PUBLIC_* 가 번들에 박힘). runuser 는 환경을 그대로 넘긴다.
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.env"
  set +a
  cd "$REL"
  as_app nice -n 19 npm ci --no-audit --no-fund --loglevel=error
  as_app env DSHS_RUNTIME=node NEXT_TELEMETRY_DISABLED=1 nice -n 19 npm run build
}
if ! (build) > "$REL.build.log" 2>&1; then
  log "빌드 실패 — 지금 릴리스 유지 (로그 $REL.build.log)"
  tail -20 "$REL.build.log"
  exit 1
fi

# 옛 /_next/static 채우기: 이번 빌드를 모아 두는 곳에 더하고(14일 지난 건 지움), 모아 둔 것 중 없는 파일만 새 릴리스에
as_app mkdir -p "$ROOT/static-pool"
as_app cp -r --update=none "$REL/.next/static/." "$ROOT/static-pool/"
find "$ROOT/static-pool" -type f -mtime +14 -delete
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
  log "새 릴리스 /login 실패 — 이전 릴리스로 되돌림"
  if [[ -n "$PREV" && -d "$PREV" ]]; then
    ln -sfn "$PREV" "$ROOT/current.new"
    mv -Tf "$ROOT/current.new" "$ROOT/current"
    systemctl restart dshs.service
  fi
  exit 1
fi
log "배포 완료 ${SHA:0:7}"

# 오래된 릴리스 정리(지금 것은 남김)
CUR="$(readlink -f "$ROOT/current")"
ls -1dt "$ROOT"/releases/*/ 2>/dev/null | sed 's#/$##' | grep -vx "$CUR" | tail -n +$((KEEP + 1)) | while read -r old; do
  rm -rf "$old" "$old.build.log"
done
