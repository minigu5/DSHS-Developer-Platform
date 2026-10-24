// 가이드 조각 마크다운의 단계 구분·상자 표기 해석 (순수 TS — React·fs 없음).
// 뷰어와 위키 편집기 미리보기가 같은 규칙을 쓰도록 분리했다.
//
// 표기 (인용문 첫 줄에 [!종류]):
//   > [!say]            AI에게 보낼 문장 상자 (복사 버튼)
//   > [!ok] 라벨         됐다는 신호
//   > [!warn] 라벨       주의
//   > [!more] 요약       접힘 블록
//   > [!only os=mac]    조건이 맞을 때만 보임
//   > [!next] 문구       (그리지 않음) 다음 버튼 문구
//   > [!route] 칸        (그리지 않음) 3장 경로 표시줄의 지금 칸
//   [글](guide:ai=chatgpt)  답 하나만 바꾼 가이드 주소로 바뀌는 링크

import { GUIDE_STEPS, swapAnswer, type GuideAnswers } from "@/lib/guide";

export type CalloutKind = "say" | "ok" | "warn" | "more" | "only";
export type StepSegment =
  | { kind: "md"; text: string }
  | { kind: CalloutKind; label: string; text: string };

const CALLOUT_KINDS = new Set<string>(["say", "ok", "warn", "more", "only"]);
const META_KINDS = new Set<string>(["next", "route"]);
// [!종류] 뒤 글자 또는 [!only os=mac]처럼 괄호 안 글자가 라벨
const MARKER_RE = /^>\s?\[!([a-z]+)(?:\s+([^\]]*))?\]\s*(.*)$/;
const markerLabel = (m: RegExpMatchArray) => (m[2] ?? m[3] ?? "").trim();
const FENCE_RE = /^\s*(```|~~~)/;
const HEADING_RE = /^#{1,2}\s+(.+?)\s*#*\s*$/;

/** 줄 단위로 자른다. Windows 줄바꿈(CRLF)·폼 저장 텍스트도 같은 결과가 되게 정규화 */
function toLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n");
}

function isKnownMarker(line: string): RegExpMatchArray | null {
  const m = line.match(MARKER_RE);
  if (!m) return null;
  return CALLOUT_KINDS.has(m[1]) || META_KINDS.has(m[1]) ? m : null;
}

/** 코드 펜스 밖에 있는 줄마다 fn을 부른다. */
function eachOutsideFence(lines: string[], fn: (line: string, i: number) => void) {
  let inFence = false;
  lines.forEach((line, i) => {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      return;
    }
    if (!inFence) fn(line, i);
  });
}

export function parseStepMeta(body: string): { title: string | null; next: string | null; route: string | null } {
  let title: string | null = null;
  let next: string | null = null;
  let route: string | null = null;
  eachOutsideFence(toLines(body), (line) => {
    if (title === null) {
      const h = line.match(HEADING_RE);
      if (h) title = h[1].trim();
    }
    const m = line.match(MARKER_RE);
    if (!m) return;
    const label = markerLabel(m);
    if (!label) return;
    if (m[1] === "next" && next === null) next = label;
    if (m[1] === "route" && route === null) route = label;
  });
  return { title, next, route };
}

/** 첫 # / ## 제목 줄을 뺀 본문 (뷰어가 제목을 따로 그릴 때) */
export function stripTitle(body: string): string {
  const lines = toLines(body);
  let idx = -1;
  eachOutsideFence(lines, (line, i) => {
    if (idx === -1 && HEADING_RE.test(line)) idx = i;
  });
  if (idx === -1) return body.trim();
  return [...lines.slice(0, idx), ...lines.slice(idx + 1)].join("\n").trim();
}

export function splitSegments(body: string): StepSegment[] {
  const lines = toLines(body);
  const out: StepSegment[] = [];
  let md: string[] = [];
  let inFence = false;

  const flushMd = () => {
    const text = md.join("\n").trim();
    if (text) out.push({ kind: "md", text });
    md = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      md.push(line);
      i++;
      continue;
    }
    const m = inFence ? null : isKnownMarker(line);
    if (!m) {
      md.push(line);
      i++;
      continue;
    }

    // 상자: 이어지는 '>' 줄을 모은다(다음 표기 줄을 만나면 끊음)
    const inner: string[] = [];
    i++;
    while (i < lines.length && lines[i].startsWith(">") && !isKnownMarker(lines[i])) {
      inner.push(lines[i].replace(/^>\s?/, ""));
      i++;
    }
    if (META_KINDS.has(m[1])) continue;
    flushMd();
    out.push({ kind: m[1] as CalloutKind, label: markerLabel(m), text: inner.join("\n").trim() });
  }
  flushMd();
  return out;
}

const STEP_KEYS = new Set(GUIDE_STEPS.map((s) => s.key));

// 'os=mac data=no,unsure' — 모든 항이 맞아야 하고, 값의 ','는 '또는'.
// 모르는 key는 통과, answers가 없으면(편집기 미리보기) 통과, 답하지 않은(안 보이는) 질문은 불일치.
export function matchesCondition(label: string, answers: GuideAnswers | undefined): boolean {
  if (!answers) return true;
  return label
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => {
      const [key, values] = term.split("=");
      if (!values || !STEP_KEYS.has(key)) return true;
      const answer = answers[key];
      if (answer === undefined) return false;
      return values.split(",").includes(answer);
    });
}

const GUIDE_LINK_RE = /\[([^\]]+)\]\(guide:([a-zA-Z]+)=([a-z0-9-]+)\)/g;

export function resolveGuideLinks(text: string, answers: GuideAnswers | undefined): string {
  return text.replace(GUIDE_LINK_RE, (_all, label: string, key: string, value: string) => {
    if (!answers) return label;
    const href = swapAnswer(answers, key, value);
    return href ? `[${label}](${href})` : label;
  });
}

/** 조각 파일 → 단계 본문들 ('---' 한 줄 기준, 코드 펜스 안은 제외) */
export function splitFragmentSteps(md: string): string[] {
  const steps: string[][] = [[]];
  let inFence = false;
  for (const line of toLines(md)) {
    if (FENCE_RE.test(line)) inFence = !inFence;
    if (!inFence && /^\s*---\s*$/.test(line)) {
      steps.push([]);
      continue;
    }
    steps[steps.length - 1].push(line);
  }
  return steps.map((s) => s.join("\n").trim()).filter(Boolean);
}

/** 조각 안 [!route] 칸들을 처음 나온 순서대로 */
export function routeOf(steps: string[]): string[] {
  const seen: string[] = [];
  for (const s of steps) {
    const r = parseStepMeta(s).route;
    if (r && !seen.includes(r)) seen.push(r);
  }
  return seen;
}
