"use client";

import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Columns2, Eye, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/shared/markdown";
import { ANNOUNCEMENT_CATEGORIES, ADMIN_ANNOUNCEMENT_CATEGORY } from "@/lib/constants";
import {
  createAnnouncement,
  updateAnnouncement,
  type AnnouncementFormInput,
} from "@/lib/announcements/actions";

export interface AnnouncementEditorDefaults {
  id?: string;
  title: string;
  category: string;
  content: string;
}

interface AnnouncementEditorProps {
  mode: "create" | "edit";
  defaults?: AnnouncementEditorDefaults;
  isAdmin?: boolean;
}

const EMPTY: AnnouncementEditorDefaults = { title: "", category: "", content: "" };

type Tab = "write" | "preview" | "split";

export function AnnouncementEditor({ mode, defaults = EMPTY, isAdmin = false }: AnnouncementEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("write");
  const [title, setTitle] = useState(defaults.title);
  const [category, setCategory] = useState(defaults.category);
  const [content, setContent] = useState(defaults.content);

  function handleTextareaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const value = el.value;
      const INDENT = "  ";

      if (start === end) {
        const next = value.slice(0, start) + INDENT + value.slice(end);
        setContent(next);
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + INDENT.length;
        });
      } else {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const selected = value.slice(lineStart, end);
        const lines = selected.split("\n");
        const transformed = e.shiftKey
          ? lines.map((l) => l.replace(/^( {1,2}|\t)/, "")).join("\n")
          : lines.map((l) => INDENT + l).join("\n");
        const next = value.slice(0, lineStart) + transformed + value.slice(end);
        setContent(next);
        requestAnimationFrame(() => {
          el.selectionStart = lineStart;
          el.selectionEnd = lineStart + transformed.length;
        });
      }
    }
  }

  async function handleSubmit() {
    if (!category) {
      toast.error("카테고리를 선택해주세요.");
      return;
    }
    const input: AnnouncementFormInput = { title, category, content };

    setLoading(true);
    const result =
      mode === "create"
        ? await createAnnouncement(input)
        : await updateAnnouncement(defaults.id!, input);
    setLoading(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(mode === "create" ? "공지사항이 등록되었습니다." : "공지사항이 수정되었습니다.");
    router.push(`/announcements/${result.id}`);
    router.refresh();
  }

  const textareaClass =
    "min-h-[400px] w-full resize-y rounded-2xl border border-zinc-200 bg-white/70 p-4 font-mono text-sm leading-relaxed text-zinc-900 outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100";
  const previewClass =
    "min-h-[400px] overflow-auto rounded-2xl border border-zinc-200 bg-white/70 p-6 dark:border-zinc-800 dark:bg-zinc-900/60";

  return (
    <div className="space-y-6">
      {/* 카테고리 */}
      <div className="space-y-3">
        <Label>카테고리 <span className="text-red-500">*</span></Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {ANNOUNCEMENT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={cn(
                "flex flex-col items-start rounded-2xl border p-3 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
                category === cat.value
                  ? "border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/30"
                  : "border-zinc-200 bg-white hover:border-sky-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-sky-700",
              )}
            >
              <span className={cn(
                "text-sm font-semibold",
                category === cat.value ? "text-sky-700 dark:text-sky-300" : "text-zinc-700 dark:text-zinc-300",
              )}>
                {cat.label}
              </span>
              <span className="mt-0.5 text-[11px] leading-snug text-zinc-400">{cat.desc}</span>
            </button>
          ))}
          {isAdmin && (
            <button
              key={ADMIN_ANNOUNCEMENT_CATEGORY.value}
              type="button"
              onClick={() => setCategory(ADMIN_ANNOUNCEMENT_CATEGORY.value)}
              className={cn(
                "flex flex-col items-start rounded-2xl border p-3 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2",
                category === ADMIN_ANNOUNCEMENT_CATEGORY.value
                  ? "border-rose-500 bg-rose-50 dark:border-rose-500 dark:bg-rose-950/30"
                  : "border-zinc-200 bg-white hover:border-rose-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-rose-700",
              )}
            >
              <span className={cn(
                "text-sm font-semibold",
                category === ADMIN_ANNOUNCEMENT_CATEGORY.value ? "text-rose-700 dark:text-rose-300" : "text-zinc-700 dark:text-zinc-300",
              )}>
                {ADMIN_ANNOUNCEMENT_CATEGORY.label}
              </span>
              <span className="mt-0.5 text-[11px] leading-snug text-zinc-400">{ADMIN_ANNOUNCEMENT_CATEGORY.desc}</span>
            </button>
          )}
        </div>
      </div>

      {/* 제목 */}
      <div className="space-y-2">
        <Label htmlFor="title">제목 <span className="text-red-500">*</span></Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 우리 앱 베타 테스터 모집합니다!"
          className="h-12 rounded-xl text-base"
        />
      </div>

      {/* 본문 */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>내용 (마크다운) <span className="text-red-500">*</span></Label>
          <div className="inline-flex rounded-full border border-zinc-200 p-0.5 dark:border-zinc-800">
            <TabButton active={tab === "write"} onClick={() => setTab("write")} icon={<Pencil className="mr-1.5 h-3.5 w-3.5" />} label="작성" />
            <TabButton active={tab === "split"} onClick={() => setTab("split")} icon={<Columns2 className="mr-1.5 h-3.5 w-3.5" />} label="분할" hideOnMobile />
            <TabButton active={tab === "preview"} onClick={() => setTab("preview")} icon={<Eye className="mr-1.5 h-3.5 w-3.5" />} label="미리보기" />
          </div>
        </div>

        {tab === "write" && (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            spellCheck={false}
            placeholder={"# 제목\n\n마크다운으로 자유롭게 작성하세요.\n\n## 베타 테스트 참여 방법\n1. 링크 접속\n2. 피드백 제출\n\n```\n예시 코드\n```"}
            className={textareaClass}
          />
        )}
        {tab === "preview" && (
          <div className={previewClass}>
            {content.trim() ? (
              <Markdown>{content}</Markdown>
            ) : (
              <p className="text-sm text-zinc-400">작성한 내용이 여기에 미리보기로 표시됩니다.</p>
            )}
          </div>
        )}
        {tab === "split" && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              spellCheck={false}
              placeholder={"# 제목\n\n마크다운으로 자유롭게 작성하세요."}
              className={textareaClass}
            />
            <div className={previewClass}>
              {content.trim() ? (
                <Markdown>{content}</Markdown>
              ) : (
                <p className="text-sm text-zinc-400">작성한 내용이 여기에 미리보기로 표시됩니다.</p>
              )}
            </div>
          </div>
        )}
        <p className="text-xs text-zinc-400">
          Tab으로 두 칸 들여쓰기, Shift+Tab으로 해제. 코드 블록은{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">```언어</code>로 감쌀 수 있어요.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-full">
          취소
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-full bg-sky-600 px-6 text-white hover:bg-sky-700"
        >
          {loading ? "저장 중..." : mode === "create" ? "공지사항 등록" : "수정 저장"}
        </Button>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  hideOnMobile,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hideOnMobile?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors",
        active ? "bg-sky-600 text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white",
        hideOnMobile && "hidden sm:inline-flex",
      )}
    >
      {icon} {label}
    </button>
  );
}
