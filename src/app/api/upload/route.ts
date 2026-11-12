import { NextResponse, type NextRequest } from "next/server";

import { cloudinary } from "@/lib/cloudinary";
import { releaseUsage, reserveUsage } from "@/lib/posters/usage";
import { isSameOrigin } from "@/lib/same-origin";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  // 학생 주소(*.dshs.dev)에서 보낸 요청은 same-site 라 쿠키가 실려 온다 — 출처를 직접 확인
  if (!isSameOrigin(request.headers, [request.nextUrl.origin, process.env.NEXT_PUBLIC_SITE_URL ?? ""])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "JPG, PNG, GIF, WebP, SVG 형식만 업로드할 수 있습니다." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기는 10MB를 초과할 수 없습니다." }, { status: 400 });
  }

  // 한 사람이 Cloudinary 용량을 다 쓰지 못하게 하루 횟수를 묶는다
  const usage = await reserveUsage("upload", user.id);
  if (usage !== "ok") {
    return NextResponse.json({ error: "오늘은 이미지를 너무 많이 올렸어요. 내일 다시 해 주세요." }, { status: 429 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

    // SVG는 변환하지 않는다 — fetch_format:auto 가 SVG 자체 크기(아이콘은 보통 24px)의 PNG로 바꿔서 흐려졌다.
    // 화면에는 <img>로만 보여 주므로 SVG 속 스크립트는 실행되지 않는다.
    const isSvg = file.type === "image/svg+xml";
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "dshs",
      resource_type: "image",
      ...(isSvg ? {} : { transformation: [{ quality: "auto:good", fetch_format: "auto" }] }),
    });

    return NextResponse.json({ url: result.secure_url });
  } catch {
    await releaseUsage("upload", user.id);
    return NextResponse.json({ error: "업로드에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
