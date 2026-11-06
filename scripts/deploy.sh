#!/usr/bin/env bash
# npm run deploy — main 푸시마다 Workers Builds가 실행한다(로컬 수동 배포도 같음).
#
# 정적 파일(/_next/static)을 Cloudflare Pages(*.pages.dev)에 올리고 HTML이 거기서 받게 빌드한다(2026-11-06).
# 한국(KT) 접속은 Cloudflare 무료 망이 dshs.dev를 LAX로 보내 JS 한 파일도 1초 넘게 걸리고, 첫 방문은 코드 20개를 다 받는 데
# 13초가 걸렸다. *.pages.dev는 같은 회선에서도 서울(ICN)에서 응답한다. 사이트 주소·HTML·API는 그대로다.
# 영화대교(movie-ticket)·대곽나루와 같은 방식 — .claude/rules/performance.md 「정적 파일은 pages.dev에서」.
#
# 배포마다 새 브랜치 주소(<ID>.dshs-assets.pages.dev)에 올린다. Pages 배포는 지워지지 않으므로
# 이미 열려 있는 옛 화면이 옛 파일을 찾아도 404가 안 난다.
# Pages에 못 올리면 배포를 멈추지 않고 예전처럼 Worker가 정적 파일을 주는 빌드로 다시 만든다.
set -euo pipefail

PAGES_PROJECT=dshs-assets
# Workers Builds는 CLOUDFLARE_ACCOUNT_ID를 넣어 준다. 로컬은 로그인한 계정이 여러 개라 직접 정한다(비밀 아님, wrangler.jsonc와 같음).
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-370e521d89a70d895de8448a36449b93}"
export WRANGLER_SEND_METRICS=false

ID="d$(date -u +%Y%m%d%H%M%S)"
ASSET_ORIGIN="https://$ID.$PAGES_PROJECT.pages.dev"
ROOT="$(pwd)"

# 리눅스(Workers Builds)엔 timeout이 있고 macOS엔 없을 수 있다
with_timeout() {
  if command -v timeout >/dev/null 2>&1; then timeout "$@"; else shift; "$@"; fi
}

upload_static() {
  local dir probe
  dir="$(mktemp -d)"
  mkdir -p "$dir/_next"
  cp -R .open-next/assets/_next/static "$dir/_next/static"
  # 글꼴(CSS의 url())은 다른 출처면 CORS 헤더가 있어야 쓰인다.
  cat > "$dir/_headers" <<'HEADERS'
/_next/static/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=31536000, immutable
HEADERS
  # 프로젝트 폴더에서 돌리면 wrangler.jsonc(Worker 설정)를 읽으므로 올릴 폴더 안에서 돌린다.
  (cd "$dir" && with_timeout 300 "$ROOT/node_modules/.bin/wrangler" pages deploy . \
    --project-name "$PAGES_PROJECT" --branch "$ID" --commit-dirty=true) || return 1
  # 이번 빌드의 파일 하나가 실제로 열리는지 본다(새 주소 반영 지연 대비 최대 60초).
  probe="$(cd "$dir" && find _next/static -name '*.js' | head -1)"
  [[ -n "$probe" ]] || return 1
  for _ in $(seq 1 12); do
    node -e 'fetch(process.argv[1]).then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))' \
      "$ASSET_ORIGIN/$probe" && return 0
    sleep 5
  done
  return 1
}

if ASSET_PREFIX="$ASSET_ORIGIN" npx opennextjs-cloudflare build && upload_static; then
  echo "정적 파일: $ASSET_ORIGIN"
else
  echo "정적 파일 올리기 실패 — Pages 없이 다시 빌드"
  npx opennextjs-cloudflare build
fi
npx opennextjs-cloudflare deploy
