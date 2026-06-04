// 바이브 코딩 가이드 위저드의 단계 정의 + 슬러그 변환 로직.
// 클라이언트(위저드)와 서버(결과 페이지)가 동일한 규칙을 공유하기 위해 분리.
// 단계는 사용자의 이전 선택에 따라 동적으로 노출/비활성화된다.

import {
  GUIDE_PROGRAM_TYPES,
  GUIDE_APP_PLATFORMS,
  GUIDE_TERMINAL,
  GUIDE_AI_TOOLS,
  GUIDE_OS,
} from "@/lib/constants";

export type GuideAnswers = Record<string, string>;
export type GuideOption = { value: string; label: string; desc?: string };

export type GuideStep = {
  key: string;
  /** 결과 페이지 칩 등에서 쓰는 짧은 라벨 */
  segmentLabel: string;
  /** 위저드 단계 제목 */
  title: string;
  description: string;
  options: readonly GuideOption[];
  /** 현재까지의 선택을 보고 이 단계를 보여줄지 결정 */
  visible: (answers: GuideAnswers) => boolean;
  /** 특정 옵션이 비활성화되어야 하면 그 이유를, 아니면 null 반환 */
  disabledReason?: (answers: GuideAnswers, value: string) => string | null;
};

const APPLE_APP_PLATFORMS = ["ios", "ipados", "macos"];

export const GUIDE_STEPS: GuideStep[] = [
  {
    key: "type",
    segmentLabel: "프로그램 종류",
    title: "어떤 프로그램을 만들 건가요?",
    description: "만들고 싶은 결과물의 종류를 선택해주세요.",
    options: GUIDE_PROGRAM_TYPES,
    visible: () => true,
  },
  {
    key: "appPlatform",
    segmentLabel: "앱 플랫폼",
    title: "어떤 플랫폼의 앱인가요?",
    description: "앱이 동작할 대상 플랫폼을 선택해주세요.",
    options: GUIDE_APP_PLATFORMS,
    visible: (a) => a.type === "app",
  },
  {
    key: "terminal",
    segmentLabel: "터미널",
    title: "터미널 사용은 어떤가요?",
    description: "명령어 입력 환경에 얼마나 익숙한지 알려주세요.",
    options: GUIDE_TERMINAL,
    visible: () => true,
  },
  {
    key: "ai",
    segmentLabel: "AI 도구",
    title: "어떤 AI 도구를 사용할 건가요?",
    description: "바이브 코딩에 함께할 AI 코딩 도구를 골라주세요.",
    options: GUIDE_AI_TOOLS,
    visible: () => true,
  },
  {
    key: "os",
    segmentLabel: "운영체제",
    title: "어떤 운영체제를 사용하나요?",
    description: "현재 사용 중인 환경을 선택해주세요.",
    options: GUIDE_OS,
    visible: () => true,
    disabledReason: (a, value) => {
      if (a.type === "app" && APPLE_APP_PLATFORMS.includes(a.appPlatform) && value !== "mac") {
        return "Apple 플랫폼(iOS·iPadOS·macOS) 앱은 개발 도구인 Xcode가 macOS에서만 동작해, macOS 환경에서만 만들 수 있어요.";
      }
      return null;
    },
  },
];

export function visibleSteps(answers: GuideAnswers): GuideStep[] {
  return GUIDE_STEPS.filter((s) => s.visible(answers));
}

export function buildSlug(answers: GuideAnswers): string {
  return visibleSteps(answers)
    .map((s) => answers[s.key])
    .join("/");
}

export type GuidePick = { step: GuideStep; option: GuideOption };

export function picksToAnswers(picks: GuidePick[]): GuideAnswers {
  return Object.fromEntries(picks.map((p) => [p.step.key, p.option.value]));
}

// 슬러그 세그먼트를 단계 순서대로 검증/해석. 비활성 조합·세그먼트 수 불일치는 null.
export function resolveSlug(slug: string[]): GuidePick[] | null {
  const answers: GuideAnswers = {};
  const picks: GuidePick[] = [];
  let i = 0;

  for (const step of GUIDE_STEPS) {
    if (!step.visible(answers)) continue;

    const seg = slug[i];
    if (seg === undefined) return null;

    const option = step.options.find((o) => o.value === seg);
    if (!option) return null;
    if (step.disabledReason?.(answers, seg)) return null;

    answers[step.key] = seg;
    picks.push({ step, option });
    i++;
  }

  // 남는 세그먼트가 있으면 잘못된 경로
  if (i !== slug.length) return null;
  return picks;
}
