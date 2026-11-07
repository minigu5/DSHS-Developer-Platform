export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isDeveloper } from "@/lib/constants";
import { getLiveDomain } from "@/lib/domains/read";
import { loadProjectDetail } from "@/lib/projects/detail";
import { ProjectDetailView } from "@/components/projects/project-detail-view";
import { QuickViewRealPage } from "@/components/projects/quick-view";
import { personLabel } from "@/lib/admin/people";
import { getProjectLock } from "@/lib/projects/lock";

// 화면은 ProjectDetailView 가 그린다 — 목록에서 누르면 브라우저가 같은 화면을 Supabase 로 바로 그린다(quick-view.tsx).
// 여기는 주소 직접 입력·새로 고침·새 탭·관리자용.
export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 개발자 계정은 비공개 프로젝트도 볼 수 있도록 어드민 클라이언트 사용
  const isAdmin = isDeveloper(user?.email);
  const queryClient = isAdmin ? createAdminClient() : supabase;
  const viewer = user ? { id: user.id, email: user.email ?? null } : null;

  const [detail, liveDomain] = await Promise.all([
    loadProjectDetail({ data: queryClient, self: supabase }, id, viewer),
    getLiveDomain(id, true),
  ]);
  if (!detail) notFound();

  // 관리자(개발자 계정)에게만 익명 프로젝트의 실제 주인을 보여 준다(2026-11-05 사용자 요청). queryClient 가 서비스 키라 author_id 를 읽을 수 있다
  let anonymousOwner: { id: string; name: string } | null = null;
  if (isAdmin && detail.project.author_role === 'anonymous') {
    const { data } = await queryClient
      .from('projects')
      .select('author_id, owner:users!projects_author_id_fkey(nickname, full_name)')
      .eq('id', id)
      .single();
    if (data) anonymousOwner = { id: data.author_id, name: personLabel(Array.isArray(data.owner) ? data.owner[0] : data.owner) };
  }

  // 관리자 잠금은 주인·팀원·관리자에게만 이유까지 보여 준다(project_locks 는 서비스 키 전용). 잠기면 늘 비공개라 공개 프로젝트는 안 본다
  const lock = detail.canEdit && detail.project.visibility === 'private' ? await getProjectLock(id) : null;

  return (
    <>
      <QuickViewRealPage />
      <ProjectDetailView
        detail={detail}
        viewerId={user?.id ?? null}
        isAdmin={isAdmin}
        liveDomain={liveDomain}
        anonymousOwner={anonymousOwner}
        lock={lock}
      />
    </>
  );
}
