import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { dshsNameOf, visitUrlFor } from "@/lib/domains/visit-url";

async function buildIpHash(request: NextRequest): Promise<string> {
  // Cloudflare 가 넣는 cf-connecting-ip 를 먼저 — x-forwarded-for 첫 값은 요청자가 꾸밀 수 있음
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ua = request.headers.get("user-agent") || "";
  const raw = new TextEncoder().encode(ip + "|" + ua);
  const buf = await crypto.subtle.digest("SHA-256", raw);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("project");

  if (!projectId) {
    return NextResponse.redirect(new URL("/explore", request.url));
  }

  const supabase = await createClient();

  // 프로젝트 URL 조회 (open redirect 방지: to 파라미터 미사용)
  const { data: project } = await supabase
    .from("projects")
    .select("url")
    .eq("id", projectId)
    .single();

  const targetUrl = project?.url;
  if (!targetUrl) {
    return NextResponse.redirect(new URL("/explore", request.url));
  }

  // http/https 스킴만 허용 (javascript: / data: 등 차단)
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.redirect(new URL("/explore", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/explore", request.url));
  }

  // 로그인 유저 또는 IP 해시로 중복 방지
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId: string | null = user?.id ?? null;
  const ipHash: string | null = userId ? null : await buildIpHash(request);

  const admin = createAdminClient();

  // 원자적 클릭 추적 (중복이면 RPC가 false 반환, count 증가 안 함)
  // RPC는 service_role 전용 — 브라우저에서 ip_hash 를 바꿔 가며 직접 부르지 못하게 (migration 20261027100000)
  await admin.rpc("track_project_click", {
    p_project_id: projectId,
    p_user_id: userId,
    p_ip_hash: ipHash,
  });

  // 방문 주소가 아직 연결이 안 끝난 <이름>.dshs.dev면 자리표시(dshs.dev) 대신 원래 사이트로.
  // subdomains 는 RLS 가 본인만 보여서 서비스 키로 읽는다 — 위에서 사용자 키로 이 프로젝트를 볼 수 있는 것은 확인함
  const dshsName = dshsNameOf(targetUrl);
  if (dshsName) {
    const { data: domain } = await admin
      .from("subdomains")
      .select("status, previous_url, site_url")
      .eq("project_id", projectId)
      .eq("name", dshsName)
      .in("status", ["reserved", "pending", "active", "broken"])
      .maybeSingle();
    return NextResponse.redirect(visitUrlFor(targetUrl, domain), { status: 302 });
  }

  return NextResponse.redirect(targetUrl, { status: 302 });
}
