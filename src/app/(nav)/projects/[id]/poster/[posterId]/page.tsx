import { redirect } from "next/navigation";

// 만들기 화면도 수정 화면 옆 칸 안으로 옮겼다(2026-11-07) — 권한·포스터 확인은 칸이 부르는 getPosterStudio 가 한다
export default async function PosterStudioPage({ params }: { params: Promise<{ id: string; posterId: string }> }) {
  const { id, posterId } = await params;
  redirect(`/projects/${id}/edit?poster=${encodeURIComponent(posterId)}`);
}
