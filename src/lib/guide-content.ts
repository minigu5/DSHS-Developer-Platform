// 선택된 조합 → 마크다운 가이드 파일 매칭 (server 전용: fs 사용).
// 부분 매칭 + 폴백: 가장 구체적인 파일부터 찾고, 없으면 점점 일반적인 파일로,
// 그래도 없으면 default.md 로 떨어진다.
//
// 파일은 src/content/guides/*.md 에 두고, 차원 값을 '--' 로 이어 이름 짓는다.
//   예) website--claude-code--mac.md  (type+ai+os)
//       claude-code--mac.md           (ai+os)
//       website.md                    (type)
//       default.md                    (최종 폴백)
// 각 파일 안에서는 '---' 한 줄로 단계를 구분한다.

import { promises as fs } from "fs";
import path from "path";

import type { GuideAnswers } from "@/lib/guide";

const GUIDES_DIR = path.join(process.cwd(), "src", "content", "guides");

function join(values: (string | undefined)[]): string | null {
  const present = values.filter((v): v is string => Boolean(v));
  return present.length ? present.join("--") : null;
}

// 구체적 → 일반적 순서의 후보 파일명(확장자 제외).
function candidateNames(a: GuideAnswers): string[] {
  const { type, appPlatform, terminal, ai, androidGeminiTool, os } = a;
  const raw = [
    // level 1: 가장 구체적 (androidGeminiTool 포함)
    join([type, appPlatform, terminal, ai, androidGeminiTool, os]),
    // level 2: terminal 제외. 앱 타입(appPlatform 있음)에서만 활성화.
    //          비앱에서 활성화하면 extension--claude-code--windows 등이
    //          gui--claude-code보다 먼저 매칭되어 GUI 사용자에게 터미널 가이드가 노출됨
    appPlatform ? join([type, appPlatform, ai, androidGeminiTool, os]) : null,
    // level 2b: OS 없는 androidGeminiTool 합본 파일 폴백 (macOS·Windows 공용 파일)
    appPlatform ? join([type, appPlatform, ai, androidGeminiTool]) : null,
    // level 3: androidGeminiTool 없는 앱 타입 폴백 (appPlatform 필수)
    appPlatform ? join([type, appPlatform, ai, os]) : null,
    // level 3b: OS 없는 앱+플랫폼+AI 합본 파일 폴백 (macOS·Windows 공용 파일)
    appPlatform ? join([type, appPlatform, ai]) : null,
    // level 4-5: GUI/터미널 선택 우선 (타입 특화 가이드보다 앞)
    join([terminal, ai, os]),
    join([terminal, ai]),
    // level 6-9: 일반적 폴백
    join([type, ai, os]),
    join([ai, os]),
    join([type, ai]),
    join([ai]),
    join([type]),
    "default",
  ];
  return [...new Set(raw.filter((v): v is string => Boolean(v)))];
}

export type GuideNextStep = {
  /** 버튼 라벨 */
  label: string;
  /** 버튼 링크 (내부 경로 또는 외부 URL) */
  href: string;
  /** 카드 설명 문구 */
  description: string;
};

export type GuideContent = {
  /** 실제로 매칭된 파일명(확장자 제외). default 면 전용 콘텐츠 없음 */
  matched: string;
  /** '---' 로 분리된 단계별 마크다운 */
  steps: string[];
  /** 마지막에 보여줄 "다음으로 해볼 것" 섹션 제목 (없으면 기본값) */
  nextTitle: string | null;
  /** '===' 뒤 섹션에서 파싱한 다음 단계 카드들 */
  nextSteps: GuideNextStep[];
};

function splitSteps(md: string): string[] {
  return md
    .split(/^\s*---\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean);
}

// '===' (등호 3개 이상) 한 줄을 기준으로 [본문 단계, 다음단계 섹션] 으로 분리.
function splitNextSection(md: string): { body: string; next: string | null } {
  const parts = md.split(/^\s*={3,}\s*$/m);
  if (parts.length < 2) return { body: md, next: null };
  return { body: parts[0], next: parts.slice(1).join("\n").trim() };
}

// 다음단계 섹션 파싱: 선택적 '# 제목' + '- [라벨](href) — 설명' 목록.
const NEXT_ITEM_RE = /^\s*[-*]\s*\[([^\]]+)\]\(([^)]+)\)\s*(?:[—–\-:]\s*(.*))?$/;

function parseNextSection(section: string): { title: string | null; steps: GuideNextStep[] } {
  let title: string | null = null;
  const steps: GuideNextStep[] = [];

  for (const line of section.split("\n")) {
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (heading && !title) {
      title = heading[1].trim();
      continue;
    }
    const m = line.match(NEXT_ITEM_RE);
    if (m) {
      steps.push({
        label: m[1].trim(),
        href: m[2].trim(),
        description: (m[3] ?? "").trim(),
      });
    }
  }
  return { title, steps };
}

export async function loadGuide(a: GuideAnswers): Promise<GuideContent | null> {
  for (const name of candidateNames(a)) {
    try {
      const file = path.join(GUIDES_DIR, `${name}.md`);
      const md = await fs.readFile(file, "utf-8");
      const { body, next } = splitNextSection(md);
      const steps = splitSteps(body);
      if (!steps.length) continue;

      const parsed = next ? parseNextSection(next) : { title: null, steps: [] };
      return {
        matched: name,
        steps,
        nextTitle: parsed.title,
        nextSteps: parsed.steps,
      };
    } catch {
      // 해당 후보 파일 없음 → 다음 후보로
    }
  }
  return null;
}
