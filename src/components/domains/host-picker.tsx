"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";

import { connectHost, connectNaru, listMyNaruServers } from "@/lib/domains/actions";
import { CONNECT_NOTE } from "@/lib/domains/naru-edge";
import { isNaruHost, presetOf, targetBoundToSite, type TxtInput } from "@/lib/domains/hosts";
import { naruLinkFor, type NaruServer } from "@/lib/domains/naru";
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
      : { name: presetOf(host)?.txt?.name.replaceAll("{label}", domain.name) ?? "", value: "" },
  );
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const preset = presetOf(host);
  if (!host || !preset || isNaruHost(host)) return null;
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

const SERVER_STATUS: Record<string, string> = { running: "켜져 있음", stopped: "꺼져 있음" };

// 허브가 돌려주는 domain 은 이름만일 수도, 전체 주소일 수도 있어 둘 다 받는다
function fqdnOfServerDomain(d: string): string {
  return d.includes(".") ? d : `${d}.dshs.dev`;
}

// 대곽나루 호스트 — 내 대곽나루 서버를 골라 연결한다. 확인 코드·호스트 설정 없이 "연결"만 누르면 바로 열린다.
// 서버 목록은 허브가 이메일로 주인을 가려 준다(listMyNaruServers). 이미 주소가 붙은 서버는 고를 수 없다(서버 하나에 주소 하나).
export function NaruPanel({
  domain,
  preselectId,
  onDone,
  onCancel,
}: {
  domain: DomainView;
  /** 대곽나루 서버 카드에서 넘어온 서버 id(?naru=) */
  preselectId: string | null;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const fqdn = `${domain.name}.dshs.dev`;
  const [servers, setServers] = useState<NaruServer[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const isMine = (s: NaruServer) => s.domain !== null && fqdnOfServerDomain(s.domain) === fqdn;
  const takenBy = (s: NaruServer) => (s.domain !== null && !isMine(s) ? fqdnOfServerDomain(s.domain) : null);

  useEffect(() => {
    let cancelled = false;
    void listMyNaruServers().then((r) => {
      if (cancelled) return;
      if (!r.ok) {
        setLoadError(r.error);
        return;
      }
      setLoadError("");
      setServers(r.data);
      const pre = r.data.find((s) => s.id === preselectId);
      if (pre && pre.ready !== false && !(pre.domain !== null && fqdnOfServerDomain(pre.domain) !== fqdn)) setSelected(pre.id);
    });
    return () => {
      cancelled = true;
    };
  }, [preselectId, fqdn, reload]);

  const submit = () =>
    start(async () => {
      if (!selected) return;
      setError("");
      const r = await connectNaru(domain.id, selected);
      if (!r.ok) return setError(r.error);
      onDone();
      router.refresh();
    });

  if (loadError) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {loadError}
        </p>
        <div>
          <button
            type="button"
            onClick={() => {
              setLoadError("");
              setReload((n) => n + 1);
            }}
            className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            다시 불러오기
          </button>
        </div>
      </div>
    );
  }

  if (servers === null) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />내 대곽나루 서버를 불러오는 중…
      </p>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">대곽나루에서 서버를 먼저 받아요</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">서버를 받은 뒤 다시 와서 이 이름을 연결해요. 이름은 그동안 잡아 둬요.</p>
        <a
          href={naruLinkFor(preselectId ?? "")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
        >
          대곽나루 서버 탭 열기
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (selected) submit();
      }}
      className="flex flex-col gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          <span className="font-mono">{fqdn}</span>을 붙일 서버
        </legend>
        {servers.map((s) => {
          const taken = takenBy(s);
          const mine = isMine(s);
          const notReady = s.ready === false; // 서버 PC 에 터널 id 가 없어 아직 주소를 붙일 수 없다
          return (
            <label
              key={s.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-sm dark:bg-zinc-900",
                selected === s.id ? "border-teal-700 dark:border-teal-400" : "border-zinc-200 dark:border-zinc-800",
                taken || notReady ? "opacity-60" : "cursor-pointer",
              )}
            >
              <input
                type="radio"
                name={`naru-server-${domain.id}`}
                value={s.id}
                checked={selected === s.id}
                disabled={taken !== null || notReady || pending}
                onChange={() => setSelected(s.id)}
                className="h-4 w-4 accent-teal-700"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-zinc-900 dark:text-zinc-100">{s.name || s.id}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {SERVER_STATUS[s.status] ?? s.status}
                  {taken && <> · 이미 <span className="font-mono">{taken}</span> 연결됨</>}
                  {mine && " · 지금 이 주소가 연결돼 있어요"}
                  {notReady && " · 이 서버는 아직 주소를 붙일 수 없어요"}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{CONNECT_NOTE}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || !selected}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-50",
            SECTION_COLORS.domains.button,
          )}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          연결
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={pending} className="text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400">
            바꾸지 않을게요
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
