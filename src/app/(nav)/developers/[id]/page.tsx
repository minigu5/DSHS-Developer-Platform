import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Mail, GitBranch, Camera, MessageSquare, Globe, Heart, Plus, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import { INTERESTS } from "@/lib/constants";
import { cn, isExternalImage } from "@/lib/utils";
import type { UserContact } from "@/lib/types";
import { PageHero } from "@/components/shared/page-hero";
import { ProjectCard, type ProjectCardData } from "@/components/projects/project-card";
import { HAEJWO_STATUS } from "@/components/haejwo/haejwo-card";
import { ProfileSettingsDialog } from "./profile-settings-dialog";
import { SignOutButton } from "./sign-out-button";

const CONTACT_ICONS: Record<UserContact["type"], React.ElementType> = {
  github: GitBranch,
  email: Mail,
  instagram: Camera,
  discord: MessageSquare,
  website: Globe,
};

// 링크로 열 수 없는 값(디스코드 사용자 이름 등)은 null — 상대 경로 링크가 되지 않게 글자로만 보여 준다
function contactHref(contact: UserContact): string | null {
  const value = contact.value.trim();
  if (contact.type === "email") return `mailto:${value}`;
  if (contact.type === "github") return `https://github.com/${value}`;
  if (contact.type === "instagram") return `https://instagram.com/${value.replace(/^@/, "")}`;
  if (/^https?:\/\//i.test(value)) return value;
  if (contact.type === "website" && /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value)) return `https://${value}`;
  return null;
}

function contactText(contact: UserContact): string {
  if (contact.type === "instagram") return `@${contact.value.replace(/^@/, "")}`;
  if (contact.type === "website") return contact.value.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return contact.value;
}

type PostRow =
  | { kind: "tip"; id: string; title: string; created_at: string; cover_url: string | null; likeCount: number; commentCount: number }
  | { kind: "idea"; id: string; title: string; created_at: string; status: string };

type TipRow = {
  id: string;
  title: string;
  cover_url: string | null;
  created_at: string;
  tip_likes: { count: number }[];
  tip_comments: { count: number }[];
};

type IdeaRow = { id: string; title: string; status: string; created_at: string };

const riseDelay = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as React.CSSProperties;

/**
 * 개발자 프로필 — `/me`는 본인 프로필로 리다이렉트되고, 본인이면 관리 요소(프로필 설정·수정 버튼·새 프로젝트 칸)가 붙는다.
 * 머리는 홈 히어로의 축소판(아바타 스티커 → 닉네임 → 자기소개 → 연락처 알약 → 관심분야). 실명·이메일은 머리에 두지 않는다.
 */
export default async function DeveloperProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isOwner = currentUser?.id === id;

  const { data: developer, error: userError } = await supabase.from("users").select("*").eq("id", id).single();
  if (userError || !developer) notFound();

  // 직접 등록한 프로젝트 + 팀원(team_members 이메일)으로 들어간 프로젝트.
  // 익명 프로젝트는 public_author_id 가 null 이라 남에게는 절대 안 나오고, 본인 프로필에서만 my_project_ids() 로 더한다.
  const myIds = isOwner ? ((await supabase.rpc("my_project_ids")).data ?? []) : [];
  const teamFilter = [
    `public_author_id.eq.${id}`,
    developer.email ? `team_members.cs.{"${developer.email}"}` : null,
    myIds.length ? `id.in.(${myIds.join(",")})` : null,
  ]
    .filter(Boolean)
    .join(",");

  const [{ data: projects }, { data: tipRows, count: tipCount }, { data: ideaRows, count: ideaCount }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        `id, title, short_description, types, platforms, author_role, team_name, icon_url, features, public_author_id, visibility,
         users!projects_public_author_id_fkey (*), reviews(rating)`,
      )
      .or(teamFilter)
      .order("created_at", { ascending: false })
      .returns<ProjectCardData[]>(),
    supabase
      .from("tips")
      .select("id, title, cover_url, created_at, tip_likes(count), tip_comments(count)", { count: "exact" })
      .eq("author_id", id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<TipRow[]>(),
    supabase
      .from("ideas")
      .select("id, title, status, created_at", { count: "exact" })
      .eq("author_id", id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<IdeaRow[]>(),
  ]);

  const posts: PostRow[] = [
    ...(tipRows ?? []).map<PostRow>((t) => ({
      kind: "tip",
      id: t.id,
      title: t.title,
      created_at: t.created_at,
      cover_url: t.cover_url,
      likeCount: t.tip_likes?.[0]?.count ?? 0,
      commentCount: t.tip_comments?.[0]?.count ?? 0,
    })),
    ...(ideaRows ?? []).map<PostRow>((i) => ({ kind: "idea", id: i.id, title: i.title, created_at: i.created_at, status: i.status })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);
  // 목록은 최근 6개만 보여 주지만 제목 옆 숫자는 쓴 글 전체 수
  const postCount = (tipCount ?? tipRows?.length ?? 0) + (ideaCount ?? ideaRows?.length ?? 0);

  const avatarUrl = developer.avatar_url ?? "";
  const nickname = developer.nickname ?? "";
  const bio = developer.bio ?? "";
  const actualFullName = developer.full_name || developer.email?.split("@")[0] || "User";
  const displayName = nickname || actualFullName;
  const interests = (developer.interests as string[]) || [];
  const contacts = (developer.contacts as UserContact[]) || [];

  // 이메일 알약은 항상 하나 — contacts 에 email 이 있으면 그것만, 없으면 학교 이메일로
  const hasEmailContact = contacts.some((c) => c.type === "email");
  const contactPills: UserContact[] = hasEmailContact
    ? contacts
    : [{ type: "email", value: developer.email }, ...contacts];

  const projectList = projects ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero
        section="explore"
        icon={User}
        title={displayName}
        avatar={
          <span className="rise relative block h-[84px] w-[84px] overflow-hidden rounded-full bg-zinc-200 ring-[3px] ring-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)] dark:bg-zinc-700 dark:ring-zinc-950 sm:h-[104px] sm:w-[104px]">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill sizes="104px" className="object-cover" unoptimized={isExternalImage(avatarUrl)} />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-heading text-3xl font-bold text-zinc-700 dark:text-zinc-200 sm:text-[38px]" aria-hidden>
                {displayName.charAt(0)}
              </span>
            )}
          </span>
        }
      >
        {nickname && (
          <span
            className="rise mt-3 inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-700/50 dark:bg-zinc-800 dark:text-zinc-400"
            style={riseDelay(90)}
          >
            {actualFullName}
          </span>
        )}

        {bio && (
          <p className="rise mt-3.5 max-w-[34em] text-base leading-relaxed text-zinc-600 break-keep dark:text-zinc-400" style={riseDelay(120)}>
            {bio}
          </p>
        )}

        <ul className="rise mt-5 flex flex-wrap justify-center gap-2" style={riseDelay(180)} aria-label="연락처">
          {contactPills.map((contact, idx) => {
            const Icon = CONTACT_ICONS[contact.type];
            const href = contactHref(contact);
            const external = contact.type !== "email";
            const pill = "inline-flex h-[34px] items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 text-[13px] font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white";
            const content = (
              <>
                <Icon className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" aria-hidden />
                {contactText(contact)}
              </>
            );
            return (
              <li key={`${contact.type}-${idx}`}>
                {href ? (
                  <a
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer" : undefined}
                    className={`${pill} transition-colors hover:border-zinc-400 dark:hover:border-zinc-600`}
                  >
                    {content}
                  </a>
                ) : (
                  <span className={pill}>{content}</span>
                )}
              </li>
            );
          })}
        </ul>

        {interests.length > 0 && (
          <ul className="rise mt-3.5 flex flex-wrap justify-center gap-1.5" style={riseDelay(220)} aria-label="관심 분야">
            {interests.map((value) => (
              <li
                key={value}
                className="inline-flex h-5 items-center rounded-full border border-zinc-200 px-2 text-[11px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
              >
                {INTERESTS.find((i) => i.value === value)?.label ?? value}
              </li>
            ))}
          </ul>
        )}

        {isOwner && (
          <div className="rise mt-[18px] flex flex-wrap items-center justify-center gap-2" style={riseDelay(260)}>
            <ProfileSettingsDialog
              userId={developer.id}
              initialNickname={nickname}
              initialBio={bio}
              initialAvatar={avatarUrl}
              initialInterests={interests}
              initialContacts={contacts}
              fullName={actualFullName}
            />
            <SignOutButton />
          </div>
        )}
      </PageHero>

      {/* 프로젝트 띠 */}
      <section className="border-b border-zinc-200 bg-zinc-50 py-8 dark:border-zinc-800 dark:bg-zinc-900/40 sm:py-11">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mb-[18px] flex items-baseline justify-between gap-4">
            <h2 className="font-heading text-[22px] font-bold text-zinc-900 dark:text-white">
              {isOwner ? "내 프로젝트" : "등록한 프로젝트"}
              <span className="ml-1.5 text-[15px] font-semibold text-zinc-500 tabular-nums dark:text-zinc-400">{projectList.length}</span>
            </h2>
            {isOwner && (
              <Link
                href="/projects/new"
                className="inline-flex shrink-0 items-center rounded-sm text-[13px] font-medium text-blue-700 hover:underline underline-offset-4 dark:text-blue-300"
              >
                새 프로젝트 등록
              </Link>
            )}
          </div>

          {projectList.length === 0 && !isOwner ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 py-14 text-center dark:border-zinc-700">
              <p className="text-zinc-600 dark:text-zinc-400">공개된 프로젝트가 없어요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {projectList.map((project) => (
                <ProjectCard key={project.id} project={project} mode={isOwner ? "manage" : "showcase"} authorFallback={displayName} />
              ))}
              {isOwner && (
                <Link
                  href="/projects/new"
                  className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-zinc-300 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-white"
                >
                  <Plus className="h-[26px] w-[26px] text-zinc-500" strokeWidth={2.25} aria-hidden />
                  새 프로젝트 등록
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 작성한 글 */}
      <section className="py-8 sm:py-11">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mb-[18px] flex items-baseline justify-between gap-4">
            <h2 className="font-heading text-[22px] font-bold text-zinc-900 dark:text-white">
              {isOwner ? "내가 쓴 글" : "작성한 글"}
              <span className="ml-1.5 text-[15px] font-semibold text-zinc-500 tabular-nums dark:text-zinc-400">{postCount}</span>
            </h2>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
              <p className="text-zinc-600 dark:text-zinc-400">아직 쓴 글이 없어요.</p>
              {isOwner && (
                <Link href="/tips/new" className="mt-2 inline-block text-sm font-medium text-blue-700 underline underline-offset-4 dark:text-blue-300">
                  첫 팁 쓰기
                </Link>
              )}
            </div>
          ) : (
            <ul className="grid gap-2.5">
              {posts.map((post) => {
                const when = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko });
                const href = post.kind === "tip" ? `/tips/${post.id}` : `/haejwo/${post.id}`;
                const status = post.kind === "idea" ? HAEJWO_STATUS[post.status] ?? HAEJWO_STATUS.open : null;
                return (
                  <li key={`${post.kind}-${post.id}`}>
                    <Link
                      href={href}
                      className="flex items-center gap-3.5 rounded-2xl border border-zinc-200 bg-white px-[18px] py-3.5 transition-colors hover:border-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
                    >
                      <span
                        className={cn(
                          "relative h-10 w-14 shrink-0 overflow-hidden rounded-[10px]",
                          post.kind === "tip" ? "bg-zinc-100 dark:bg-zinc-800" : "bg-orange-100 dark:bg-orange-950",
                        )}
                        aria-hidden
                      >
                        {post.kind === "tip" && post.cover_url && (
                          <Image src={post.cover_url} alt="" fill sizes="56px" className="object-cover" unoptimized={isExternalImage(post.cover_url)} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-white">{post.title}</span>
                        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                          {post.kind === "tip" ? "개발 팁" : "해줘!"} · {when}
                        </span>
                      </span>
                      {post.kind === "tip" ? (
                        <span className="flex shrink-0 items-center gap-2.5 text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                          <span className="inline-flex items-center gap-0.5">
                            <Heart className="h-3 w-3" aria-hidden /> {post.likeCount}
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <MessageSquare className="h-3 w-3" aria-hidden /> {post.commentCount}
                          </span>
                        </span>
                      ) : (
                        status && (
                          <span className={cn("inline-flex h-[22px] shrink-0 items-center rounded-full px-2.5 text-[11px] font-semibold", status.cls)}>
                            {status.label}
                          </span>
                        )
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
