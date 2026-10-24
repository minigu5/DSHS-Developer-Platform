// 가이드 조각(src/content/guides/<key>.md)을 TS 모듈 하나로 묶는다.
// Cloudflare Workers에는 파일 시스템이 없어서 운영 빌드는 이 모듈로 조각을 읽는다.
// npm install·dev·build 전에 자동 실행된다(package.json postinstall·predev·prebuild).

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(process.cwd(), "src", "content", "guides");
const OUT = path.join(DIR, "fragments.generated.ts");

const files = (await readdir(DIR)).filter((f) => f.endsWith(".md") && f !== "README.md").sort();
const entries = await Promise.all(
  files.map(async (f) => [f.slice(0, -3), await readFile(path.join(DIR, f), "utf-8")]),
);

const body = entries.map(([key, md]) => `  ${JSON.stringify(key)}: ${JSON.stringify(md)},`).join("\n");
await writeFile(
  OUT,
  `// 자동 생성 파일 — 고치지 말 것. scripts/gen-guide-fragments.mjs 가 만든다.\n\nexport const GUIDE_FRAGMENTS: Record<string, string> = {\n${body}\n};\n`,
);
console.log(`[guides] ${entries.length}개 조각 → ${path.relative(process.cwd(), OUT)}`);
