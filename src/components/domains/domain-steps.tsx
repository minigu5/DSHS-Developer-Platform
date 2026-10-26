"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  applyProjectUrl,
  checkNameAvailable,
  releaseSubdomain,
  reserveSubdomain,
  setSiteAddress,
} from "@/lib/domains/actions";
import { buildVerifyPrompt } from "@/lib/domains/ai-prompt";
import { HOST_PRESETS, isRedirectHost, siteAddressFor, targetBoundToSite } from "@/lib/domains/hosts";
import { normalizeName } from "@/lib/domains/name";
import type { DomainProjectRow, DomainView } from "@/lib/domains/read";
import { VERIFY_FILE_PATH, VERIFY_META_NAME } from "@/lib/domains/verify";
import { SECTION_COLORS } from "@/lib/section-colors";
import { cn } from "@/lib/utils";

import { HostPicker } from "./host-picker";
import { UrlChangedDialog } from "./url-changed-dialog";
import { AUTO_INTERVAL_MS, AUTO_MAX_ROUNDS, type AutoState, type CheckState } from "./use-domain-checks";

const PRIMARY = cn("inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-50", SECTION_COLORS.domains.button);
const SECONDARY =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 transition-colors hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";

type StepState = "done" | "current" | "todo";

function Step({ n, state, title, children }: { n: number; state: StepState; title: ReactNode; children?: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className={cn(
          "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          state === "done" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
          state === "current" && "bg-teal-700 text-white",
          state === "todo" && "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
        )}
      >
        {state === "done" ? <Check className="h-3.5 w-3.5" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", state === "todo" ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-900 dark:text-zinc-100")}>
          <span className="sr-only">{n}단계{state === "done" ? " (완료)" : state === "current" ? " (지금)" : ""}: </span>
          {title}
        </p>
        {children && <div className="mt-2">{children}</div>}
      </div>
    </li>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
      {children}
    </p>
  );
}

// ① 이름 정하기
function NameStep({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [check, setCheck] = useState<{ name: string; available: boolean; reason?: string } | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const name = normalizeName(raw);

  // 입력이 멈추면(400ms) 쓸 수 있는 이름인지 확인
  useEffect(() => {
    if (!name) return;
    const t = setTimeout(async () => {
      const r = await checkNameAvailable(name);
      if (r.ok) setCheck({ name, ...r.data });
    }, 400);
    return () => clearTimeout(t);
  }, [name]);

  const current = check && check.name === name ? check : null;

  const submit = () =>
    start(async () => {
      setError("");
      const r = await reserveSubdomain(projectId, name);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (current?.available) submit();
      }}
    >
      <label htmlFor={`name-${projectId}`} className="sr-only">
        주소 이름
      </label>
      <div className="flex max-w-md items-center overflow-hidden rounded-xl border border-zinc-300 bg-white focus-within:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950">
        <input
          id={`name-${projectId}`}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="meal"
          autoComplete="off"
          spellCheck={false}
          maxLength={30}
          aria-describedby={`name-hint-${projectId}`}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm outline-none"
        />
        <span className="border-l border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          .dshs.dev
        </span>
      </div>
      <p id={`name-hint-${projectId}`} aria-live="polite" className="mt-1.5 text-xs">
        {!name ? (
          <span className="text-zinc-500 dark:text-zinc-400">영어 소문자·숫자·하이픈(-)으로 3~30자. 먼저 신청한 사람이 가져요.</span>
        ) : !current ? (
          <span className="text-zinc-500 dark:text-zinc-400">확인하는 중…</span>
        ) : current.available ? (
          <span className="text-emerald-700 dark:text-emerald-400">쓸 수 있는 이름이에요.</span>
        ) : (
          <span className="text-red-600 dark:text-red-400">{current.reason}</span>
        )}
      </p>
      <button type="submit" disabled={!current?.available || pending} className={cn(PRIMARY, "mt-3")}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}이 이름으로 할게요
      </button>
      {error && <ErrorText>{error}</ErrorText>}
    </form>
  );
}

function CopyButton({ text, label, idle = "복사", className = SECONDARY }: { text: string; label: string; idle?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("copied");
        } catch {
          setState("failed");
        }
        setTimeout(() => setState("idle"), 2500);
      }}
      className={className}
      aria-label={label}
    >
      {state === "copied" ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {state === "copied" ? "복사했어요" : state === "failed" ? "복사하지 못했어요 — 아래 글을 직접 복사해요" : idle}
    </button>
  );
}

// ② 원래 주소 확인 결과
const SITE_RESULT_TEXT: Record<string, string> = {
  unreachable: "내 사이트가 아직 열리지 않아요. 주소가 맞는지, 배포가 끝났는지 확인해요.",
  not_found_page: "호스트가 이 주소의 사이트를 찾지 못해요. 주소가 맞는지, 배포가 끝났는지 확인해요.",
  no_token: "사이트는 열리는데 확인 코드가 안 보여요. 코드를 넣고 다시 배포해요.",
};
// ③ 연결 뒤 실제 주소 확인 결과
const CONNECT_RESULT_TEXT: Record<string, string> = {
  unreachable: "아직 열리지 않아요. 호스트에 주소를 등록했는지 확인하고, 인증서 발급에 몇 분 걸릴 수 있어요.",
  not_found_page: "호스트가 이 주소의 사이트를 찾지 못해요. 호스트 설정에 주소를 추가했는지 확인해요.",
  no_token: "주소는 열리는데 확인 코드가 안 보여요. ②에서 확인한 사이트에 연결했는지 확인해요.",
};
// 바로가기는 보낼 곳 사이트를 확인한다 — 호스트 쪽 주소 등록이 없다
const REDIRECT_RESULT_TEXT: Record<string, string> = {
  ...CONNECT_RESULT_TEXT,
  unreachable: "보낼 곳 사이트가 아직 열리지 않아요. 배포가 끝났는지 확인해요.",
  not_found_page: "보낼 곳 사이트를 찾지 못해요. 배포가 끝났는지 확인해요.",
};

function CheckControls({ check, auto, onCheck, texts }: { check: CheckState; auto: AutoState; onCheck: () => void; texts: Record<string, string> }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <button type="button" disabled={check.checking} onClick={onCheck} className={PRIMARY}>
          {check.checking && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {check.checking ? "확인하는 중…" : "지금 확인하기"}
        </button>
        {auto === "on" && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">이 화면을 열어 두면 {AUTO_INTERVAL_MS / 1000}초마다 자동으로 확인해요.</p>
        )}
        {auto === "stopped" && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            자동 확인을 멈췄어요({Math.round((AUTO_INTERVAL_MS * AUTO_MAX_ROUNDS) / 60_000)}분). 준비가 끝났다면 확인하기를 눌러요.
          </p>
        )}
      </div>
      <div aria-live="polite">
        {check.result && check.result !== "ok" && (
          <>
            <p className="text-sm text-amber-700 dark:text-amber-400">{texts[check.result]}</p>
            {check.detail && <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">자세한 이유: {check.detail}</p>}
          </>
        )}
        {check.error && <ErrorText>{check.error}</ErrorText>}
      </div>
    </>
  );
}

const INPUT =
  "min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

// ② 내 사이트 원래 주소 + 확인 코드. 확인 전에는 주소를 붙이지 않으므로 이 주소(예: omm.vercel.app)에서 확인한다.
// 결과는 DomainList 의 useDomainChecks 가 쥐고 있다 — 접혀 있어도 자동으로 확인하므로.
function SiteStep({
  domain,
  projectUrl,
  check,
  auto,
  onCheck,
  onSaved,
}: {
  domain: DomainView;
  projectUrl: string;
  check: CheckState;
  auto: AutoState;
  onCheck: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [raw, setRaw] = useState(domain.siteUrl ?? siteAddressFor(projectUrl)?.url ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const parsed = siteAddressFor(raw);
  // 저장된 주소와 같고 아직 확인 전이면 확인 코드 안내를 보여 준다
  const saved = domain.siteUrl !== null && parsed?.url === domain.siteUrl && !domain.siteVerified;

  const save = () =>
    start(async () => {
      setError("");
      const r = await setSiteAddress(domain.id, raw);
      if (!r.ok) return setError(r.error);
      setRaw(r.data.siteUrl);
      onSaved();
      router.refresh();
    });

  const siteUrl = domain.siteUrl ?? "";
  const meta = `<meta name="${VERIFY_META_NAME}" content="${domain.verifyToken}">`;
  const prompt = buildVerifyPrompt({ name: domain.name, token: domain.verifyToken, host: domain.siteHost, siteUrl });

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (parsed && !saved) save();
        }}
        className="flex flex-col gap-1.5"
      >
        <label htmlFor={`site-${domain.id}`} className="text-sm text-zinc-600 dark:text-zinc-400">
          호스트가 처음 준 내 사이트 주소를 넣어요. 이 주소에서 내 사이트가 맞는지 확인해요.
        </label>
        <div className="flex max-w-xl flex-col gap-2 sm:flex-row">
          <input
            id={`site-${domain.id}`}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="https://이름.vercel.app"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`site-hint-${domain.id}`}
            className={INPUT}
          />
          {!saved && (
            <button type="submit" disabled={!parsed || pending} className={PRIMARY}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}이 주소로 확인할게요
            </button>
          )}
        </div>
        <p id={`site-hint-${domain.id}`} aria-live="polite" className="text-xs">
          {!raw.trim() || parsed ? (
            <span className="text-zinc-500 dark:text-zinc-400">
              {parsed ? `${HOST_PRESETS[parsed.host].label} 주소예요.` : "예: 이름.vercel.app · 이름.netlify.app · 아이디.github.io/저장소"}
            </span>
          ) : (
            <span className="text-red-600 dark:text-red-400">
              Vercel·Netlify·Cloudflare·GitHub·GitLab·Render·Railway·Firebase가 준 기본 주소(https://…)만 넣을 수 있어요.
            </span>
          )}
        </p>
        {error && <ErrorText>{error}</ErrorText>}
      </form>

      {saved && (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            아래 글을 AI에게 그대로 보내면 확인 코드를 넣고 다시 배포해 줘요. 배포가 끝나면 이 화면이 알아서 확인해요.
          </p>
          <div>
            <CopyButton text={prompt} label="AI에게 보낼 글 복사" idle="AI에게 보낼 글 복사" className={PRIMARY} />
          </div>
          <details className="text-xs text-zinc-500 dark:text-zinc-400">
            <summary className="cursor-pointer">보낼 글 미리 보기</summary>
            <pre className="mt-1.5 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {prompt}
            </pre>
          </details>
          <details className="text-xs text-zinc-500 dark:text-zinc-400">
            <summary className="cursor-pointer">코드 한 줄만 직접 넣고 싶다면</summary>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-xl bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                {meta}
              </code>
              <CopyButton text={meta} label="확인 코드 복사" />
            </div>
          </details>
          <details className="text-xs text-zinc-500 dark:text-zinc-400">
            <summary className="cursor-pointer">HTML 페이지가 아닌 사이트라면</summary>
            <p className="mt-1.5">
              <code className="font-mono">{VERIFY_FILE_PATH}</code> 파일을 만들고 내용으로{" "}
              <code className="font-mono">{domain.verifyToken}</code> 한 줄만 넣어도 돼요.
            </p>
          </details>
          <CheckControls check={check} auto={auto} onCheck={onCheck} texts={SITE_RESULT_TEXT} />
        </>
      )}
    </div>
  );
}

// ③ 연결 뒤 — 실제 주소가 열리는지(코드는 ②에서 이미 넣었다)
function ConnectStatus({ domain, check, auto, onCheck }: { domain: DomainView; check: CheckState; auto: AutoState; onCheck: () => void }) {
  const redirect = isRedirectHost(domain.host);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {redirect
          ? "바로가기를 만들었어요. 내 사이트에서 확인 코드가 보이면 연결됨으로 바뀌어요."
          : "호스트 설정을 마치면 이 화면이 알아서 확인해요. 호스트가 인증서를 받는 데 몇 분 걸려요."}
      </p>
      <CheckControls check={check} auto={auto} onCheck={onCheck} texts={redirect ? REDIRECT_RESULT_TEXT : CONNECT_RESULT_TEXT} />
    </div>
  );
}

function ReleaseButton({ domain }: { domain: DomainView }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-zinc-500 underline-offset-2 hover:text-red-600 hover:underline dark:text-zinc-400">
        이 주소 반납하기
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">이 주소를 반납할까요?</DialogTitle>
            <DialogDescription>
              <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{domain.name}.dshs.dev</span> · DNS 레코드가 바로 지워지고, 이 이름은 다른 사람이 받을 수 있어요.
            </DialogDescription>
          </DialogHeader>
          {error && <ErrorText>{error}</ErrorText>}
          <DialogFooter>
            <button type="button" onClick={() => setOpen(false)} disabled={pending} className={SECONDARY}>
              취소
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await releaseSubdomain(domain.id);
                  if (!r.ok) return setError(r.error);
                  setOpen(false);
                  router.refresh();
                })
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}반납하기
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UrlSuggestion({ domain, onApplied }: { domain: DomainView; onApplied: () => void }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const fqdn = `${domain.name}.dshs.dev`;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 sm:flex-row sm:items-center dark:border-teal-900 dark:bg-teal-950/40">
      <p className="flex-1 text-sm text-teal-900 dark:text-teal-200">
        프로젝트의 방문 주소를 이 주소로 바꿀까요? <span className="font-mono font-semibold">{fqdn}</span>
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await applyProjectUrl(domain.id);
            if (!r.ok) return setError(r.error);
            onApplied();
            router.refresh();
          })
        }
        className={PRIMARY}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}바꾸기
      </button>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

export function DomainSteps({
  project,
  domain,
  check,
  auto,
  onCheck,
}: {
  project: DomainProjectRow["project"];
  domain: DomainView | null;
  check: CheckState;
  auto: AutoState;
  onCheck: () => void;
}) {
  const [reconnect, setReconnect] = useState(false);
  const [changeSite, setChangeSite] = useState(false);
  // "바꾸기" 직후 project.url 이 새 주소로 바뀌므로, 안내에 쓸 옛 주소는 누르는 순간에 붙잡아 둔다
  const [urlChange, setUrlChange] = useState<{ from: string | null; open: boolean } | null>(null);
  const fqdn = domain ? `${domain.name}.dshs.dev` : null;
  const connected = domain !== null && domain.status !== "reserved";
  const verified = domain !== null && domain.siteVerified;
  const showSite = domain !== null && (!verified || changeSite);
  const siteHostname = domain?.siteUrl ? new URL(domain.siteUrl).hostname : null;
  // ②에서 다른 사이트를 확인했는데 지금 연결은 옛 사이트를 가리키는 경우 — 다시 연결해야 새 사이트로 열린다
  const staleConnection =
    connected &&
    verified &&
    (domain.host !== domain.siteHost || (domain.siteHost !== null && targetBoundToSite(domain.siteHost) && domain.target !== siteHostname));
  const showHost = verified && !showSite && (!connected || reconnect || staleConnection);
  const urlIsDomain = fqdn !== null && project.url?.replace(/\/+$/, "") === `https://${fqdn}`;
  // 바로가기는 사이트가 원래 주소에서 그대로 돌아서 DB·로그인 설정을 바꿀 일이 없다 → 안내 창 없음
  const redirect = isRedirectHost(domain?.host ?? null);
  const hostLabel = domain?.host ? HOST_PRESETS[domain.host].label : "호스트";

  return (
    <div className="flex flex-col gap-4">
      {domain?.status === "active" && !urlIsDomain && (
        <UrlSuggestion domain={domain} onApplied={() => !redirect && setUrlChange({ from: project.url?.trim() || null, open: true })} />
      )}
      {fqdn && !redirect && (
        <UrlChangedDialog open={urlChange?.open ?? false} onClose={() => setUrlChange((c) => c && { ...c, open: false })} oldUrl={urlChange?.from ?? null} newUrl={`https://${fqdn}`} />
      )}

      <ol className="flex flex-col gap-4">
        <Step n={1} state={domain ? "done" : "current"} title={domain ? <>이름 <span className="font-mono">{fqdn}</span></> : "이름 정하기"}>
          {!domain && <NameStep projectId={project.id} />}
        </Step>

        <Step
          n={2}
          state={!domain ? "todo" : showSite ? "current" : "done"}
          title={
            verified && !showSite ? (
              <>
                내 사이트 확인됨{siteHostname && <> · <span className="font-mono">{siteHostname}</span></>}
              </>
            ) : (
              "내 사이트에 확인 코드 넣기"
            )
          }
        >
          {domain && showSite && (
            <SiteStep domain={domain} projectUrl={project.url ?? ""} check={check} auto={auto} onCheck={onCheck} onSaved={() => setChangeSite(false)} />
          )}
          {domain && verified && changeSite && (
            <button type="button" onClick={() => setChangeSite(false)} className="mt-2 text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400">
              바꾸지 않을게요
            </button>
          )}
          {domain && verified && !showSite && (
            <button type="button" onClick={() => setChangeSite(true)} className="text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400">
              다른 사이트로 바꿨다면 다시 확인하기
            </button>
          )}
        </Step>

        <Step
          n={3}
          state={!verified || showSite ? "todo" : domain.status === "active" && !showHost ? "done" : "current"}
          title={
            domain?.status === "active" && !showHost
              ? redirect
                ? "연결됨 — 이 주소로 들어오면 내 사이트로 넘어가요"
                : "연결됨 — 내 사이트가 이 주소로 열려요"
              : connected && !showHost
                ? redirect
                  ? `${hostLabel} 바로가기 확인 중`
                  : `${hostLabel}에 연결함 — 확인 중`
                : staleConnection
                  ? "새 사이트로 다시 연결하기"
                  : "호스트에 연결하기"
          }
        >
          {domain && showHost && staleConnection && (
            <p className="mb-2 text-sm text-amber-700 dark:text-amber-400">
              지금 주소는 아직 예전 사이트({hostLabel})로 연결돼 있어요. 아래에서 다시 연결해야 새 사이트로 열려요.
            </p>
          )}
          {domain && showHost && <HostPicker domain={domain} onDone={() => setReconnect(false)} />}
          {domain && showHost && reconnect && !staleConnection && (
            <button type="button" onClick={() => setReconnect(false)} className="mt-2 text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400">
              다시 연결하지 않을게요
            </button>
          )}
          {domain && connected && !showHost && !showSite && domain.status !== "active" && (
            <ConnectStatus domain={domain} check={check} auto={auto} onCheck={onCheck} />
          )}
          {domain && connected && !showHost && !showSite && domain.status === "active" && (
            <a href={`https://${fqdn}`} target="_blank" rel="noopener noreferrer" className={cn(SECONDARY, "h-8")}>
              {fqdn} 열기
            </a>
          )}
          {domain && connected && !showHost && !showSite && (
            <button type="button" onClick={() => setReconnect(true)} className="mt-2 block text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400">
              호스트 설정을 바꿨다면 다시 연결하기
            </button>
          )}
        </Step>
      </ol>

      {domain && (
        <div className="flex justify-end">
          <ReleaseButton domain={domain} />
        </div>
      )}
    </div>
  );
}
