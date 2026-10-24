export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Globe, Code2, Lock, Star, ExternalLink, ShieldCheck, ShieldAlert, ArrowLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn, isExternalImage } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ProjectReviews } from "@/components/projects/project-reviews";
import { ProjectIcon } from "@/components/projects/project-icon";
import { EditButton } from "@/components/projects/edit-button";
import type { ReviewItem } from "@/components/projects/review-list";
import { LICENSE_FEATURES, PLATFORMS, isDeveloper, projectTypeLabels } from "@/lib/constants";
import { SECTION_COLORS } from "@/lib/section-colors";
import { StatStrip, type StatStripItem } from "@/components/projects/stat-strip";
import { ReadingSurface } from "@/components/shared/reading-surface";
import { Markdown } from "@/components/shared/markdown";

const LICENSE_LABELS: Record<string, string> = {
  commercial: "상업적 이용",
  modify: "수정",
  distribute: "배포",
  private: "개인적 이용",
  liability: "법적 책임(Author)",
  warranty: "보증 제공"
};

const RESTRICTED_LABELS: Record<string, string> = {
  commercial: "상업적 이용 불가",
  modify: "수정 불가",
  distribute: "배포 불가",
  private: "개인적 이용 제한",
  liability: "법적 책임 무관",
  warranty: "보증 미제공"
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 개발자 계정은 비공개 프로젝트도 볼 수 있도록 어드민 클라이언트 사용
  const queryClient = isDeveloper(user?.email) ? createAdminClient() : supabase;

  const [projectResult, reviewsResult] = await Promise.all([
    queryClient
      .from('projects')
      .select(`*, users (*)`)
      .eq('id', id)
      .single(),
    queryClient
      .from('reviews')
      .select('id, rating, comment, created_at, user_id, user:users(*)')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const { data: project, error } = projectResult;

  if (error || !project) {
    notFound();
  }

  const { data: reviewsData } = reviewsResult;

  // 팀 프로젝트인 경우 팀원 프로필 조회
  const teamMemberProfiles: Array<{
    id: string;
    email: string;
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }> = [];
  if (project.author_role === 'team' && project.team_members?.length) {
    const { data: members } = await queryClient
      .from('users')
      .select('id, email, nickname, full_name, avatar_url')
      .in('email', project.team_members);
    if (members) teamMemberProfiles.push(...members);
  }

  const reviews: ReviewItem[] = (reviewsData ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    user_id: r.user_id,
    user: Array.isArray(r.user) ? r.user[0] ?? null : r.user,
  }));

  const reviewCount = reviews.length;
  const ratedReviews = reviews.filter((r) => r.rating != null);
  const avgRating =
    ratedReviews.length > 0
      ? ratedReviews.reduce((sum, r) => sum + r.rating!, 0) / ratedReviews.length
      : 0;

  const authorName =
    (project.author_role === 'team'
      ? project.team_name
      : project.users?.nickname || project.users?.full_name) ?? '알 수 없음';
  const tags = project.features || [];

  const platformLabels: string[] = (project.platforms ?? []).map(
    (v: string) => PLATFORMS.find((p) => p.value === v)?.label ?? v,
  );
  const isWebsiteAll = (project.types ?? []).includes("website") && platformLabels.length >= PLATFORMS.length;
  const allowedCount = (project.license_features ?? []).length;
  const createdLabel = new Date(project.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  const stats: StatStripItem[] = [
    {
      label: "별점",
      // 별점 없는 리뷰만 있으면 평균을 보여줄 수 없으므로 "–" (리뷰 수는 그대로)
      value:
        ratedReviews.length > 0 ? (
          <>
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
            <span className="sr-only">5점 만점에 </span>
            {avgRating.toFixed(1)}
          </>
        ) : (
          "–"
        ),
      sub: reviewCount > 0 ? `리뷰 ${reviewCount}개` : "아직 리뷰가 없어요",
    },
    ...(project.url
      ? [{ label: "방문", value: (project.click_count ?? 0).toLocaleString("ko-KR"), sub: "회" }]
      : []),
    {
      label: "플랫폼",
      value: isWebsiteAll ? "Web" : (platformLabels[0] ?? "–"),
      sub: isWebsiteAll ? "모든 브라우저" : platformLabels.length > 1 ? `외 ${platformLabels.length - 1}개` : undefined,
    },
    {
      label: "소스코드",
      value: project.source_type === "open" ? "오픈소스" : "비공개",
      sub: `허용 ${allowedCount}개`,
    },
  ];

  const sideCard = "rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
  const sideTitle = "mb-3.5 text-[13px] font-semibold text-zinc-900 dark:text-white";

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-7">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1 rounded-sm text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          모든 프로젝트
        </Link>

        {/* 머리 — 아이콘 스티커 + 제목·설명·작성자·버튼 */}
        <div className="mt-5 flex items-start gap-4 sm:gap-7">
          <ProjectIcon
            src={project.icon_url}
            title={project.title}
            className="h-[72px] w-[72px] shrink-0 rounded-[22%] ring-[3px] ring-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)] dark:ring-zinc-950 sm:h-28 sm:w-28"
            decorative
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {projectTypeLabels(project.types, true).map((label) => (
                <Badge key={label} variant="secondary" className="h-5 rounded-md bg-blue-50 px-1.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {label}
                </Badge>
              ))}
              {tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="h-5 rounded-full border-zinc-200 px-2 text-[11px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                  {tag}
                </Badge>
              ))}
            </div>

            <h1 className="mt-2.5 font-heading text-[26px] font-bold leading-[1.15] tracking-tight text-zinc-900 break-keep dark:text-white sm:text-[38px]">
              {project.title}
            </h1>
            {project.short_description && (
              <p className="mt-2 max-w-[40em] text-[15px] leading-relaxed text-zinc-600 break-keep dark:text-zinc-400 sm:text-[17px]">
                {project.short_description}
              </p>
            )}

            <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-zinc-600 dark:text-zinc-400">
              {project.author_role === "team" ? (
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200" aria-hidden>
                    {authorName.charAt(0)}
                  </span>
                  <b className="font-semibold text-zinc-900 dark:text-white">{authorName}</b>
                </span>
              ) : (
                <Link href={`/developers/${project.author_id}`} className="group/author inline-flex items-center gap-2 rounded-full">
                  <span className="relative h-7 w-7 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
                    {project.users?.avatar_url ? (
                      <Image src={project.users.avatar_url} alt="" fill sizes="28px" className="object-cover" unoptimized={isExternalImage(project.users.avatar_url)} />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-200" aria-hidden>
                        {authorName.charAt(0)}
                      </span>
                    )}
                  </span>
                  <b className="font-semibold text-zinc-900 underline-offset-4 group-hover/author:underline dark:text-white">{authorName}</b>
                </Link>
              )}
              <span aria-hidden>·</span>
              <span>{project.author_role === "team" ? "팀 프로젝트" : "개인 프로젝트"}</span>
              <span aria-hidden>·</span>
              <span>{createdLabel} 등록</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {project.url && (
                <a
                  href={`/api/track?project=${project.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-full px-5 text-sm", SECTION_COLORS.explore.button)}
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden /> 웹사이트 방문
                  <span className="sr-only"> (새 탭에서 열림)</span>
                </a>
              )}
              {project.source_type === "open" && project.repo_url && (
                <a
                  href={project.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-11 rounded-full border-zinc-300 bg-white px-5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
                  )}
                >
                  <Code2 className="mr-1.5 h-4 w-4" aria-hidden /> GitHub 저장소
                  <span className="sr-only"> (새 탭에서 열림)</span>
                </a>
              )}
              <EditButton projectId={project.id} authorId={project.author_id} teamMembers={project.team_members} />
            </div>
          </div>
        </div>

        <StatStrip items={stats} className="mt-8" />

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* 본문 */}
          <div className="md:col-span-2">
            <ReadingSurface>
              <h2 className="mb-5 font-heading text-xl font-bold text-zinc-900 dark:text-white">프로젝트 상세</h2>
              <Markdown>{project.description ?? ""}</Markdown>
            </ReadingSurface>
          </div>

          {/* 사이드 */}
          <aside className="grid content-start gap-4">
            {/* 개발자 */}
            <div className={sideCard}>
              <h2 className={sideTitle}>{project.author_role === "team" ? "팀" : "개발자"}</h2>
              {project.author_role === "team" ? (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[13px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200" aria-hidden>
                      {authorName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{authorName}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">팀 프로젝트</div>
                    </div>
                  </div>
                  {teamMemberProfiles.length > 0 && (
                    <ul className="mt-4 grid gap-2.5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                      {teamMemberProfiles.map((member) => {
                        const memberName = member.nickname || member.full_name || member.email;
                        return (
                          <li key={member.id}>
                            <Link href={`/developers/${member.id}`} className="group/member flex items-center gap-2.5 rounded-full">
                              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-xs font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                {member.avatar_url ? (
                                  <Image src={member.avatar_url} alt="" fill sizes="32px" className="object-cover" unoptimized={isExternalImage(member.avatar_url)} />
                                ) : (
                                  memberName.charAt(0)
                                )}
                              </span>
                              <span className="truncate text-sm font-medium text-zinc-900 underline-offset-4 group-hover/member:underline dark:text-white">{memberName}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-[13px] font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {project.users?.avatar_url ? (
                        <Image src={project.users.avatar_url} alt="" fill sizes="36px" className="object-cover" unoptimized={isExternalImage(project.users.avatar_url)} />
                      ) : (
                        authorName.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{authorName}</div>
                      {project.users?.email && <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{project.users.email}</div>}
                    </div>
                  </div>
                  <Link
                    href={`/developers/${project.author_id}`}
                    className="mt-4 inline-flex items-center gap-0.5 rounded-sm text-[13px] font-medium text-blue-700 hover:underline underline-offset-4 dark:text-blue-300"
                  >
                    프로필 보기
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              )}
            </div>

            {/* 라이선스 */}
            <div className={sideCard}>
              <h2 className={sideTitle}>라이선스</h2>
              <div className="mb-2.5 flex items-center gap-2 text-[13px] font-bold text-zinc-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                허용됨
              </div>
              {allowedCount > 0 ? (
                <ul className="grid gap-2">
                  {(project.license_features ?? []).map((lf: string) => (
                    <li key={lf} className="flex items-center text-[13px] text-zinc-600 dark:text-zinc-400">
                      <span className="mr-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                      {LICENSE_LABELS[lf] || lf}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">허용된 항목이 없어요.</p>
              )}

              <div className="mb-2.5 mt-5 flex items-center gap-2 text-[13px] font-bold text-zinc-900 dark:text-white">
                <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden />
                제한 / 조건
              </div>
              {(() => {
                const allowed: string[] = project.license_features || [];
                const restricted = LICENSE_FEATURES.filter((f) => !allowed.includes(f.value));
                if (restricted.length === 0) return <p className="text-xs text-zinc-500">모든 항목이 허용돼요.</p>;
                return (
                  <ul className="grid gap-2">
                    {restricted.map((f) => (
                      <li key={f.value} className="flex items-center text-[13px] text-zinc-600 dark:text-zinc-400">
                        <span className="mr-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" aria-hidden />
                        {RESTRICTED_LABELS[f.value] || f.label}
                      </li>
                    ))}
                  </ul>
                );
              })()}

              {project.license_custom && (
                <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <div className="mb-1.5 text-xs font-semibold text-zinc-500">추가 조건</div>
                  <p className="text-[13px] text-zinc-600 dark:text-zinc-400">{project.license_custom}</p>
                </div>
              )}
            </div>

            {/* 정보 */}
            <div className={sideCard}>
              <h2 className={sideTitle}>정보</h2>
              <dl className="grid gap-2.5 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500 dark:text-zinc-400">종류</dt>
                  <dd className="text-right font-medium text-zinc-900 dark:text-white">{projectTypeLabels(project.types, true).join(" · ") || "–"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500 dark:text-zinc-400">플랫폼</dt>
                  <dd className="text-right font-medium text-zinc-900 dark:text-white">{isWebsiteAll ? "Web (모든 브라우저)" : platformLabels.join(" · ") || "–"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500 dark:text-zinc-400">공개 여부</dt>
                  <dd>
                    {project.visibility === "private" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        <Lock className="h-3 w-3" aria-hidden /> 비공개
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Globe className="h-3 w-3" aria-hidden /> 공개
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500 dark:text-zinc-400">등록일</dt>
                  <dd className="font-medium text-zinc-900 tabular-nums dark:text-white">{new Date(project.created_at).toLocaleDateString("ko-KR")}</dd>
                </div>
                {project.updated_at && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-zinc-500 dark:text-zinc-400">최근 수정</dt>
                    <dd className="font-medium text-zinc-900 tabular-nums dark:text-white">{new Date(project.updated_at).toLocaleDateString("ko-KR")}</dd>
                  </div>
                )}
              </dl>
            </div>
          </aside>
        </div>

        <ProjectReviews projectId={project.id} reviews={reviews} />
      </main>
    </div>
  );
}
