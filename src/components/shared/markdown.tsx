import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const components = {
  h1: (props: React.ComponentProps<"h1">) => (
    <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-white" {...props} />
  ),
  h2: (props: React.ComponentProps<"h2">) => (
    <h2 className="mb-3 mt-6 text-xl font-bold text-zinc-900 dark:text-white" {...props} />
  ),
  h3: (props: React.ComponentProps<"h3">) => (
    <h3 className="mb-2 mt-4 text-lg font-semibold text-zinc-900 dark:text-white" {...props} />
  ),
  p: (props: React.ComponentProps<"p">) => (
    <p className="mb-4 leading-relaxed text-zinc-700 dark:text-zinc-300" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="mb-4 list-disc space-y-1 pl-6 text-zinc-700 dark:text-zinc-300" {...props} />
  ),
  ol: (props: React.ComponentProps<"ol">) => (
    <ol className="mb-4 list-decimal space-y-1 pl-6 text-zinc-700 dark:text-zinc-300" {...props} />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a
      className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  code: ({ className, ...props }: React.ComponentProps<"code">) => {
    const isBlock = className?.includes("language-");
    return (
      <code
        className={cn(
          isBlock
            ? "block"
            : "rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm text-pink-600 dark:bg-zinc-800 dark:text-pink-400",
          className,
        )}
        {...props}
      />
    );
  },
  pre: (props: React.ComponentProps<"pre">) => (
    <pre
      className="mb-4 overflow-x-auto rounded-xl bg-zinc-900 p-4 font-mono text-sm text-zinc-100 dark:bg-black/60"
      {...props}
    />
  ),
  blockquote: (props: React.ComponentProps<"blockquote">) => (
    <blockquote
      className="mb-4 border-l-4 border-blue-400 pl-4 italic text-zinc-600 dark:text-zinc-400"
      {...props}
    />
  ),
  img: (props: React.ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="mb-4 rounded-xl border border-zinc-200 dark:border-zinc-800" alt="" {...props} />
  ),
  hr: (props: React.ComponentProps<"hr">) => (
    <hr className="my-6 border-zinc-200 dark:border-zinc-800" {...props} />
  ),
  table: (props: React.ComponentProps<"table">) => (
    <div className="mb-4 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: (props: React.ComponentProps<"thead">) => (
    <thead className="bg-zinc-50 dark:bg-zinc-800/60" {...props} />
  ),
  tbody: (props: React.ComponentProps<"tbody">) => (
    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700" {...props} />
  ),
  tr: (props: React.ComponentProps<"tr">) => (
    <tr className="divide-x divide-zinc-200 dark:divide-zinc-700" {...props} />
  ),
  th: (props: React.ComponentProps<"th">) => (
    <th
      className="px-4 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-200"
      {...props}
    />
  ),
  td: (props: React.ComponentProps<"td">) => (
    <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300" {...props} />
  ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
