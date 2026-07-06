import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function buildIpHash(request: NextRequest): Promise<string> {
  const ip =
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

  // 로그인 유저 또는 IP 해시로 중복 방지
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId: string | null = user?.id ?? null;
  const ipHash: string | null = userId ? null : await buildIpHash(request);

  // 원자적 클릭 추적 (중복이면 RPC가 false 반환, count 증가 안 함)
  await supabase.rpc("track_project_click", {
    p_project_id: projectId,
    p_user_id: userId,
    p_ip_hash: ipHash,
  });

  return NextResponse.redirect(targetUrl, { status: 302 });
}
