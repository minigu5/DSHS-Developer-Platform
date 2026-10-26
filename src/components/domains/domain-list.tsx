"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { ProjectIcon } from "@/components/projects/project-icon";
import { customDomainOf } from "@/lib/domains/hosts";
import type { DomainProjectRow, DomainView } from "@/lib/domains/read";
import { SECTION_COLORS } from "@/lib/section-colors";
import { cn } from "@/lib/utils";

import { DomainSteps } from "./domain-steps";
import { IDLE_CHECK, useDomainChecks } from "./use-domain-checks";

const AUTO_RELEASE_DAYS = 7;

function daysLeft(since: string): number {
  const passed = (Date.now() - new Date(since).getTime()) / 86_400_000;
  return Math.max(0, Math.ceil(AUTO_RELEASE_DAYS - passed));
}

function StatusPill({ domain }: { domain: DomainView }) {
  const base = "rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";
  switch (domain.status) {
    case "active":
      return <span className={cn(base, "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300")}>연결됨</span>;
    case "broken":
      return (
        <span className={cn(base, "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300")}>
          끊김 · {domain.brokenSince ? `${daysLeft(domain.brokenSince)}일 뒤 자동 반납` : "확인 필요"}
        </span>
      );
    case "revoked":
      return <span className={cn(base, "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300")}>회수됨</span>;
    default:
      return <span className={cn(base, "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")}>설정 중</span>;
  }
}

// 도메인 마련하기로 받은 게 아니어도 방문 주소가 이미 내 도메인(예: dshs.dev)이면 따로 알려 준다
function OwnDomainPill({ host }: { host: string }) {
  return (
    <span
      title={`${host} 도메인을 이미 쓰고 있어요`}
      className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-teal-800 dark:bg-teal-950 dark:text-teal-300"
    >
      내 도메인 사용 중
    </span>
  );
}

function isLive(d: DomainView | null): d is DomainView {
  return d !== null && d.status !== "revoked";
}

export function DomainList({
  rows,
  limitReached,
  initialOpen = null,
}: {
  rows: DomainProjectRow[];
  limitReached: boolean;
  /** 프로젝트 등록 직후 "도메인 마련하기"로 들어오면 그 줄을 펼친 채로 시작 */
  initialOpen?: string | null;
}) {
  const [open, setOpen] = useState<string | null>(initialOpen);
  // 패널이 접혀 있어도 호스트 연결을 마친 주소는 여기서 자동으로 확인한다
  const liveDomains = useMemo(() => rows.flatMap((r) => (isLive(r.domain) ? [r.domain] : [])), [rows]);
  const checks = useDomainChecks(liveDomains);

  // 펼친 채로 들어왔으면 그 줄로 스크롤하고 이름 칸에 바로 쓸 수 있게
  useEffect(() => {
    if (!initialOpen) return;
    document.getElementById(`domain-row-${initialOpen}`)?.scrollIntoView({ block: "center" });
    document.getElementById(`name-${initialOpen}`)?.focus({ preventScroll: true });
  }, [initialOpen]);

  return (
    <ul className="flex flex-col gap-3">
      {rows.map(({ project, domain }) => {
        const live = isLive(domain);
        const disabled = !project.url;
        const expanded = open === project.id;
        const panelId = `domain-panel-${project.id}`;
        // 새 주소를 받을 수 없는 줄: 방문 주소 없음, 또는 3개를 다 쓴 상태에서 아직 주소가 없는 프로젝트
        const blocked = disabled || (!live && limitReached);
        const ownDomain = !live && project.url ? customDomainOf(project.url) : null;

        let action: string;
        if (live) action = domain.status === "active" ? "관리" : "설정 이어서 하기";
        else action = "도메인 마련하기";

        return (
          <li
            key={project.id}
            id={`domain-row-${project.id}`}
            className={cn(
              "rounded-2xl border bg-white dark:bg-zinc-900",
              expanded ? "border-zinc-400 dark:border-zinc-600" : "border-zinc-200 dark:border-zinc-800",
            )}
          >
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
              <ProjectIcon src={project.iconUrl} title={project.title} decorative className="h-9 w-9 shrink-0 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{project.title}</p>
                <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {live ? `${domain.name}.dshs.dev` : (project.url ?? "방문 주소 없음")}
                </p>
              </div>
              {domain && <StatusPill domain={domain} />}
              {ownDomain && <OwnDomainPill host={ownDomain} />}
              {disabled ? (
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
                >
                  방문 주소가 있어야 받을 수 있어요
                </Link>
              ) : blocked && !live ? (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">주소 3개를 다 썼어요</span>
              ) : (
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setOpen(expanded ? null : project.id)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1 rounded-full px-4 text-sm font-semibold transition-colors",
                    !live && !expanded
                      ? SECTION_COLORS.domains.button
                      : "border border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
                  )}
                >
                  {expanded ? "접기" : action}
                  <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden />
                </button>
              )}
            </div>

            {domain?.status === "revoked" && domain.revokedReason && (
              <p className="border-t border-zinc-100 px-4 py-2 text-xs text-rose-700 dark:border-zinc-800 dark:text-rose-300">
                {domain.name}.dshs.dev 주소가 회수됐어요 · {domain.revokedReason}
              </p>
            )}

            {expanded && (
              <div id={panelId} className="border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-800">
                <DomainSteps
                  project={project}
                  domain={live ? domain : null}
                  check={live ? checks.stateOf(domain.id) : IDLE_CHECK}
                  auto={live ? checks.autoOf(domain.id) : "off"}
                  onCheck={() => live && void checks.check(domain.id)}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
