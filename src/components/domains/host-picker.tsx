"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";

import { connectHost } from "@/lib/domains/actions";
import { HOST_PRESETS, targetBoundToSite, type TxtInput } from "@/lib/domains/hosts";
import type { DomainView } from "@/lib/domains/read";
import { SECTION_COLORS } from "@/lib/section-colors";
import { cn } from "@/lib/utils";

const INPUT =
  "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

// ③ 호스트에 연결하기 — 호스트는 ②에서 확인한 사이트로 정해진다. 그 호스트의 안내 + CNAME(필요하면 TXT) 입력.
// CNAME 값이 곧 사이트 주소인 호스트(Netlify·GitHub Pages 등)는 확인한 주소로 정해져 있어 고칠 수 없다.
// 바로가기 호스트(Workers·Firebase)는 입력 없이 "바로가기 만들기"만 — 보낼 곳은 확인한 사이트다.
export function HostPicker({ domain, onDone }: { domain: DomainView; onDone: () => void }) {
  const router = useRouter();
  const host = domain.siteHost;
  const siteHostname = domain.siteUrl ? new URL(domain.siteUrl).hostname : "";
  const bound = host !== null && targetBoundToSite(host);
  const [target, setTarget] = useState(bound ? siteHostname : domain.host === host ? (domain.target ?? "") : "");
  const fqdn = `${domain.name}.dshs.dev`;
  // 호스트가 정해 둔 TXT 이름은 미리 채워 둔다 — 학생은 값만 붙여 넣으면 된다
  const [txt, setTxt] = useState<TxtInput>(
    domain.host === host && domain.txt[0]
      ? domain.txt[0]
      : { name: host ? (HOST_PRESETS[host].txt?.name.replaceAll("{label}", domain.name) ?? "") : "", value: "" },
  );
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (!host) return null;
  const preset = HOST_PRESETS[host];
  const redirect = preset.mode === "redirect";

  const submit = () =>
    start(async () => {
      setError("");
      const r = await connectHost(domain.id, host, redirect ? siteHostname : target, !redirect && txt.value.trim() ? [txt] : []);
      if (!r.ok) return setError(r.error);
      onDone();
      router.refresh();
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
    >
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{preset.label}</p>
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

      {redirect ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          보낼 곳: <span className="font-mono">{siteHostname}</span> · 들어오면 주소창이 이 주소로 바뀌어요. 진짜 내 도메인 연결이 아니라 바로가기예요.
        </p>
      ) : (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">CNAME 값</span>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={preset.targetPlaceholder}
            autoComplete="off"
            spellCheck={false}
            readOnly={bound}
            className={cn(INPUT, bound && "text-zinc-500 dark:text-zinc-400")}
            required
          />
          {bound && <span className="text-xs text-zinc-500 dark:text-zinc-400">②에서 확인한 사이트 주소라 바꿀 수 없어요.</span>}
        </label>
      )}

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
          disabled={pending || (!redirect && !target.trim()) || (Boolean(preset.txt?.required) && !txt.value.trim())}
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
  );
}
