"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";

export default function AccountDangerZone() {
  const { t } = useI18n();
  const { workspacePaletteLight } = useWorkspaceExperience();
  const light = workspacePaletteLight;

  const { user, isLoaded } = useUser();
  const titleId = useId();
  const passwordEnabled = Boolean(user?.passwordEnabled);

  const [open, setOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const [reason, setReason] = useState("");
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setAck(false);
      setReason("");
      setPhrase("");
      setPassword("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const reasonOk = reason.trim().length >= 20;
  const phraseOk = phrase.trim().toLowerCase() === "delete";
  const pwdOk = !passwordEnabled || password.trim().length > 0;
  const ready = ack && reasonOk && phraseOk && pwdOk;

  const submit = useCallback(async () => {
    setError(null);
    if (!ack || !reasonOk || !phraseOk || !pwdOk) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          confirmationPhrase: phrase.trim(),
          password: passwordEnabled ? password : undefined,
          reason: reason.trim(),
          acknowledgedPermanent: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("settings.danger.account.errDelete"));
        return;
      }
      window.location.href = "/";
    } catch {
      setError(t("settings.danger.account.errNetwork"));
    } finally {
      setBusy(false);
    }
  }, [
    ack,
    passwordEnabled,
    phrase,
    password,
    pwdOk,
    reason,
    reasonOk,
    phraseOk,
    t,
  ]);

  const sectionClass = light
    ? "rounded-2xl border border-red-200 bg-gradient-to-b from-red-50/95 to-white p-5 shadow-sm"
    : "rounded-2xl border border-red-500/40 bg-gradient-to-b from-red-950/[0.15] to-transparent p-5 shadow-[0_0_0_1px_rgba(239,68,68,0.08)]";

  const iconBox = light
    ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700"
    : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-300";

  const heading = light ? "text-[15px] font-semibold tracking-[-0.02em] text-slate-900" : "text-[15px] font-semibold tracking-[-0.02em] text-zinc-50";
  const lead = light ? "mt-1 text-[13px] leading-relaxed text-slate-600" : "mt-1 text-[13px] leading-relaxed text-zinc-400";

  const toggleBtn = light
    ? "flex w-full items-center justify-between gap-3 rounded-xl border border-red-300 bg-white px-4 py-3 text-left text-[13px] font-medium text-red-900 transition hover:bg-red-50"
    : "flex w-full items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-950/10 px-4 py-3 text-left text-[13px] font-medium text-red-200/95 transition hover:bg-red-950/25";

  const warnClass = light
    ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-950"
    : "rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-[13px] leading-relaxed text-red-100/90";

  const warnTitle = light ? "font-semibold text-red-950" : "font-semibold text-red-100";
  const warnLi = light
    ? "mt-2 list-inside list-disc space-y-1 text-[12px] text-red-900"
    : "mt-2 list-inside list-disc space-y-1 text-[12px] text-red-200/95";

  const errClass = light ? "text-[13px] text-red-700" : "text-[13px] text-red-400";

  return (
    <section className={sectionClass} aria-labelledby={titleId}>
      <div className="flex items-start gap-3">
        <div className={iconBox}>
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className={heading}>
            {t("settings.danger.account.title")}
          </h2>
          <p className={lead}>{t("settings.danger.account.lead")}</p>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={toggleBtn}
          aria-expanded={open}
        >
          <span>
            {open
              ? t("settings.danger.account.toggleCollapse")
              : t("settings.danger.account.toggleExpand")}
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          )}
        </button>
      </div>

      {open ? (
        <div className="mt-5 space-y-4 border-t border-red-500/25 pt-5">
          <div className={warnClass}>
            <p className={warnTitle}>{t("settings.danger.account.cannotUndo")}</p>
            <ul className={warnLi}>
              <li>{t("settings.danger.account.b1")}</li>
              <li>{t("settings.danger.account.b2")}</li>
              <li>{t("settings.danger.account.b3")}</li>
            </ul>
          </div>

          <div>
            <label htmlFor="danger-reason" className="text-[12px] font-medium text-[var(--workspace-fg)]">
              {t("settings.danger.account.reasonLabel")}
            </label>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--workspace-muted-fg)]">
              {t("settings.danger.account.reasonHint")}
            </p>
            <textarea
              id="danger-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={busy}
              className="mt-2 w-full resize-y rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500/15"
              placeholder={t("settings.danger.account.reasonPlaceholder")}
            />
            <p className="mt-1 text-[11px] text-[var(--workspace-muted-fg)]">
              {t("settings.danger.account.reasonCount", { n: reason.trim().length })}
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-3 py-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-[var(--workspace-border)]"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              disabled={busy}
            />
            <span className="text-[13px] leading-snug text-[var(--workspace-fg)]">
              {t("settings.danger.account.ack")}
            </span>
          </label>

          <label className="block">
            <span className="text-[12px] font-medium text-[var(--workspace-muted-fg)]">
              {t("settings.danger.account.typeDelete")}
            </span>
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={busy}
              className="mt-1.5 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[14px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500/15"
              placeholder="delete"
            />
          </label>

          {isLoaded && passwordEnabled ? (
            <label className="block">
              <span className="text-[12px] font-medium text-[var(--workspace-muted-fg)]">
                {t("settings.danger.account.password")}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={busy}
                className="mt-1.5 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[14px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500/15"
                placeholder="••••••••"
              />
            </label>
          ) : isLoaded ? (
            <p className="text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
              {t("settings.danger.account.noPassword")}
            </p>
          ) : null}

          <p className="text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
            {t("settings.danger.account.stillSure")}
          </p>

          {error ? (
            <p className={errClass} role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-4 py-2 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-white/[0.04] disabled:opacity-50"
            >
              {t("settings.danger.account.cancel")}
            </button>
            <button
              type="button"
              disabled={busy || !ready}
              onClick={() => void submit()}
              className="rounded-xl bg-red-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:opacity-40"
            >
              {busy ? t("settings.danger.account.deleting") : t("settings.danger.account.delete")}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
