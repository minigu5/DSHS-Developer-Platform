// 바이브 코딩 가이드의 질문 정의 + 슬러그 변환 + 답 → 장(조각) 매핑.
// 클라이언트(위저드·뷰어)와 서버(결과 페이지·로더)가 같은 규칙을 쓰도록 한곳에 둔다.
// 질문은 이전 답에 따라 보이거나 숨고, 일부 옵션은 이유와 함께 잠긴다.

import {
  GUIDE_PROGRAM_TYPES,
  GUIDE_APP_PLATFORMS,
  GUIDE_DATA,
  GUIDE_AI_TOOLS,
  GUIDE_OS,
  type GuideAgentAi,
} from "@/lib/constants";

export type GuideAnswers = Record<string, string>;
export type GuideOption = {
  value: string;
  label: string;
  desc?: string;
  /** 결과·위저드 칩에 쓰는 짧은 이름(답만 봐도 뜻이 통하게). 빈 문자열이면 칩을 숨긴다 */
  chip?: string;
};

/** 칩 라벨: chip 이 있으면 그것, 없으면 label. 빈 문자열이면 null(숨김) */
export function chipLabel(o: GuideOption): string | null {
  const c = o.chip ?? o.label;
  return c ? c : null;
}

export type GuideStep = {
  key: string;
  /** 위저드 질문 */
  title: string;
  description: string;
  options: readonly GuideOption[];
  /** 지금까지의 답을 보고 이 질문을 보여 줄지 */
  visible: (answers: GuideAnswers) => boolean;
  /** 옵션이 잠겨야 하면 그 이유를, 아니면 null */
  disabledReason?: (answers: GuideAnswers, value: string) => string | null;
};

export const GUIDE_STEPS: GuideStep[] = [
  {
    key: "type",
    title: "뭘 만들고 싶어요?",
    description: "딱 맞지 않아도 괜찮아요. 가장 가까운 걸 골라 주세요.",
    options: GUIDE_PROGRAM_TYPES,
    visible: () => true,
  },
  {
    key: "platform",
    title: "어디서 돌아가는 앱이에요?",
    description: "여러 개라면 가장 먼저 만들 것 하나만 골라 주세요.",
    options: GUIDE_APP_PLATFORMS,
    visible: (a) => a.type === "app",
  },
  {
    key: "data",
    title: "로그인하거나 뭔가를 저장하나요?",
    description: "회원가입, 게시판, 기록 저장처럼 사람마다 데이터가 남는 기능이요.",
    options: GUIDE_DATA,
    visible: (a) => a.type === "website",
  },
  {
    key: "ai",
    title: "어떤 AI로 만들 거예요?",
    description: "이미 돈 내고 쓰는 게 있다면 그걸로 하는 게 제일 편해요.",
    options: GUIDE_AI_TOOLS,
    visible: () => true,
  },
  {
    key: "os",
    title: "어떤 컴퓨터로 만들어요?",
    description: "학교 컴퓨터 말고, 계속 쓸 내 컴퓨터 기준으로요.",
    options: GUIDE_OS,
    visible: () => true,
    disabledReason: (a, value) => {
      if (a.type !== "app") return null;
      if ((a.platform === "apple" || a.platform === "mac") && value === "windows") {
        return "iPhone·iPad·Mac 앱은 Apple의 개발 도구 Xcode가 Mac에서만 돌아가서, Mac이 있어야 만들 수 있어요.";
      }
      if (a.platform === "windows" && value === "mac") {
        return "Windows 앱은 Windows에서 실행해 보면서 만들어야 해서, Windows 컴퓨터가 있어야 해요.";
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

/** 보이는 질문 중 하나라도 잠긴 옵션을 골랐으면 true */
export function isBlocked(answers: GuideAnswers): boolean {
  return visibleSteps(answers).some(
    (s) => s.key in answers && Boolean(s.disabledReason?.(answers, answers[s.key])),
  );
}

export type GuidePick = { step: GuideStep; option: GuideOption };

export function picksToAnswers(picks: GuidePick[]): GuideAnswers {
  return Object.fromEntries(picks.map((p) => [p.step.key, p.option.value]));
}

// 슬러그 세그먼트를 질문 순서대로 검증·해석. 잠긴 조합·세그먼트 수 불일치는 null.
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

// 지금 답에서 key 하나만 바꾼 가이드 주소. 바꾼 뒤 새로 보이는 질문에 답이 없거나
// 잠긴 조합이 되면 null.
export function swapAnswer(answers: GuideAnswers, key: string, value: string): string | null {
  const next: GuideAnswers = { ...answers, [key]: value };
  const steps = visibleSteps(next);
  const visibleKeys = new Set(steps.map((s) => s.key));
  for (const k of Object.keys(next)) if (!visibleKeys.has(k)) delete next[k];
  if (steps.some((s) => !(s.key in next))) return null;
  if (isBlocked(next)) return null;
  if (!resolveSlug(buildSlug(next).split("/"))) return null;
  return `/guide/${buildSlug(next)}`;
}

// 막히지 않은 모든 완성 조합. 조각 역색인("이 조각을 쓰는 가이드")과 파일 검사에 쓴다.
export function allGuideAnswers(): GuideAnswers[] {
  const out: GuideAnswers[] = [];
  const walk = (answers: GuideAnswers) => {
    const step = visibleSteps(answers).find((s) => !(s.key in answers));
    if (!step) {
      out.push(answers);
      return;
    }
    for (const o of step.options) {
      if (step.disabledReason?.(answers, o.value)) continue;
      walk({ ...answers, [step.key]: o.value });
    }
  };
  walk({});
  return out;
}

// ── 결과: 장 4개 = 조각 4개 ──

export const GUIDE_CHAPTERS = [
  { no: 1, name: "AI를 에이전트로 쓰기" },
  { no: 2, name: "만들고 돌려 보기" },
  { no: 3, name: "인터넷에 올리기" },
  { no: 4, name: "이 사이트에 등록하기" },
] as const;

/** 조각 key → 편집·기록 화면 등에 쓰는 표시 이름 */
export const FRAGMENT_TITLES: Record<string, string> = {
  "agent-claude": "1장 · Claude로 에이전트 쓰기",
  "agent-chatgpt": "1장 · ChatGPT(Codex)로 에이전트 쓰기",
  "agent-gemini": "1장 · Gemini(Antigravity)로 에이전트 쓰기",
  "build-website": "2장 · 웹사이트 만들고 돌려 보기",
  "build-extension": "2장 · 확장프로그램 만들고 돌려 보기",
  "build-tool": "2장 · 도구 만들고 돌려 보기",
  "build-app-android": "2장 · Android 앱 만들고 돌려 보기",
  "build-app-apple": "2장 · iPhone·iPad 앱 만들고 돌려 보기",
  "build-app-mac": "2장 · Mac 앱 만들고 돌려 보기",
  "build-app-windows": "2장 · Windows 앱 만들고 돌려 보기",
  "ship-website": "3장 · 웹사이트 올리기",
  "ship-website-data": "3장 · 로그인·저장 있는 웹사이트 올리기",
  "ship-extension": "3장 · 확장프로그램 나눠 주기",
  "ship-app-android": "3장 · Android 앱 나눠 주기",
  "ship-app-apple": "3장 · iPhone·iPad 앱 나눠 주기",
  "ship-app-desktop": "3장 · Mac·Windows 앱 나눠 주기",
  "ship-tool": "3장 · 도구 공개하기",
  register: "4장 · 이 사이트에 등록하기",
};

export type GuideChapterPlan = { no: number; name: string; key: string; title: string };

export type GuidePlan = {
  /** 결과 페이지 제목 */
  title: string;
  /** 1장에 쓸 AI. ai=none 이면 추천 도구 */
  aiKey: GuideAgentAi;
  /** ai=none 이라 aiKey 를 대신 골랐는지 */
  recommended: boolean;
  chapters: GuideChapterPlan[];
};

const APP_TITLES: Record<string, string> = {
  android: "Android 앱 만들어서 친구에게 주기",
  apple: "iPhone·iPad 앱 만들어서 친구에게 주기",
  mac: "Mac 앱 만들어서 나눠 주기",
  windows: "Windows 앱 만들어서 나눠 주기",
};

const TYPE_TITLES: Record<string, string> = {
  website: "웹사이트 만들어서 올리기",
  extension: "확장프로그램 만들어서 나눠 주기",
  tool: "도구 만들어서 공개하기",
};

function shipKey(a: GuideAnswers): string {
  if (a.type === "website") return a.data === "yes" ? "ship-website-data" : "ship-website";
  if (a.type === "app") return a.platform === "mac" || a.platform === "windows" ? "ship-app-desktop" : `ship-app-${a.platform}`;
  return `ship-${a.type}`;
}

export function planGuide(a: GuideAnswers): GuidePlan {
  const recommended = a.ai === "none";
  const aiKey: GuideAgentAi = recommended ? "chatgpt" : (a.ai as GuideAgentAi);
  const keys = [
    `agent-${aiKey}`,
    a.type === "app" ? `build-app-${a.platform}` : `build-${a.type}`,
    shipKey(a),
    "register",
  ];
  return {
    title: (a.type === "app" ? APP_TITLES[a.platform] : TYPE_TITLES[a.type]) ?? "가이드",
    aiKey,
    recommended,
    chapters: GUIDE_CHAPTERS.map((c, i) => ({
      no: c.no,
      name: c.name,
      key: keys[i],
      title: FRAGMENT_TITLES[keys[i]] ?? keys[i],
    })),
  };
}
