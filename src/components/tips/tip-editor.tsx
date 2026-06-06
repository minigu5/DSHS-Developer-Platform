"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Columns2, Eye, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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

type Tab = "write" | "preview" | "split";

export function TipEditor({ mode, defaults = EMPTY }: TipEditorProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("write");

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
    "min-h-[400px] w-full resize-y rounded-2xl border border-zinc-200 bg-white/70 p-4 font-mono text-sm leading-relaxed text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100";
  const previewClass =
    "min-h-[400px] overflow-auto rounded-2xl border border-zinc-200 bg-white/70 p-6 dark:border-zinc-800 dark:bg-zinc-900/60";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 바이브 코딩으로 막힐 때 빠르게 푸는 법"
          className="h-12 rounded-xl text-base"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="summary">한 줄 요약 <span className="text-red-500">*</span></Label>
          <span className={cn("text-xs", summary.length > 30 ? "text-red-500 font-medium" : "text-zinc-400")}>
            {summary.length} / 30
          </span>
        </div>
        <Input
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={30}
          placeholder="목록에 표시될 짧은 설명 (최대 30자)"
          className="rounded-xl"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>대표 이미지 <span className="text-red-500">*</span></Label>
          <ImageUploadInput
            value={coverUrl}
            onChange={setCoverUrl}
            shape="square"
            previewSize="md"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="tags">태그 <span className="text-zinc-400">(쉼표로 구분)</span></Label>
            <span className={cn("text-xs", tagCount >= 8 ? "text-red-500 font-medium" : "text-zinc-400")}>
              {tagCount} / 8
            </span>
          </div>
          <Input
            id="tags"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="claude-code, 디버깅, 팁"
            className="rounded-xl"
          />
          {tagCount >= 8 && (
            <p className="text-[10px] text-red-500">태그는 최대 8개까지 등록할 수 있습니다.</p>
          )}
        </div>
      </div>

      {/* 본문: 작성 / 미리보기 / 분할 보기 탭 */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>본문 (마크다운)</Label>
          <div className="inline-flex rounded-full border border-zinc-200 p-0.5 dark:border-zinc-800">
            <TabButton active={tab === "write"} onClick={() => setTab("write")} icon={<Pencil className="mr-1.5 h-3.5 w-3.5" />} label="작성" />
            <TabButton active={tab === "split"} onClick={() => setTab("split")} icon={<Columns2 className="mr-1.5 h-3.5 w-3.5" />} label="분할" hideOnMobile />
            <TabButton active={tab === "preview"} onClick={() => setTab("preview")} icon={<Eye className="mr-1.5 h-3.5 w-3.5" />} label="미리보기" />
          </div>
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
              <p className="text-sm text-zinc-400">작성한 내용이 여기에 미리보기로 표시됩니다.</p>
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
                <p className="text-sm text-zinc-400">작성한 내용이 여기에 미리보기로 표시됩니다.</p>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-400">
          Tab으로 두 칸 들여쓰기, Shift+Tab으로 해제. 코드 블록은 <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">```언어</code> 로 감쌀 수 있어요.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="rounded-full"
        >
          취소
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-full bg-blue-600 px-6 text-white hover:bg-blue-700"
        >
          {loading ? "저장 중..." : mode === "create" ? "팁 등록" : "수정 저장"}
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
        active ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white",
        hideOnMobile && "hidden sm:inline-flex",
      )}
    >
      {icon} {label}
    </button>
  );
}
