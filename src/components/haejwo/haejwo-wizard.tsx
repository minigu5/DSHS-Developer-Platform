"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Megaphone } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PROJECT_TYPES, FEATURES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Markdown } from "@/components/shared/markdown";
import { EditorTabs, TITLE_INPUT_CLASS, type EditorTab } from "@/components/shared/editor-tabs";
import { ChoiceRow } from "@/components/forms/choice-row";
import { TYPE_ICONS, CATEGORY_ICONS } from "@/lib/type-icons";
import { GUIDE_PROGRAM_TYPES } from "@/lib/constants";
import { SECTION_COLORS } from "@/lib/section-colors";
import { createIdea, updateIdea } from "@/lib/haejwo/actions";

type Step = "type" | "category" | "write";

export interface HaejwoWizardDefaults {
  id: string;
  type: string;
  category: string;
  title: string;
  content: string;
}

interface HaejwoWizardProps {
  mode?: "create" | "edit";
  defaults?: HaejwoWizardDefaults;
}

export function HaejwoWizard({ mode = "create", defaults }: HaejwoWizardProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [step, setStep] = useState<Step>(mode === "edit" ? "write" : "type");
  const [type, setType] = useState(defaults?.type ?? "");
  const [category, setCategory] = useState(defaults?.category ?? "");

  const [title, setTitle] = useState(defaults?.title ?? "");
  const [content, setContent] = useState(defaults?.content ?? "");
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
    if (mode === "edit" && defaults?.id) {
      const result = await updateIdea(defaults.id, { title, type, category, content });
      setLoading(false);
      if ("error" in result) { toast.error(result.error); return; }
      toast.success("아이디어가 수정되었습니다.");
      router.push(`/haejwo/${defaults.id}`);
      router.refresh();
    } else {
      const result = await createIdea({ title, type, category, content });
      setLoading(false);
      if ("error" in result) { toast.error(result.error); return; }
      toast.success("아이디어가 등록되었습니다!");
      router.push(`/haejwo/${result.id}`);
    }
  }

  const typeName = PROJECT_TYPES.find((t) => t.value === type)?.label ?? "";
  const categoryName = FEATURES.find((c) => c.value === category)?.label ?? "";

  const typeDesc = (value: string) => GUIDE_PROGRAM_TYPES.find((t) => t.value === value)?.desc;

  return (
    <div className="w-full max-w-2xl">
      {mode !== "edit" && (
        <div className="mb-5 flex h-9 items-center justify-between">
          {stepNumber > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="-ml-3 inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
              이전
            </button>
          ) : (
            <span />
          )}
          <span className="inline-flex h-7 items-center rounded-full bg-orange-100 px-3 text-xs font-semibold text-orange-700 tabular-nums dark:bg-orange-950 dark:text-orange-300">
            {stepNumber}단계
          </span>
        </div>
      )}

      {step === "type" && (
        <>
          <div className="mb-6">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-[28px]">
              어떤 종류의 프로그램이 필요해요?
            </h2>
            <p className="mt-2 text-[15px] text-zinc-600 dark:text-zinc-400">원하는 결과물의 종류를 골라 주세요.</p>
          </div>
          <div className="grid gap-2.5 duration-200 animate-in fade-in">
            {PROJECT_TYPES.map((opt) => (
              <ChoiceRow
                key={opt.value}
                tone="haejwo"
                icon={TYPE_ICONS[opt.value]}
                label={opt.label}
                description={typeDesc(opt.value)}
                selected={type === opt.value}
                onSelect={() => {
                  setType(opt.value);
                  setStep("category");
                }}
              />
            ))}
          </div>
        </>
      )}

      {step === "category" && (
        <>
          <div className="mb-6">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-[28px]">
              어떤 분야의 프로그램이에요?
            </h2>
            <p className="mt-2 text-[15px] text-zinc-600 dark:text-zinc-400">가장 가까운 카테고리를 골라 주세요.</p>
          </div>
          <div className="grid gap-2.5 duration-200 animate-in fade-in">
            {FEATURES.map((opt) => (
              <ChoiceRow
                key={opt.value}
                tone="haejwo"
                icon={CATEGORY_ICONS[opt.value]}
                label={opt.label}
                selected={category === opt.value}
                onSelect={() => {
                  setCategory(opt.value);
                  setStep("write");
                }}
              />
            ))}
          </div>
        </>
      )}

      {step === "write" && (
        <div className="duration-200 animate-in fade-in">
          <div className="mb-6">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-[28px]">
              {mode === "edit" ? "아이디어 수정" : "어떤 프로그램이 있으면 좋겠어요?"}
            </h2>
            <p className="mt-2 text-[15px] text-zinc-600 dark:text-zinc-400">
              {typeName} · {categoryName}로 분류했어요. 개발자가 바로 이해할 수 있게 상황을 적어 주면 좋아요.
            </p>
          </div>

          <div className="grid gap-5">
            <div>
              <Label htmlFor="idea-title" className="sr-only">제목</Label>
              <Input
                id="idea-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 과제 제출 현황을 한눈에 볼 수 있는 앱"
                className={TITLE_INPUT_CLASS}
              />
            </div>

            <div className="grid gap-2.5">
              <div className="flex items-center justify-between">
                <EditorTabs value={editorTab} onChange={setEditorTab} showSplit={false} />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">마크다운</span>
              </div>

              {editorTab === "write" && (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  spellCheck={false}
                  placeholder={
                    "## 이런 프로그램이 있으면 좋겠어요\n\n원하는 기능을 구체적으로 설명해 주세요.\n\n### 주요 기능\n- 기능 1\n- 기능 2\n\n### 참고\n비슷한 서비스: ..."
                  }
                  className="min-h-[300px] w-full resize-y rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-sm leading-relaxed text-zinc-900 outline-none focus:ring-2 focus:ring-orange-500/30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              )}

              {editorTab === "preview" && (
                <div className="min-h-[300px] overflow-auto rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                  {content.trim() ? (
                    <Markdown>{content}</Markdown>
                  ) : (
                    <p className="text-sm text-zinc-500">작성한 내용이 여기에 미리보기로 표시돼요.</p>
                  )}
                </div>
              )}

              <p className="text-xs text-zinc-500 dark:text-zinc-400">Tab으로 들여쓰기, Shift+Tab으로 해제.</p>
            </div>

            <div className="flex justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => (mode === "edit" && defaults?.id ? router.push(`/haejwo/${defaults.id}`) : router.back())}
                className="h-11 rounded-full px-4"
              >
                취소
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={loading} className={cn("h-11 rounded-full px-5", SECTION_COLORS.haejwo.button)}>
                <Megaphone className="mr-1.5 h-4 w-4" aria-hidden />
                {loading ? (mode === "edit" ? "저장 중…" : "등록 중…") : mode === "edit" ? "저장" : "해줘! 등록"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
