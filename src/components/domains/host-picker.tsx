"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";

import { connectHost } from "@/lib/domains/actions";
import { detectHost, HOST_PRESETS, type HostKey, type TxtInput } from "@/lib/domains/hosts";
import type { DomainView } from "@/lib/domains/read";
import { SECTION_COLORS } from "@/lib/section-colors";
import { cn } from "@/lib/utils";

const HOST_ORDER: HostKey[] = [
  "vercel",
  "netlify",
  "cloudflare-pages",
  "github-pages",
  "gitlab-pages",
  "render",
  "railway",
  "cloudflare-workers",
  "firebase",
];
const INPUT =
  "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

// ② 어디에 올렸어요? — 호스트 카드 + 그 호스트의 안내 + CNAME(필요하면 TXT) 입력.
// 바로가기 호스트(Workers·Firebase)는 보낼 곳 주소 한 칸만 — 호스트 쪽 설정이 없다.
export function HostPicker({ domain, projectUrl, onDone }: { domain: DomainView; projectUrl: string; onDone: () => void }) {
  const router = useRouter();
  const detected = detectHost(projectUrl);
  const [host, setHost] = useState<HostKey | null>(domain.host ?? detected?.host ?? null);
  const [target, setTarget] = useState(domain.target ?? detected?.prefill ?? "");
  const fqdn = `${domain.name}.dshs.dev`;
  // 호스트가 정해 둔 TXT 이름은 미리 채워 둔다 — 학생은 값만 붙여 넣으면 된다
  const emptyTxt = (key: HostKey | null): TxtInput => ({
    name: key ? (HOST_PRESETS[key].txt?.name.replaceAll("{label}", domain.name) ?? "") : "",
    value: "",
  });
  const [txt, setTxt] = useState<TxtInput>(domain.txt[0] ?? emptyTxt(host));
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const preset = host ? HOST_PRESETS[host] : null;
  const redirect = preset?.mode === "redirect";

  const pick = (key: HostKey) => {
    setHost(key);
    setError("");
    // 사이트 주소가 곧 CNAME 값인 호스트는 프로젝트 주소로 채워 둔다
    const d = detectHost(projectUrl);
    setTarget(d?.host === key && d.prefill ? d.prefill : domain.host === key ? (domain.target ?? "") : "");
    setTxt(domain.host === key && domain.txt[0] ? domain.txt[0] : emptyTxt(key));
  };

  const submit = () =>
    start(async () => {
      if (!host) return;
      setError("");
      const r = await connectHost(domain.id, host, target, !redirect && txt.value.trim() ? [txt] : []);
      if (!r.ok) return setError(r.error);
      onDone();
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="호스트 고르기" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {HOST_ORDER.map((key) => {
          const selected = host === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              onClick={() => pick(key)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition-colors",
                selected
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
              )}
            >
              {HOST_PRESETS[key].label}
              {detected?.host === key && <span className="mt-0.5 block text-[11px] font-normal opacity-75">자동으로 골랐어요</span>}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">다른 곳에 올렸다면 아직 지원하지 않아요. 위 아홉 곳 중 하나로 올려 주세요.</p>

      {preset && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
        >
          <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
            {preset.steps.map((s) => (
              <li key={s}>{s.replaceAll("{fqdn}", fqdn)}</li>
            ))}
          </ol>
          {!redirect && (
            <a
              href={preset.settingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 text-sm font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
            >
              {preset.label} 설정 열기
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{redirect ? "보낼 곳 주소" : "CNAME 값"}</span>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={preset.targetPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className={INPUT}
              required
            />
            {redirect && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                들어오면 주소창이 보낼 곳 주소로 바뀌어요. 진짜 내 도메인 연결이 아니라 바로가기예요.
              </span>
            )}
          </label>

          {!redirect &&
            preset.txt &&
            (() => {
              const fields = (
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">이름(Name)</span>
                    <input
                      value={txt.name}
                      onChange={(e) => setTxt({ ...txt, name: e.target.value })}
                      placeholder={preset.txt.name.replaceAll("{label}", domain.name)}
                      autoComplete="off"
                      spellCheck={false}
                      className={INPUT}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">값(Value)</span>
                    <input
                      value={txt.value}
                      onChange={(e) => setTxt({ ...txt, value: e.target.value })}
                      placeholder={preset.txt.valuePlaceholder.replaceAll("{fqdn}", fqdn)}
                      autoComplete="off"
                      spellCheck={false}
                      className={INPUT}
                      required={preset.txt.required}
                    />
                  </label>
                </div>
              );
              return preset.txt.required ? (
                <fieldset className="flex flex-col gap-1.5 text-sm">
                  <legend className="mb-1.5 font-medium text-zinc-800 dark:text-zinc-200">TXT 확인값</legend>
                  {fields}
                </fieldset>
              ) : (
                <details className="text-sm" open={Boolean(domain.txt.length)}>
                  <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400">TXT 확인값을 달라고 하면 (선택)</summary>
                  <div className="mt-2">{fields}</div>
                </details>
              );
            })()}

          <div>
            <button
              type="submit"
              disabled={pending || !target.trim() || (Boolean(preset.txt?.required) && !txt.value.trim())}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-50",
                SECTION_COLORS.domains.button,
              )}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {redirect ? "바로가기 만들기" : "연결하기"}
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
