"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Plus, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PROJECT_TYPES } from "@/lib/constants";
import { markIdeaDone } from "@/lib/haejwo/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type ProjectCard = {
  id: string;
  title: string;
  type: string;
  short_description: string | null;
};

export function HaejwoCompleteButton({ ideaId }: { ideaId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    setSelected(null);
    setFetching(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setFetching(false);
      toast.error("로그인이 필요합니다.");
      setOpen(false);
      return;
    }
    const { data } = await supabase
      .from("projects")
      .select("id, title, type, short_description")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });
    setProjects(data ?? []);
    setFetching(false);
  }

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    const result = await markIdeaDone(ideaId, selected);
    setSubmitting(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("구현 완료로 변경되었습니다!");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          buttonVariants({ size: "default" }),
          "w-full rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700",
        )}
      >
        <CheckCircle2 className="mr-2 h-4 w-4" />
        구현완료
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>구현한 프로젝트를 선택해주세요</DialogTitle>
            <DialogDescription>
              이 아이디어를 구현한 내 프로젝트를 연결하면 완료 처리됩니다.
            </DialogDescription>
          </DialogHeader>

          {fetching ? (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              프로젝트를 불러오는 중...
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 py-10 text-center dark:border-zinc-700">
              <p className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">
                아직 등록한 프로젝트가 없어요
              </p>
              <p className="mb-5 text-sm text-zinc-500">
                먼저 프로젝트를 등록한 뒤 다시 눌러주세요.
              </p>
              <Link
                href="/projects/new"
                onClick={() => setOpen(false)}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "rounded-full bg-emerald-600 text-white hover:bg-emerald-700",
                )}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                프로젝트 등록하기
              </Link>
            </div>
          ) : (
            <>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {projects.map((p) => {
                  const typeName =
                    PROJECT_TYPES.find((t) => t.value === p.type)?.label ?? p.type;
                  const isSelected = selected === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelected(p.id)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition-all duration-150",
                        isSelected
                          ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
                          : "border-zinc-200 bg-white/70 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "truncate font-medium",
                              isSelected
                                ? "text-emerald-800 dark:text-emerald-300"
                                : "text-zinc-900 dark:text-white",
                            )}
                          >
                            {p.title}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {typeName}
                            {p.short_description && ` · ${p.short_description}`}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <Link
                  href="/projects/new"
                  onClick={() => setOpen(false)}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "rounded-full",
                  )}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  프로젝트 등록하기
                </Link>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selected || submitting}
                  className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />처리 중...</>
                  ) : (
                    "완료 처리"
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
