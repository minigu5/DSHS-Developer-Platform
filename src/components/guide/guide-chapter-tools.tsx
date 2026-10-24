// 결과 스테퍼의 장 이름 줄 오른쪽 자리 — 조각별 "고치기"·"기록" 링크.
// 가이드 위키 편집 기능(docs/superpowers/specs/2026-10-24-guide-wiki-editing-design.md §7.5)이 채운다:
//   고치기 /guide-wiki/<key>/edit?from=<지금 가이드 경로>, 기록 /guide-wiki/<key>/history
// 그 기능이 들어오기 전에는 빈 자리나 죽은 링크를 남기지 않도록 아무것도 그리지 않는다.

interface GuideChapterToolsProps {
  fragmentKey: string;
  from: string;
}

export function GuideChapterTools(props: GuideChapterToolsProps) {
  void props;
  return null;
}
