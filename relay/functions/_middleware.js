// 서울 입구 (dshs-relay.pages.dev, 2026-11-06)
//
// 한국 통신사는 Cloudflare 무료 요금제 IP(dshs.dev·workers.dev)를 LA(LAX)로 보내 첫 응답이 0.5~2초 걸린다.
// Cloudflare가 직접 관리하는 *.pages.dev IP는 같은 회선에서도 서울(ICN)로 들어온다. 사이트 주소를
// 회색 구름(DNS-only) CNAME으로 이 Pages 프로젝트에 붙이면 주소는 그대로 두고 서울로 들어온다
// (주황 구름이면 우리 존 IP로 풀려 다시 LAX). 대곽나루 포털 중계(server_connection docs/ops/portal-relay.md)와 같은 방식.
//
// 이 함수는 받은 요청을 그대로 Worker(dshs-developer-platform)에 service binding으로 넘긴다 —
// 같은 엣지 안에서 바로 부르므로 바다를 다시 건너지 않고, 주소·쿠키·헤더가 바뀌지 않는다.
// Worker가 받는 cf-connecting-ip도 실제 사용자 IP 그대로다(2026-11-06 wrangler tail로 확인).
//
// 함수 실행은 Workers 무료 하루 10만 건에 들어간다. 그래서 고정 파일(public/의 logo.svg·icon.svg —
// 원본은 저장소 public/logo.svg·src/app/icon.svg, 바꾸면 여기도 복사)은 _routes.json으로 함수 밖에서 Pages가 바로 준다.
// /_next/static은 빼지 않는다 — 평소엔 HTML이 dshs-assets.pages.dev에서 받지만(scripts/deploy.sh),
// 거기 못 올린 배포는 Worker가 주므로 여기서 막으면 사이트가 깨진다.

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  if (url.pathname === "/__relay-health") {
    return new Response(`ok colo=${request.cf?.colo || "-"}\n`, {
      headers: { "content-type": "text/plain", "cache-control": "no-store" },
    });
  }
  return env.APP.fetch(request);
}
