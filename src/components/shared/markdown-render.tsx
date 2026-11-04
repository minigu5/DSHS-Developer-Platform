import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { rehypeHeadingIds } from "@/lib/heading-slug";
import { cn, isInternalHref } from "@/lib/utils";

const components = {
  h1: (props: React.ComponentProps<"h1">) => (
    <h1 className="mb-4 scroll-mt-20 text-2xl font-bold text-zinc-900 dark:text-white" {...props} />
  ),
  h2: (props: React.ComponentProps<"h2">) => (
    <h2 className="mb-3 mt-6 scroll-mt-20 text-xl font-bold text-zinc-900 dark:text-white" {...props} />
  ),
  h3: (props: React.ComponentProps<"h3">) => (
    <h3 className="mb-2 mt-4 scroll-mt-20 text-lg font-semibold text-zinc-900 dark:text-white" {...props} />
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
  // 사이트 안 주소(/로 시작)와 문서 안 바로가기(#제목)는 같은 탭, 바깥 주소는 새 탭
  a: (props: React.ComponentProps<"a">) => (
    <a
      className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
      {...(isInternalHref(props.href) || props.href?.startsWith("#") ? {} : { target: "_blank", rel: "noreferrer" })}
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

/** 마크다운을 바로 그린다. 서버에서 쓰면 요청마다 CPU를 많이 써서, 빌드 때 그려지는 정적 페이지에서만 직접 쓴다. 나머지는 `Markdown`(브라우저에서 그림). */
export function MarkdownRender({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHeadingIds]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
