"use client";

import { useState, useMemo } from "react";
import { Search, Filter, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ProjectCard, type ProjectCardData } from "@/components/projects/project-card";

const PLATFORMS = ["web", "ios", "android", "macos", "windows", "linux"];
const TYPES = ["website", "app", "extension", "cli", "library"];

interface ExploreClientProps {
  initialProjects: ProjectCardData[];
}

export function ExploreClient({ initialProjects }: ExploreClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return initialProjects.filter(project => {
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

      return matchesSearch && matchesPlatform && matchesType;
    });
  }, [searchQuery, selectedPlatforms, selectedTypes, initialProjects]);

  const activeFilterCount = selectedTypes.length + selectedPlatforms.length;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50/50 dark:bg-[#09090b] font-sans relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/10 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 dark:bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8">
        {/* SIDEBAR / FILTERS (데스크탑 전용) */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-24 space-y-8">
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center">
                <Filter className="w-4 h-4 mr-2" /> 필터
              </h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">프로그램 종류</h4>
                  <div className="space-y-2">
                    {TYPES.map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={(checked) => handleTypeChange(type, checked as boolean)}
                        />
                        <Label htmlFor={`type-${type}`} className="text-sm font-normal cursor-pointer text-zinc-600 dark:text-zinc-400">
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">플랫폼</h4>
                  <div className="space-y-2">
                    {PLATFORMS.map(platform => (
                      <div key={platform} className="flex items-center space-x-2">
                        <Checkbox
                          id={`platform-${platform}`}
                          checked={selectedPlatforms.includes(platform)}
                          onCheckedChange={(checked) => handlePlatformChange(platform, checked as boolean)}
                        />
                        <Label htmlFor={`platform-${platform}`} className="text-sm font-normal cursor-pointer text-zinc-600 dark:text-zinc-400">
                          {platform}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT / SEARCH & GRID */}
        <div className="flex-1 min-w-0">
          {/* 모바일 전용 필터 토글 */}
          <div className="md:hidden mb-6">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 shadow-sm"
            >
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" /> 필터
                {activeFilterCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")} />
            </button>

            {filtersOpen && (
              <div className="mt-3 space-y-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div>
                  <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">프로그램 종류</h4>
                  <div className="flex flex-wrap gap-2">
                    {TYPES.map((type) => {
                      const active = selectedTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleTypeChange(type, !active)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                            active
                              ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400",
                          )}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">플랫폼</h4>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((platform) => {
                      const active = selectedPlatforms.includes(platform);
                      return (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => handlePlatformChange(platform, !active)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                            active
                              ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400",
                          )}
                        >
                          {platform}
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
                      setSelectedPlatforms([]);
                    }}
                    className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-white"
                  >
                    필터 초기화
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mb-8 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <Input
              placeholder="프로젝트, 태그, 개발자·팀 이름으로 검색해보세요..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-sm text-base focus-visible:ring-blue-500"
            />
          </div>

          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              모든 프로젝트 <span className="text-zinc-400 text-base font-normal ml-2">({filteredProjects.length})</span>
            </h2>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="text-center py-20 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
              <p className="text-zinc-500 dark:text-zinc-400">조건에 맞는 프로젝트가 없습니다.</p>
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
