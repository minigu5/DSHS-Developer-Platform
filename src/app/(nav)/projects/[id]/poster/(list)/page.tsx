import { redirect } from "next/navigation";

// 포스터 화면은 프로젝트 수정 화면의 옆 칸으로 옮겼다(2026-11-07) — 옛 주소·북마크는 그 칸을 연 수정 화면으로
export default async function PosterListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/projects/${id}/edit?poster=list`);
}
