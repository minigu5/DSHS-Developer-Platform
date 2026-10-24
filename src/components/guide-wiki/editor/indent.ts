// src/components/tips/tip-editor.tsx 의 Tab 들여쓰기 로직을 순수 함수로 옮긴 것.
// Tab → 두 칸 들여쓰기, 여러 줄 선택 + Shift+Tab → 들여쓰기 해제.

const INDENT = "  ";

export type IndentResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export function applyIndent(
  value: string,
  start: number,
  end: number,
  outdent: boolean,
): IndentResult {
  if (start === end) {
    return {
      value: value.slice(0, start) + INDENT + value.slice(end),
      selectionStart: start + INDENT.length,
      selectionEnd: start + INDENT.length,
    };
  }
  // 멀티라인 선택 시 라인 단위 들여쓰기
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const selected = value.slice(lineStart, end);
  const lines = selected.split("\n");
  const transformed = outdent
    ? lines.map((l) => l.replace(/^( {1,2}|\t)/, "")).join("\n")
    : lines.map((l) => INDENT + l).join("\n");
  return {
    value: value.slice(0, lineStart) + transformed + value.slice(end),
    selectionStart: lineStart,
    selectionEnd: lineStart + transformed.length,
  };
}
