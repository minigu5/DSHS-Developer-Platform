"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Search, Filter, ChevronDown, ArrowUpDown, X, Heart } from "lucide-react";
import type { CSSProperties, MouseEvent } from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ProjectCard, type ProjectCardData } from "@/components/projects/project-card";
import { PROJECT_TYPES, PLATFORMS, FEATURES } from "@/lib/constants";
import { TYPE_ICONS, PLATFORM_ICONS, CATEGORY_ICONS } from "@/lib/type-icons";
import { PageHero } from "@/components/shared/page-hero";
import { MobileFilterBar } from "@/components/explore/mobile-filter-bar";
import { exploreQueryString, type ExploreQuery, type ExploreSort } from "@/lib/explore-query";
import { heartCountOf } from "@/lib/hearts";
import { setHeart } from "@/lib/hearts-client";
import { createClient } from "@/lib/supabase/client";
import { markLeavingExplore } from "@/lib/explore-return";


interface ExploreClientProps {
  initialProjects: ProjectCardData[];
  /** 주소에서 읽은 검색어·필터·정렬(서버 페이지가 parseExploreQuery로 넘김) */
  initialQuery: ExploreQuery;
  /** 로그인한 사람(없으면 하트를 누를 때 로그인으로) */
  viewerId: string | null;
  /** 내가 하트를 누른 프로젝트 id — "즐겨찾기만" 필터 */
  myHeartIds: string[];
}

type HeartState = Record<string, { hearted: boolean; count: number }>;

export function ExploreClient({ initialProjects, initialQuery, viewerId, myHeartIds }: ExploreClientProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery.q);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(initialQuery.platforms);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialQuery.types);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialQuery.categories);
  const [typeOpen, setTypeOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [sortBy, setSortBy] = useState<ExploreSort>(initialQuery.sort);
  const [sortOpen, setSortOpen] = useState(false);
  // 하트 누른 것만 보기(2026-11-06 — 맨 위 즐겨찾기 칸이 늘 떠서 필터로 바꿈). 비로그인이면 주소에 있어도 끈다.
  const [onlyFavorites, setOnlyFavorites] = useState(initialQuery.favorites && viewerId !== null);

  // 하트 상태는 여기 하나 — "즐겨찾기만" 필터도 이걸 본다
  const [hearts, setHearts] = useState<HeartState>(() => {
    const mine = new Set(myHeartIds);
    return Object.fromEntries(
      initialProjects.map((p) => [p.id, { hearted: mine.has(p.id), count: heartCountOf(p) }]),
    );
  });
  const [heartPending, setHeartPending] = useState<Set<string>>(() => new Set());

  const applyHeart = useCallback((id: string, on: boolean) => {
    setHearts((h) => {
      const cur = h[id] ?? { hearted: false, count: 0 };
      if (cur.hearted === on) return h;
      return { ...h, [id]: { hearted: on, count: Math.max(0, cur.count + (on ? 1 : -1)) } };
    });
  }, []);

  const toggleHeart = useCallback(
    async (id: string, next: boolean) => {
      if (!viewerId || heartPending.has(id)) return;
      setHeartPending((s) => new Set(s).add(id));
      applyHeart(id, next);
      const { error } = await setHeart(createClient(), id, viewerId, next);
      setHeartPending((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      if (error) {
        applyHeart(id, !next);
        toast.error("하트를 누르지 못했어요.", { description: error });
      }
    },
    [viewerId, heartPending, applyHeart],
  );

  const renderCard = (project: ProjectCardData) => (
    <ProjectCard
      key={project.id}
      project={project}
      mode="showcase"
      heart={{
        viewerId,
        hearted: hearts[project.id]?.hearted ?? false,
        count: hearts[project.id]?.count ?? 0,
        onToggle: (next) => void toggleHeart(project.id, next),
      }}
    />
  );

  const handlePlatformChange = (platform: string, checked: boolean) => {
    setSelectedPlatforms(prev =>
      checked ? [...prev, platform] : prev.filter(p => p !== platform)
    );
  };

  const handleTypeChange = (type: string, checked: boolean) => {
    setSelectedTypes(prev =>
      checked ? [...prev, type] : prev.filter(t => t !== type)
    );
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    setSelectedCategories(prev =>
      checked ? [...prev, category] : prev.filter(c => c !== category)
    );
  };

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = initialProjects.filter(project => {
      const title = project.title ?? "";
      const shortDesc = project.short_description ?? "";
      const tags = project.features ?? [];
      const platforms = project.platforms ?? [];
      const types = project.types ?? [];

      const author = Array.isArray(project.users) ? project.users[0] : project.users;
      const authorNames = [author?.nickname, author?.full_name, project.team_name].filter(
        (name): name is string => Boolean(name),
      );

      const matchesSearch =
        !q ||
        title.toLowerCase().includes(q) ||
        shortDesc.toLowerCase().includes(q) ||
        tags.some(tag => tag.toLowerCase().includes(q)) ||
        authorNames.some(name => name.toLowerCase().includes(q));

      const matchesPlatform =
        selectedPlatforms.length === 0 ||
        selectedPlatforms.some(platform => platforms.includes(platform));

      const matchesType =
        selectedTypes.length === 0 ||
        selectedTypes.some(t => types.includes(t));

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.some(cat => tags.includes(cat));

      const matchesFavorite = !onlyFavorites || (hearts[project.id]?.hearted ?? false);

      return matchesSearch && matchesPlatform && matchesType && matchesCategory && matchesFavorite;
    });

    if (sortBy === 'clicks') {
      return [...filtered].sort((a, b) => (b.click_count ?? 0) - (a.click_count ?? 0));
    }
    if (sortBy === 'hearts') {
      // 같은 수면 서버 순서(최신) 유지 — Array.sort 는 안정 정렬
      return [...filtered].sort((a, b) => (hearts[b.id]?.count ?? 0) - (hearts[a.id]?.count ?? 0));
    }
    // newest: 서버에서 created_at DESC로 정렬되어 옴
    return filtered;
  }, [searchQuery, selectedPlatforms, selectedTypes, selectedCategories, onlyFavorites, initialProjects, sortBy, hearts]);

  // 검색어·필터·정렬을 주소에 남긴다 — 새로고침·뒤로 가기·링크 공유에도 같은 결과.
  // 기록은 쌓지 않고(replaceState) 타자 칠 때마다 쓰지 않게 잠깐 모았다 쓴다(Safari는 30초에 100번 넘으면 막음).
  useEffect(() => {
    const t = window.setTimeout(() => {
      const qs = exploreQueryString({
        q: searchQuery,
        types: selectedTypes,
        categories: selectedCategories,
        platforms: selectedPlatforms,
        sort: sortBy,
        favorites: onlyFavorites,
      });
      if (qs !== window.location.search && !(qs === "" && window.location.search === "?")) {
        window.history.replaceState(null, "", `${window.location.pathname}${qs}${window.location.hash}`);
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchQuery, selectedTypes, selectedCategories, selectedPlatforms, sortBy, onlyFavorites]);

  useEffect(() => {
    if (!sortOpen) return;
    const handler = () => setSortOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [sortOpen]);

  const activeFilterCount =
    selectedTypes.length + selectedCategories.length + selectedPlatforms.length + (onlyFavorites ? 1 : 0);

  const resetFilters = () => {
    setSelectedTypes([]);
    setSelectedCategories([]);
    setSelectedPlatforms([]);
    setOnlyFavorites(false);
  };

  const sortButton = (
    <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setSortOpen(o => !o)}
                aria-label={`정렬: ${sortBy === 'newest' ? '최신순' : sortBy === 'clicks' ? '인기순' : '하트순'}`}
                aria-expanded={sortOpen}
                className="flex h-[34px] items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 text-[13px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
                <span>
                  {sortBy === 'newest' ? '최신순' : sortBy === 'clicks' ? '인기순' : '하트순'}
                </span>
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 min-w-[112px] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
                  {([
                    { value: 'newest', label: '최신순' },
                    { value: 'clicks', label: '인기순' },
                    { value: 'hearts', label: '하트순' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                      aria-current={sortBy === opt.value ? "true" : undefined}
                      className={cn(
                        "w-full px-4 py-2.5 text-sm text-left font-medium transition-colors",
                        sortBy === opt.value
                          ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
    </div>
  );

  // 프로젝트를 열 때 적어 두면 상세의 "← 모든 프로젝트"가 뒤로 가기로 돌아와 스크롤·필터가 그대로다
  function rememberProjectClick(e: MouseEvent<HTMLDivElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element).closest<HTMLAnchorElement>('a[href^="/projects/"]');
    if (link) markLeavingExplore(link.pathname);
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950" onClickCapture={rememberProjectClick}>
      <PageHero
        section="explore"
        icon={Search}
        title="모든 프로젝트"
        description="친구들이 만든 프로젝트를 찾아보고, 마음에 들면 하트를 눌러요."
        maxWidth="lg"
      >
        <div className="rise relative mt-5 w-full max-w-[640px] sm:mt-6" style={{ "--rise-delay": "180ms" } as CSSProperties}>
          <Search className="pointer-events-none absolute left-5 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500 dark:text-zinc-400" aria-hidden />
          <Input
            type="search"
            aria-label="프로젝트 검색"
            autoComplete="off"
            placeholder="프로젝트, 태그, 만든 사람 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-[46px] rounded-full border-zinc-200 bg-white pl-12 pr-12 text-[15px] shadow-sm focus-visible:ring-blue-500 sm:h-[52px] dark:border-zinc-800 dark:bg-zinc-900"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 transition-[background-color,color,scale] hover:bg-zinc-100 hover:text-zinc-700 active:scale-[0.96] dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label="검색어 지우기"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </PageHero>

      <MobileFilterBar
        selectedTypes={selectedTypes}
        selectedCategories={selectedCategories}
        selectedPlatforms={selectedPlatforms}
        onToggleType={handleTypeChange}
        onToggleCategory={handleCategoryChange}
        onTogglePlatform={handlePlatformChange}
        favorites={viewerId ? { active: onlyFavorites, onToggle: () => setOnlyFavorites(o => !o) } : null}
        onReset={resetFilters}
        sortButton={sortButton}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <div className="flex gap-8">
          {/* SIDEBAR / FILTERS (데스크탑 전용) */}
          <aside className="hidden md:block w-56 shrink-0 sticky top-24 self-start">
            <div className="space-y-8">
              <div>
                <h2 className="font-semibold text-lg mb-4 flex items-center">
                  <Filter className="w-4 h-4 mr-2" aria-hidden /> 필터
                </h2>

                <div className="space-y-1">
                  {/* 즐겨찾기만 — 로그인했을 때만 */}
                  {viewerId && (
                    <button
                      type="button"
                      onClick={() => setOnlyFavorites(o => !o)}
                      aria-pressed={onlyFavorites}
                      className={cn(
                        "mb-2 w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors text-left",
                        onlyFavorites
                          ? "bg-blue-500/12 text-blue-700 dark:text-blue-300"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      <Heart className={cn("w-4 h-4 shrink-0 transition-colors", onlyFavorites ? "fill-current text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500")} aria-hidden />
                      즐겨찾기만
                    </button>
                  )}

                  {/* 프로그램 종류 */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setTypeOpen(o => !o)}
                      aria-expanded={typeOpen}
                      className="w-full flex items-center justify-between rounded-lg px-1 py-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        프로그램 종류
                        {selectedTypes.length > 0 && (
                          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold tabular-nums text-white">
                            {selectedTypes.length}
                          </span>
                        )}
                      </span>
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", typeOpen && "rotate-180")} aria-hidden />
                    </button>
                    <div className={cn("grid transition-[grid-template-rows,visibility] duration-200 ease-out", typeOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr] invisible")}>
                      <div className="overflow-hidden">
                        <div className="mt-0.5 space-y-0.5 pb-1">
                          {PROJECT_TYPES.map(({ value, label }) => {
                            const Icon = TYPE_ICONS[value];
                            const active = selectedTypes.includes(value);
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => handleTypeChange(value, !active)}
                                aria-pressed={active}
                                className={cn(
                                  "w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors text-left",
                                  active
                                    ? "bg-blue-500/12 text-blue-700 dark:text-blue-300"
                                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-800 dark:hover:text-zinc-200"
                                )}
                              >
                                {Icon && (
                                  <Icon className={cn("w-4 h-4 shrink-0 transition-colors", active ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500")} aria-hidden />
                                )}
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 카테고리 */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setCategoryOpen(o => !o)}
                      aria-expanded={categoryOpen}
                      className="w-full flex items-center justify-between rounded-lg px-1 py-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        카테고리
                        {selectedCategories.length > 0 && (
                          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold tabular-nums text-white">
                            {selectedCategories.length}
                          </span>
                        )}
                      </span>
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", categoryOpen && "rotate-180")} aria-hidden />
                    </button>
                    <div className={cn("grid transition-[grid-template-rows,visibility] duration-200 ease-out", categoryOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr] invisible")}>
                      <div className="overflow-hidden">
                        <div className="mt-0.5 space-y-0.5 pb-1">
                          {FEATURES.map(({ value, label }) => {
                            const Icon = CATEGORY_ICONS[value];
                            const active = selectedCategories.includes(value);
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => handleCategoryChange(value, !active)}
                                aria-pressed={active}
                                className={cn(
                                  "w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors text-left",
                                  active
                                    ? "bg-blue-500/12 text-blue-700 dark:text-blue-300"
                                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-800 dark:hover:text-zinc-200"
                                )}
                              >
                                {Icon && (
                                  <Icon className={cn("w-4 h-4 shrink-0 transition-colors", active ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500")} aria-hidden />
                                )}
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 플랫폼 */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setPlatformOpen(o => !o)}
                      aria-expanded={platformOpen}
                      className="w-full flex items-center justify-between rounded-lg px-1 py-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        플랫폼
                        {selectedPlatforms.length > 0 && (
                          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold tabular-nums text-white">
                            {selectedPlatforms.length}
                          </span>
                        )}
                      </span>
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", platformOpen && "rotate-180")} aria-hidden />
                    </button>
                    <div className={cn("grid transition-[grid-template-rows,visibility] duration-200 ease-out", platformOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr] invisible")}>
                      <div className="overflow-hidden">
                        <div className="mt-0.5 space-y-0.5 pb-1">
                          {PLATFORMS.map(({ value, label }) => {
                            const Icon = PLATFORM_ICONS[value];
                            const active = selectedPlatforms.includes(value);
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => handlePlatformChange(value, !active)}
                                aria-pressed={active}
                                className={cn(
                                  "w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors text-left",
                                  active
                                    ? "bg-blue-500/12 text-blue-700 dark:text-blue-300"
                                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-800 dark:hover:text-zinc-200"
                                )}
                              >
                                {Icon && (
                                  <Icon className={cn("w-4 h-4 shrink-0 transition-colors", active ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500")} aria-hidden />
                                )}
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-sm text-sm font-medium text-zinc-600 dark:text-zinc-400 underline-offset-4 hover:underline hover:text-zinc-900 dark:hover:text-white px-1 pt-2"
                    >
                      필터 초기화
                    </button>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT / SEARCH & GRID */}
          <div className="flex-1 min-w-0">
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
                <b className="font-semibold text-zinc-900 tabular-nums dark:text-white">{filteredProjects.length}개</b>
                {activeFilterCount > 0 && " · 필터 적용"}
              </p>

              <div className="hidden md:block">{sortButton}</div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700">
                <p className="text-zinc-600 dark:text-zinc-400">
                  {onlyFavorites && !Object.values(hearts).some(h => h.hearted)
                    ? "아직 하트를 누른 프로젝트가 없어요. 마음에 드는 프로젝트에 하트를 눌러 보세요."
                    : "조건에 맞는 프로젝트가 없어요."}
                </p>
                {(activeFilterCount > 0 || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      resetFilters();
                    }}
                    className="mt-3 text-sm font-medium text-blue-700 dark:text-blue-400 underline underline-offset-4"
                  >
                    검색어와 필터 지우기
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {filteredProjects.map((project) => (
                  renderCard(project)
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
