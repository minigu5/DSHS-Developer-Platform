// README의 문서 안 바로가기(`[설치](#설치-방법)`)가 제목으로 가려면 제목에 GitHub과 같은 규칙으로 id가 있어야 한다.
// GitHub(github-slugger) 규칙: 소문자로, 글자·숫자·밑줄·하이픈·공백만 남기고, 공백은 하이픈으로. 같은 제목이 또 나오면 -1, -2.

export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
    .replace(/ /g, "-");
}

/** 한 문서 안에서 겹치지 않는 id를 만든다(문서마다 새로 만들 것). */
export function createSlugger() {
  const seen = new Map<string, number>();
  return (text: string): string => {
    const base = headingSlug(text);
    let slug = base;
    let count = seen.get(base) ?? 0;
    while (seen.has(slug)) slug = `${base}-${++count}`;
    seen.set(base, count);
    seen.set(slug, 0);
    return slug;
  };
}

// react-markdown(hast)의 노드 중 여기서 쓰는 부분만
interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

/** h1~h6에 GitHub식 id를 붙이는 rehype 플러그인. 직접 id를 단 제목은 건드리지 않는다. */
export function rehypeHeadingIds() {
  return (tree: HastNode) => {
    const slug = createSlugger();
    const walk = (node: HastNode) => {
      if (node.type === "element" && /^h[1-6]$/.test(node.tagName ?? "")) {
        node.properties ??= {};
        if (!node.properties.id) node.properties.id = slug(textOf(node));
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
