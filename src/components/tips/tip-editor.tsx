"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";
import { EditorTabs, TITLE_INPUT_CLASS, type EditorTab } from "@/components/shared/editor-tabs";
import { ImageUploadInput } from "@/components/shared/image-upload-input";
import { Markdown } from "@/components/shared/markdown";
import { createTip, updateTip, type TipFormInput } from "@/lib/tips/actions";

export interface TipEditorDefaults {
  id?: string;
  title: string;
  summary: string;
  content: string;
  cover_url: string;
  tags: string[];
}

interface TipEditorProps {
  mode: "create" | "edit";
  defaults?: TipEditorDefaults;
}

const EMPTY: TipEditorDefaults = {
  title: "",
  summary: "",
  content: "",
  cover_url: "",
  tags: [],
};


export function TipEditor({ mode, defaults = EMPTY }: TipEditorProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<EditorTab>("write");

  const [title, setTitle] = useState(defaults.title);
  const [summary, setSummary] = useState(defaults.summary);
  const [coverUrl, setCoverUrl] = useState(defaults.cover_url);
  const [tagsText, setTagsText] = useState(defaults.tags.join(", "));
  const [content, setContent] = useState(defaults.content);

  function handleTextareaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Tab → 두 칸 들여쓰기, Shift+Tab → 들여쓰기 해제
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
        // 멀티라인 선택 시 라인 단위 들여쓰기
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
    const input: TipFormInput = {
      title,
      summary,
      content,
      cover_url: coverUrl,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8),
    };

    setLoading(true);
    const result =
      mode === "create" ? await createTip(input) : await updateTip(defaults.id!, input);
    setLoading(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(mode === "create" ? "팁이 등록되었습니다." : "팁이 수정되었습니다.");
    router.push(`/tips/${result.id}`);
    router.refresh();
  }

  const tagCount = tagsText.split(",").map((t) => t.trim()).filter(Boolean).length;

  const textareaClass =
    "min-h-[320px] w-full resize-y rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-sm leading-relaxed text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100";
  const previewClass =
    "min-h-[320px] overflow-auto rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950/40";

  const card = "rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7";

  return (
    <div className="grid gap-[18px]">
      {/* 카드 1 — 제목·요약·태그·대표 이미지 */}
      <section className={cn(card, "grid gap-5")}>
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

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="summary" className="text-[13px] font-semibold">
                한 줄 요약 <span className="text-rose-600" aria-hidden>*</span>
              </Label>
              <span className={cn("text-xs tabular-nums", summary.length > 30 ? "font-medium text-rose-600" : "text-zinc-500")}>
                {summary.length} / 30
              </span>
            </div>
            <Input
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={30}
              placeholder="목록 카드에 보여요"
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">목록 카드에 보여요. 최대 30자.</p>
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="tags" className="text-[13px] font-semibold">태그</Label>
              <span className={cn("text-xs tabular-nums", tagCount >= 8 ? "font-medium text-rose-600" : "text-zinc-500")}>
                {tagCount} / 8
              </span>
            </div>
            <Input
              id="tags"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="claude-code, 디버깅, 팁"
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">쉼표로 구분. 최대 8개.</p>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-[13px] font-semibold">
            대표 이미지 <span className="text-rose-600" aria-hidden>*</span>
          </Label>
          <ImageUploadInput value={coverUrl} onChange={setCoverUrl} shape="square" previewSize="md" />
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
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            spellCheck={false}
            placeholder={"# 제목\n\n마크다운으로 자유롭게 작성하세요.\n\n- 목록\n- `코드`\n\n```ts\nconsole.log('hello');\n```"}
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
              ref={textareaRef}
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
          {mode === "create" ? "발행하면 바로 목록에 올라가요. 수정은 나중에도 할 수 있어요." : "저장하면 바로 반영돼요."}
        </p>
        <Button type="button" variant="ghost" onClick={() => router.back()} className="h-11 rounded-full px-4">
          취소
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={loading} className={cn("h-11 rounded-full px-5", SECTION_COLORS.tips.button)}>
          <PenLine className="mr-1.5 h-4 w-4" aria-hidden />
          {loading ? "저장 중…" : mode === "create" ? "팁 발행" : "저장"}
        </Button>
      </div>
    </div>
  );
}
