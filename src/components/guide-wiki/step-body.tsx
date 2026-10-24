import { GuideStepBody } from "@/components/guide/guide-step-body";

/**
 * 가이드 위키 단계 본문 렌더링. 편집기·기록·옛 버전 화면이 모두 이 컴포넌트를 쓴다.
 * 답(answers) 없이 그리므로 `[!only …]` 조건 블록은 조건 라벨이 붙은 점선 상자로 모두 보인다.
 */
export function StepBody({ body }: { body: string }) {
  return <GuideStepBody body={body} />;
}
