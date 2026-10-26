/**
 * 마크다운 본문에서 공지 카드 요약용 평문을 뽑는다(최대 120자).
 * 제목·코드 블록·구분선·이미지만 있는 문단은 건너뛰고 첫 번째 "글" 문단을 쓴다.
 * 강조 기호는 짝으로만 지워서 `snake_case`·`~` 같은 글자는 남긴다.
 */
export function announcementSummary(content: string, max = 120): string {
  const withoutCode = content.replace(/```[\s\S]*?(```|$)/g, "\n\n");
  for (const block of withoutCode.split(/\n\s*\n/)) {
    const text = block
      .split("\n")
      .filter((line) => !/^\s*#{1,6}\s/.test(line) && !/^\s*([-*_])(\s*\1){2,}\s*$/.test(line))
      .join(" ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/(\*\*|__|~~)(.+?)\1/g, "$2")
      .replace(/(^|[\s(])[*_](\S(?:.*?\S)?)[*_](?=[\s).,!?]|$)/g, "$1$2")
      .replace(/(^|\s)>\s?/g, "$1")
      .replace(/(^|\s)(?:[-+*]|\d+\.)\s+/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    if (text) return text.slice(0, max);
  }
  return "";
}
