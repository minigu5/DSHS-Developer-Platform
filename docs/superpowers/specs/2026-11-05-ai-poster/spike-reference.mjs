// 버리는 실험: 같은 프로젝트 정보로 AI별 HTML 포스터 1차 + "다시 부탁" 2차를 만들어 PNG로 나란히 비교.
// node spike.mjs <outDir> <provider:model> ...   예) wa:@cf/zai-org/glm-5.3  gemini:gemini-2.5-flash
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '..');
const ACCOUNT = '370e521d89a70d895de8448a36449b93';
const out = process.argv[2];
const targets = process.argv.slice(3);
fs.mkdirSync(out, { recursive: true });

const project = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.json'), 'utf8'))[0];
const summary = project.description.replace(/\[[^\]]*\]\([^)]*\)/g, '').replace(/[#>*`|-]/g, ' ').replace(/\s+/g, ' ').slice(0, 1400);

const SYSTEM = `너는 감각 있는 포스터 디자이너다. 학생이 만든 프로그램을 학교에 붙일 A4 세로 홍보 포스터를 HTML로 만든다.
출력은 \`\`\`html 코드 블록 하나만. 설명 문장 없이.
규칙:
- 캔버스는 정확히 가로 1240px × 세로 1518px. html, body { margin:0 } 이고 포스터 요소는 width:1240px; height:1518px; overflow:hidden. 이 아래에 플랫폼 띠(QR 포함)가 자동으로 붙으니 QR·띠·사이트 주소는 넣지 말 것.
- 외부 리소스는 Google Fonts만 허용(Noto Sans KR, Black Han Sans, Jua, Do Hyeon, Gowun Dodum, IBM Plex Sans KR 중에서). <script> 금지. 그림은 외부 이미지 대신 인라인 SVG로 직접 그린다.
- 글은 헤드라인 한 줄(두 줄까지)과 서비스 이름만. 기능 나열·설명 문단 금지.
- 그림 하나를 크게: 서비스 이름의 뜻이나 가장 큰 장점을 은유로 보여 주는 장면. 뻔한 컴퓨터 사진 흉내는 피한다.
- 크림·베이지·금색·어두운 바탕 금지. 포스트잇·손글씨 화살표·이모지 금지. 밝은 바탕에 2~3가지 색.
- 사실만 쓴다. 주어진 정보에 없는 숫자·기능을 지어내지 않는다.`;

const USER1 = `프로젝트 정보
- 이름: ${project.title}
- 종류: ${project.types.join(', ')}
- 소개(요약): ${summary}`;

const USER2 = `좋아. 헤드라인을 더 크게 하고, 포인트 색을 하나 더 넣어 줘(초록 계열). 나머지는 그대로 두고 전체 HTML을 다시 줘.`;

function token() {
  const t = fs.readFileSync(process.env.HOME + '/Library/Preferences/.wrangler/config/default.toml', 'utf8');
  return t.match(/^oauth_token\s*=\s*"(.*)"/m)[1];
}

async function callWorkersAI(model, messages) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, max_tokens: 9000 }),
  });
  const j = await r.json();
  if (!j.success) throw new Error(JSON.stringify(j.errors).slice(0, 400));
  const res = j.result;
  const text = res.response ?? res.choices?.[0]?.message?.content ?? JSON.stringify(res).slice(0, 2000);
  return { text, usage: res.usage };
}

async function callGemini(model, messages) {
  const key = fs.readFileSync(path.join(ROOT, '..', 'gemini.key'), 'utf8').trim();
  const contents = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents, generationConfig: { maxOutputTokens: 16000 } }),
  });
  const j = await r.json();
  if (j.error) throw new Error(JSON.stringify(j.error).slice(0, 400));
  return { text: j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ?? '', usage: j.usageMetadata };
}

function extractHtml(text) {
  const fence = text.match(/```html\s*([\s\S]*?)```/i);
  if (fence) return fence[1];
  const doc = text.match(/<!doctype[\s\S]*<\/html>/i) || text.match(/<html[\s\S]*<\/html>/i);
  return doc ? doc[0] : text;
}

const band = (name) => `<footer class="dshs-band" data-tone="light">
  <img class="dshs-band__logo" src="dshs-logo.svg" alt="">
  <div class="dshs-band__text"><p class="dshs-band__lead">대곽 개발자 플랫폼에서 만나요</p>
  <p class="dshs-band__sub"><b>DSHS Developer Platform</b> · 학생이 만든 프로그램을 한곳에서</p></div>
  <div class="dshs-band__go"><p class="dshs-band__url">dshs.dev</p><p class="dshs-band__hint">‘${name}’ 검색 또는 QR</p></div>
  <img class="dshs-band__qr" src="qr.svg" alt=""></footer>`;

// 실제 서비스처럼: AI HTML은 격리된 iframe(sandbox, 스크립트 없음) 안에만, 띠는 바깥에서 붙인다
function compose(html) {
  const esc = html.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@600&family=IBM+Plex+Sans+KR:wght@500;600;700&display=block" rel="stylesheet">
<link rel="stylesheet" href="dshs-band.css">
<style>body{margin:0} #page{width:1240px;height:1754px;display:flex;flex-direction:column;overflow:hidden;background:#fff} iframe{width:1240px;height:1518px;border:0;display:block;flex:none}</style>
</head><body><div id="page"><iframe sandbox="" srcdoc="${esc}"></iframe>${band(project.title)}</div></body></html>`;
}

async function run(target) {
  const [provider, ...rest] = target.split(':');
  const model = rest.join(':');
  const call = provider === 'gemini' ? callGemini : callWorkersAI;
  const slug = model.replace(/[^a-z0-9.-]+/gi, '_');
  const log = [];
  const t0 = Date.now();
  const msgs = [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER1 }];
  const r1 = await call(model, msgs);
  log.push(`1차 ${((Date.now() - t0) / 1000).toFixed(0)}s usage=${JSON.stringify(r1.usage)}`);
  const h1 = extractHtml(r1.text);
  fs.writeFileSync(path.join(out, `${slug}-1.html`), h1);
  const t1 = Date.now();
  const r2 = await call(model, [...msgs, { role: 'assistant', content: r1.text }, { role: 'user', content: USER2 }]);
  log.push(`2차 ${((Date.now() - t1) / 1000).toFixed(0)}s usage=${JSON.stringify(r2.usage)}`);
  const h2 = extractHtml(r2.text);
  fs.writeFileSync(path.join(out, `${slug}-2.html`), h2);
  fs.writeFileSync(path.join(out, `${slug}.log`), log.join('\n'));
  return { slug, h1, h2, log };
}

const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const results = await Promise.allSettled(targets.map(run));
const browser = await chromium.launch({ executablePath: exe });
for (const [i, r] of results.entries()) {
  if (r.status === 'rejected') { console.log(targets[i], 'FAILED', String(r.reason).slice(0, 300)); continue; }
  const { slug, h1, h2, log } = r.value;
  for (const [n, h] of [[1, h1], [2, h2]]) {
    const page = path.join(ROOT, `_spike-${slug}-${n}.html`);
    fs.writeFileSync(page, compose(h));
    const p = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1 });
    await p.goto('file://' + page, { waitUntil: 'networkidle' });
    await p.waitForTimeout(2500);
    await p.screenshot({ path: path.join(out, `${slug}-${n}.png`) });
    await p.close();
  }
  console.log(targets[i], 'OK', log.join(' | '));
}
await browser.close();
