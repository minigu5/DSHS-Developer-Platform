"use client";

import { useEffect, useState } from "react";

import type { HowItWorksExamples } from "@/components/home/how-it-works";
import { SHELF_LIMIT, type ShelfProject } from "@/components/home/icon-shelf";
import type { RecentAnnouncement, RecentIdea, RecentTip } from "@/components/home/recent-posts";
import type { ProjectCardData } from "@/components/projects/project-card";
import type { TickerItem } from "@/components/shared/announcement-ticker";
import { ANONYMOUS_AUTHOR, projectTypeLabels } from "@/lib/constants";
import type { DomainShowcase } from "@/lib/domains/read";
import { createClient } from "@/lib/supabase/client";

// 홈의 목록 데이터는 모두 공개 데이터라 브라우저가 Supabase에서 직접 읽는다(RLS 그대로).
// 서버가 요청마다 읽고 그리면 Cloudflare Workers 무료 요금제의 CPU 한도(요청당 10ms)를 넘겨 503이 나서,
// 홈은 빌드 때 만든 정적 페이지로 두고 섹션마다 슬롯(home-slots.tsx)이 이 데이터를 받아 그린다.

export type HomeData = {
  ticker: TickerItem[];
  recentProjects: ProjectCardData[];
  shelf: ShelfProject[];
  tips: RecentTip[];
  ideas: RecentIdea[];
  recentAnnouncements: RecentAnnouncement[];
  examples: HowItWorksExamples;
  showcase: DomainShowcase | null;
};

type Person = { nickname: string | null; full_name: string | null } | null;

type TipJoined = {
  id: string;
  title: string;
  cover_url: string | null;
  author: Person;
  tip_likes: { count: number }[] | null;
  tip_comments: { count: number }[] | null;
};

type IdeaJoined = {
  id: string;
  title: string;
  type: string;
  category: string;
  status: "open" | "in_progress" | "done";
  author: Person;
};

type CommentJoined = {
  content: string;
  is_author: boolean;
  public_user_id: string | null;
  user: Person;
  projects: { title: string; icon_url: string | null } | null;
};

const personName = (p: Person, fallback = "알 수 없음") => p?.nickname || p?.full_name || fallback;

const IDEA_STATUS_LABEL: Record<IdeaJoined["status"], string> = {
  open: "구현 요청 중",
  in_progress: "개발 중",
  done: "구현 완료",
};

function toShowcase(raw: unknown): DomainShowcase | null {
  if (!raw || typeof raw !== "object") return null;
  const { total, items } = raw as { total?: unknown; items?: unknown };
  if (typeof total !== "number" || !Array.isArray(items)) return null;
  return { total, items: items as DomainShowcase["items"] };
}

async function fetchHomeData(): Promise<HomeData> {
  const supabase = createClient();

  const [
    { data: announcementsRaw },
    { data: projectsRaw },
    { data: shelfRaw },
    { data: tipsRaw },
    { data: ideasRaw },
    { data: commentRaw },
    { data: showcaseRaw },
  ] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, category, is_pinned")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<TickerItem[]>(),
    supabase
      .from("projects")
      .select(`
        id,
        title,
        short_description,
        types,
        platforms,
        author_role,
        team_name,
        team_icon_url,
        icon_url,
        features,
        public_author_id,
        users!projects_public_author_id_fkey (full_name, nickname, avatar_url)
      `)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(6)
      .returns<ProjectCardData[]>(),
    // 아이콘 나열: 많이 찾는 순(동률이면 최신 등록 우선) 11개 + "내 앱 올리기" 칸
    supabase
      .from("projects")
      .select("id, title, icon_url")
      .eq("visibility", "public")
      .order("click_count", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(SHELF_LIMIT)
      .returns<ShelfProject[]>(),
    supabase
      .from("tips")
      .select("id, title, cover_url, author:users!tips_author_id_fkey(nickname, full_name), tip_likes(count), tip_comments(count)")
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<TipJoined[]>(),
    supabase
      .from("ideas")
      .select("id, title, type, category, status, author:users!ideas_author_id_fkey(nickname, full_name)")
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<IdeaJoined[]>(),
    // "이렇게 써요" 2단계 예시 — 공개 프로젝트에 달린 가장 최근 댓글 한 개(사람은 public_user_id 로만)
    supabase
      .from("project_comments")
      .select("content, is_author, public_user_id, user:users!project_comments_public_user_id_fkey(nickname, full_name), projects!inner(title, icon_url)")
      .eq("projects.visibility", "public")
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<CommentJoined[]>(),
    // 도메인 마련하기 소개 카드의 "벌써 N개" — 실패하면 null 이라 카드만 조용히 줄어든다
    supabase.rpc("domain_showcase", { p_limit: 6 }),
  ]);

  const ticker: TickerItem[] = announcementsRaw ?? [];
  const recentProjects: ProjectCardData[] = projectsRaw ?? [];

  const ideas: RecentIdea[] = (ideasRaw ?? []).map((i) => ({
    id: i.id,
    title: i.title,
    type: i.type,
    category: i.category,
    status: i.status,
    authorName: personName(i.author),
  }));

  const latest = recentProjects[0];
  const latestUser = latest ? (Array.isArray(latest.users) ? latest.users[0] : latest.users) : null;
  const comment = commentRaw?.[0];

  return {
    ticker,
    recentProjects,
    shelf: shelfRaw ?? [],
    tips: (tipsRaw ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      cover_url: t.cover_url,
      authorName: personName(t.author),
      likeCount: t.tip_likes?.[0]?.count ?? 0,
      commentCount: t.tip_comments?.[0]?.count ?? 0,
    })),
    ideas,
    recentAnnouncements: ticker.slice(0, 4),
    examples: {
      latestProject: latest
        ? {
            title: latest.title,
            icon_url: latest.icon_url,
            authorName:
              latest.author_role === "anonymous"
                ? ANONYMOUS_AUTHOR
                : latest.author_role === "team" && latest.team_name
                  ? `${latest.team_name} 팀`
                  : personName(latestUser),
            typeLabel: projectTypeLabels(latest.types, true).join(" · "),
          }
        : null,
      latestComment:
        comment && comment.projects
          ? {
              content: comment.content,
              // 익명 프로젝트 만든 사람의 댓글은 이름이 오지 않는다
              authorName: comment.public_user_id
                ? personName(comment.user)
                : comment.is_author
                  ? `${ANONYMOUS_AUTHOR} · 만든 사람`
                  : "알 수 없음",
              projectTitle: comment.projects.title,
              projectIcon: comment.projects.icon_url,
            }
          : null,
      latestIdea: ideas[0] ? { title: ideas[0].title, statusLabel: IDEA_STATUS_LABEL[ideas[0].status] } : null,
    },
    showcase: toShowcase(showcaseRaw),
  };
}

const EMPTY: HomeData = {
  ticker: [],
  recentProjects: [],
  shelf: [],
  tips: [],
  ideas: [],
  recentAnnouncements: [],
  examples: { latestProject: null, latestComment: null, latestIdea: null },
  showcase: null,
};

// 슬롯 여러 개가 같은 요청 하나를 나눠 쓴다. 홈에 다시 들어오면 30초가 지났을 때만 새로 읽는다(예전 revalidate=30과 같음).
const FRESH_MS = 30_000;
let cache: { at: number; promise: Promise<HomeData> } | null = null;

function loadHomeData(): Promise<HomeData> {
  if (!cache || Date.now() - cache.at > FRESH_MS) {
    cache = { at: Date.now(), promise: fetchHomeData().catch(() => EMPTY) };
  }
  return cache.promise;
}

/** 받기 전에는 null — 슬롯은 그동안 같은 크기의 회색 자리를 보여 준다. */
export function useHomeData(): HomeData | null {
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadHomeData().then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
