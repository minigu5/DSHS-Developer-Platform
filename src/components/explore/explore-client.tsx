"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  Globe,
  Smartphone,
  Puzzle,
  Terminal,
  Package,
  Monitor,
  Laptop,
  Server,
  Bot,
  Apple,
  FileText,
  Sparkles,
  BookOpen,
  Wrench,
  Gamepad2,
  Users,
  Film,
  Zap,
  Code2,
  MoreHorizontal,
  ArrowUpDown,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ProjectCard, type ProjectCardData } from "@/components/projects/project-card";
import { PROJECT_TYPES, PLATFORMS, FEATURES } from "@/lib/constants";

const TYPE_ICONS: Record<string, LucideIcon> = {
  website: Globe,
  app: Smartphone,
  extension: Puzzle,
  cli: Terminal,
  library: Package,
};

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  web: Globe,
  ios: Apple,
  android: Bot,
  windows: Monitor,
  macos: Laptop,
  linux: Server,
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  document: FileText,
  ai: Sparkles,
  study: BookOpen,
  utility: Wrench,
  game: Gamepad2,
  social: Users,
  media: Film,
  productivity: Zap,
  "dev-tool": Code2,
  other: MoreHorizontal,
};

interface ExploreClientProps {
  initialProjects: ProjectCardData[];
}

export function ExploreClient({ initialProjects }: ExploreClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'clicks' | 'rating'>('newest');
  const [sortOpen, setSortOpen] = useState(false);

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
      const type = project.type;

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
        selectedTypes.includes(type);

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.some(cat => tags.includes(cat));

      return matchesSearch && matchesPlatform && matchesType && matchesCategory;
    });

    if (sortBy === 'clicks') {
      return [...filtered].sort((a, b) => (b.click_count ?? 0) - (a.click_count ?? 0));
    }
    if (sortBy === 'rating') {
      return [...filtered].sort((a, b) => {
        const getAvg = (p: typeof a) => {
          const rated = (p.reviews ?? []).filter(r => r.rating != null);
          return rated.length > 0 ? rated.reduce((s, r) => s + r.rating!, 0) / rated.length : 0;
        };
        return getAvg(b) - getAvg(a);
      });
    }
    // newest: 서버에서 created_at DESC로 정렬되어 옴
    return filtered;
  }, [searchQuery, selectedPlatforms, selectedTypes, selectedCategories, initialProjects, sortBy]);

  useEffect(() => {
    if (!sortOpen) return;
    const handler = () => setSortOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [sortOpen]);

  const activeFilterCount = selectedTypes.length + selectedCategories.length + selectedPlatforms.length;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row gap-3">
          {/* SIDEBAR / FILTERS (데스크탑 전용) */}
          <aside className="hidden md:block w-56 shrink-0 sticky top-24 self-start">
            <div className="space-y-8">
              <div>
                <h2 className="font-semibold text-lg mb-4 flex items-center">
                  <Filter className="w-4 h-4 mr-2" aria-hidden /> 필터
                </h2>

                <div className="space-y-1">
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
                      onClick={() => {
                        setSelectedTypes([]);
                        setSelectedCategories([]);
                        setSelectedPlatforms([]);
                      }}
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
          <div className="flex-1 min-w-0 min-h-[calc(100vh-12rem)]">
            {/* 모바일 전용 필터 토글 — absolute 드롭다운으로 레이아웃 고정 */}
            <div className="md:hidden mb-6 relative z-20">
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
                className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" aria-hidden /> 필터
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")} aria-hidden />
              </button>

              {filtersOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 space-y-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-lg animate-in fade-in slide-in-from-top-2">
                  <div>
                    <h4 className="mb-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">프로그램 종류</h4>
                    <div className="flex flex-wrap gap-2">
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
                              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                              active
                                ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400",
                            )}
                          >
                            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">카테고리</h4>
                    <div className="flex flex-wrap gap-2">
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
                              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                              active
                                ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400",
                            )}
                          >
                            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">플랫폼</h4>
                    <div className="flex flex-wrap gap-2">
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
                              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                              active
                                ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400",
                            )}
                          >
                            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTypes([]);
                        setSelectedCategories([]);
                        setSelectedPlatforms([]);
                      }}
                      className="text-sm font-medium text-zinc-600 dark:text-zinc-400 underline-offset-4 hover:underline hover:text-zinc-900 dark:hover:text-white"
                    >
                      필터 초기화
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mb-8 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 w-5 h-5 z-10 pointer-events-none" aria-hidden />
              <Input
                type="search"
                aria-label="프로젝트 검색"
                autoComplete="off"
                placeholder="제목, 태그, 개발자나 팀 이름으로 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-11 h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm text-base focus-visible:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.96] transition-[transform,background-color,color]"
                  aria-label="검색어 지우기"
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              )}
            </div>

            <div className="mb-6 flex justify-between items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                모든 프로젝트{" "}
                <span className="text-zinc-500 dark:text-zinc-400 text-base font-normal ml-1 tabular-nums" aria-live="polite">
                  {filteredProjects.length}개
                </span>
              </h1>

              {/* 정렬 드롭다운 */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setSortOpen(o => !o)}
                  aria-label={`정렬: ${sortBy === 'newest' ? '최신순' : sortBy === 'clicks' ? '인기순' : '별점순'}`}
                  aria-expanded={sortOpen}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
                  <span className="hidden sm:inline">
                    {sortBy === 'newest' ? '최신순' : sortBy === 'clicks' ? '인기순' : '별점순'}
                  </span>
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-1 z-30 min-w-[112px] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {([
                      { value: 'newest', label: '최신순' },
                      { value: 'clicks', label: '인기순' },
                      { value: 'rating', label: '별점순' },
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
            </div>

            {filteredProjects.length === 0 ? (
              <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700">
                <p className="text-zinc-600 dark:text-zinc-400">조건에 맞는 프로젝트가 없어요.</p>
                {(activeFilterCount > 0 || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedTypes([]);
                      setSelectedCategories([]);
                      setSelectedPlatforms([]);
                    }}
                    className="mt-3 text-sm font-medium text-blue-700 dark:text-blue-400 underline underline-offset-4"
                  >
                    검색어와 필터 지우기
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} mode="showcase" />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
