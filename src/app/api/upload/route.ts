import { NextResponse, type NextRequest } from "next/server";

import { cloudinary } from "@/lib/cloudinary";
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

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "dshs",
      resource_type: "image",
      transformation: [{ quality: "auto:good", fetch_format: "auto" }],
    });

    return NextResponse.json({ url: result.secure_url });
  } catch {
    return NextResponse.json({ error: "업로드에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
