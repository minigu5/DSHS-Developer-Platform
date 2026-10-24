import { Markdown } from "@/components/shared/markdown";

/** 가이드 위키 단계 본문 렌더링. 편집기·기록·옛 버전 화면이 모두 이 컴포넌트를 쓴다. */
export function StepBody({ body }: { body: string }) {
  return <Markdown>{body}</Markdown>;
}
