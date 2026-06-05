"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PROJECT_TYPES, FEATURES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Markdown } from "@/components/shared/markdown";
import { createIdea } from "@/lib/haejwo/actions";

type Step = "type" | "category" | "write";
type EditorTab = "write" | "preview";

export function HaejwoWizard() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [step, setStep] = useState<Step>("type");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editorTab, setEditorTab] = useState<EditorTab>("write");
  const [loading, setLoading] = useState(false);

  const stepNumber = step === "type" ? 1 : step === "category" ? 2 : 3;

  const goBack = () => {
    if (step === "category") setStep("type");
    else if (step === "write") setStep("category");
  };

  function handleTextareaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
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

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    if (!content.trim()) {
      toast.error("아이디어 내용을 입력해주세요.");
      return;
    }
    setLoading(true);
    const result = await createIdea({ title, type, category, content });
    setLoading(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("아이디어가 등록되었습니다!");
    router.push(`/haejwo/${result.id}`);
  }

  const typeName = PROJECT_TYPES.find((t) => t.value === type)?.label ?? "";
  const categoryName = FEATURES.find((c) => c.value === category)?.label ?? "";

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8 flex h-10 items-center justify-between">
        {stepNumber > 1 ? (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            이전
          </button>
        ) : (
          <span />
        )}
        <span className="text-sm font-medium text-zinc-400">{stepNumber}단계</span>
      </div>

      {step === "type" && (
        <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              어떤 종류의 프로그램이 필요한가요?
            </h2>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">원하는 결과물의 종류를 선택해주세요.</p>
          </div>
          <div className="space-y-3 duration-300 animate-in fade-in slide-in-from-bottom-4">
            {PROJECT_TYPES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setType(opt.value);
                  setStep("category");
                }}
                className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white/70 p-4 text-left transition-all duration-200 hover:scale-[1.01] hover:border-orange-300 hover:shadow-lg active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-orange-700"
              >
                <p className="font-semibold text-zinc-900 dark:text-white">{opt.label}</p>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-transparent transition-colors group-hover:border-orange-400 dark:border-zinc-700">
                  <Check className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "category" && (
        <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              어떤 분야의 기능인가요?
            </h2>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              아이디어가 속하는 카테고리를 골라주세요.
            </p>
          </div>
          <div className="space-y-3 duration-300 animate-in fade-in slide-in-from-bottom-4">
            {FEATURES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setCategory(opt.value);
                  setStep("write");
                }}
                className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white/70 p-4 text-left transition-all duration-200 hover:scale-[1.01] hover:border-orange-300 hover:shadow-lg active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-orange-700"
              >
                <p className="font-semibold text-zinc-900 dark:text-white">{opt.label}</p>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-transparent transition-colors group-hover:border-orange-400 dark:border-zinc-700">
                  <Check className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "write" && (
        <div className="duration-300 animate-in fade-in slide-in-from-bottom-4">
          <div className="mb-8">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                {typeName}
              </span>
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {categoryName}
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              아이디어를 자세히 설명해주세요
            </h2>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              개발자가 이해할 수 있도록 구체적으로 작성해주세요.
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="idea-title">제목</Label>
              <Input
                id="idea-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 과제 제출 현황을 한눈에 볼 수 있는 앱"
                className="h-12 rounded-xl text-base"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>아이디어 설명 (마크다운)</Label>
                <div className="inline-flex rounded-full border border-zinc-200 p-0.5 dark:border-zinc-800">
                  <TabButton
                    active={editorTab === "write"}
                    onClick={() => setEditorTab("write")}
                    icon={<Pencil className="mr-1.5 h-3.5 w-3.5" />}
                    label="작성"
                  />
                  <TabButton
                    active={editorTab === "preview"}
                    onClick={() => setEditorTab("preview")}
                    icon={<Eye className="mr-1.5 h-3.5 w-3.5" />}
                    label="미리보기"
                  />
                </div>
              </div>

              {editorTab === "write" && (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  spellCheck={false}
                  placeholder={
                    "## 이런 프로그램이 있으면 좋겠어요\n\n원하는 기능을 구체적으로 설명해주세요.\n\n### 주요 기능\n- 기능 1\n- 기능 2\n\n### 참고\n비슷한 서비스: ..."
                  }
                  className="min-h-[360px] w-full resize-y rounded-2xl border border-zinc-200 bg-white/70 p-4 font-mono text-sm leading-relaxed text-zinc-900 outline-none focus:ring-2 focus:ring-orange-500/30 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100"
                />
              )}

              {editorTab === "preview" && (
                <div className="min-h-[360px] overflow-auto rounded-2xl border border-zinc-200 bg-white/70 p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
                  {content.trim() ? (
                    <Markdown>{content}</Markdown>
                  ) : (
                    <p className="text-sm text-zinc-400">
                      작성한 내용이 여기에 미리보기로 표시됩니다.
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-zinc-400">
                Tab으로 들여쓰기, Shift+Tab으로 해제.
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
                className="rounded-full bg-orange-500 px-6 text-white hover:bg-orange-600"
              >
                {loading ? "등록 중..." : "해줘! 등록"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-orange-500 text-white"
          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
