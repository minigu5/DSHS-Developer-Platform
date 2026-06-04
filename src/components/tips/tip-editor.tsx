"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/shared/markdown";
import { createTip, updateTip, type TipFormInput } from "@/app/(nav)/tips/actions";

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
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");

  const [title, setTitle] = useState(defaults.title);
  const [summary, setSummary] = useState(defaults.summary);
  const [coverUrl, setCoverUrl] = useState(defaults.cover_url);
  const [tagsText, setTagsText] = useState(defaults.tags.join(", "));
  const [content, setContent] = useState(defaults.content);

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

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(mode === "create" ? "팁이 등록되었습니다." : "팁이 수정되었습니다.");
    const id = "id" in result ? result.id : defaults.id;
    router.push(`/tips/${id}`);
    router.refresh();
  }

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
        <Label htmlFor="summary">한 줄 요약 <span className="text-zinc-400">(선택)</span></Label>
        <Input
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="목록에 표시될 짧은 설명"
          className="rounded-xl"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cover">대표 이미지 URL <span className="text-zinc-400">(선택)</span></Label>
          <Input
            id="cover"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://i.ibb.co/..."
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">태그 <span className="text-zinc-400">(쉼표로 구분)</span></Label>
          <Input
            id="tags"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="claude-code, 디버깅, 팁"
            className="rounded-xl"
          />
        </div>
      </div>

      {/* 본문: 작성 / 미리보기 탭 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>본문 (마크다운)</Label>
          <div className="inline-flex rounded-full border border-zinc-200 p-0.5 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setTab("write")}
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors",
                tab === "write"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white",
              )}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> 작성
            </button>
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors",
                tab === "preview"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white",
              )}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" /> 미리보기
            </button>
          </div>
        </div>

        {tab === "write" ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"# 제목\n\n마크다운으로 자유롭게 작성하세요.\n\n- 목록\n- `코드`\n\n```ts\nconsole.log('hello');\n```"}
            className="min-h-[400px] w-full resize-y rounded-2xl border border-zinc-200 bg-white/70 p-4 font-mono text-sm leading-relaxed text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100"
          />
        ) : (
          <div className="min-h-[400px] rounded-2xl border border-zinc-200 bg-white/70 p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
            {content.trim() ? (
              <Markdown>{content}</Markdown>
            ) : (
              <p className="text-sm text-zinc-400">작성한 내용이 여기에 미리보기로 표시됩니다.</p>
            )}
          </div>
        )}
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
