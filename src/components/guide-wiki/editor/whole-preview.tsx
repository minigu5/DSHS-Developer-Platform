import type { WikiStep } from "@/lib/guide-wiki/types";
import { DocRender } from "@/components/guide-wiki/doc-render";

/** 저장하면 가이드에 보일 모습. 모든 단계를 이어서 보여 준다. */
export function WholePreview({ steps }: { steps: WikiStep[] }) {
  return <DocRender steps={steps} />;
}
