"use client";

import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";
import { EditorTabs, TITLE_INPUT_CLASS, type EditorTab } from "@/components/shared/editor-tabs";
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


export function AnnouncementEditor({ mode, defaults = EMPTY, isAdmin = false }: AnnouncementEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<EditorTab>("write");
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
    "min-h-[320px] w-full resize-y rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-sm leading-relaxed text-zinc-900 outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100";
  const previewClass =
    "min-h-[320px] overflow-auto rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950/40";

  const card = "rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7";

  return (
    <div className="grid gap-[18px]">
      {/* 카드 1 — 카테고리(단일 선택이라 섹션 색 유지) + 제목 */}
      <section className={cn(card, "grid gap-5")}>
        <div className="grid gap-2.5">
          <Label className="text-[13px] font-semibold">
            카테고리 <span className="text-rose-600" aria-hidden>*</span>
          </Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {ANNOUNCEMENT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={cn(
                "flex flex-col items-start rounded-2xl border p-3 text-left transition-colors",
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
                "flex flex-col items-start rounded-2xl border p-3 text-left transition-colors",
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

        <div>
          <Label htmlFor="title" className="sr-only">제목</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 적어 주세요"
            className={TITLE_INPUT_CLASS}
          />
        </div>
      </section>

      {/* 카드 2 — 본문 */}
      <section className={cn(card, "grid gap-3.5")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-bold text-zinc-900 dark:text-white">
            본문 <span className="ml-1 font-sans text-xs font-medium text-zinc-500 dark:text-zinc-400">마크다운</span>
          </h2>
          <EditorTabs value={tab} onChange={setTab} />
        </div>

        {tab === "write" && (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            spellCheck={false}
            placeholder={"## 무엇을 알리고 싶어요?\n\n마크다운으로 자유롭게 작성하세요."}
            className={textareaClass}
          />
        )}

        {tab === "preview" && (
          <div className={previewClass}>
            {content.trim() ? (
              <Markdown>{content}</Markdown>
            ) : (
              <p className="text-sm text-zinc-500">작성한 내용이 여기에 미리보기로 표시돼요.</p>
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
              placeholder={"## 무엇을 알리고 싶어요?\n\n마크다운으로 자유롭게 작성하세요."}
              className={textareaClass}
            />
            <div className={previewClass}>
              {content.trim() ? (
                <Markdown>{content}</Markdown>
              ) : (
                <p className="text-sm text-zinc-500">작성한 내용이 여기에 미리보기로 표시돼요.</p>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Tab으로 두 칸 들여쓰기, Shift+Tab으로 해제. 코드 블록은 <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">```언어</code>로 감쌀 수 있어요.
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <p className="mr-auto text-xs text-zinc-500 dark:text-zinc-400">
          {mode === "create" ? "올리면 홈 티커와 목록에 바로 보여요." : "저장하면 바로 반영돼요."}
        </p>
        <Button type="button" variant="ghost" onClick={() => router.back()} className="h-11 rounded-full px-4">
          취소
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={loading} className={cn("h-11 rounded-full px-5", SECTION_COLORS.announcements.button)}>
          <PenLine className="mr-1.5 h-4 w-4" aria-hidden />
          {loading ? "저장 중…" : mode === "create" ? "공지 올리기" : "저장"}
        </Button>
      </div>
    </div>
  );
}
