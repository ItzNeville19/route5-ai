"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  Building2,
  Copy,
  ExternalLink,
  FileText,
  Flag,
  Keyboard,
  LayoutGrid,
  LayoutTemplate,
  LifeBuoy,
  ListChecks,
  Mail,
  MessageSquareWarning,
  PanelTop,
  PlayCircle,
  Search,
  Settings,
  Shield,
  Sparkles,
  UserRound,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useCommandPalette } from "@/components/CommandPalette";
import { useWorkspaceDataOptional } from "@/components/workspace/WorkspaceData";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useI18n } from "@/components/i18n/I18nProvider";
import { CONTACT_EMAIL } from "@/lib/site";
import { deskUrl } from "@/lib/desk-routes";
import { primaryModLabelFromNavigator } from "@/lib/platform-shortcuts";
import { isOrgLeadership } from "@/lib/workspace-role";

type QuickLink = {
  href: string;
  labelKey: string;
  hintKey: string;
  icon: typeof LayoutGrid;
  leadershipOnly?: boolean;
};

function matchesFilter(q: string, ...parts: string[]) {
  if (!q.trim()) return true;
  const n = q.trim().toLowerCase();
  return parts.some((p) => p.toLowerCase().includes(n));
}

export default function WorkspaceHelpPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const palette = useCommandPalette();
  const { workspacePaletteLight, pushToast } = useWorkspaceExperience();
  const data = useWorkspaceDataOptional();
  const mod = useMemo(() => primaryModLabelFromNavigator(), [open]);
  const isLead = isOrgLeadership(data?.orgRole ?? null);
  const [filter, setFilter] = useState("");

  const quickLinks: QuickLink[] = useMemo(
    () => [
      {
        href: "/workspace/dashboard",
        labelKey: "workspace.help.link.home.label",
        hintKey: "workspace.help.link.home.hint",
        icon: LayoutGrid,
      },
      {
        href: deskUrl(),
        labelKey: "workspace.help.link.desk.label",
        hintKey: "workspace.help.link.desk.hint",
        icon: PanelTop,
      },
      {
        href: "/workspace/agent",
        labelKey: "workspace.help.link.agent.label",
        hintKey: "workspace.help.link.agent.hint",
        icon: Sparkles,
        leadershipOnly: true,
      },
      {
        href: "/workspace/commitments",
        labelKey: "workspace.help.link.commitments.label",
        hintKey: "workspace.help.link.commitments.hint",
        icon: ListChecks,
      },
      {
        href: "/companies",
        labelKey: "workspace.help.link.companies.label",
        hintKey: "workspace.help.link.companies.hint",
        icon: Building2,
      },
      {
        href: "/workspace/organization",
        labelKey: "workspace.help.link.team.label",
        hintKey: "workspace.help.link.team.hint",
        icon: UserRound,
      },
      {
        href: "/overview",
        labelKey: "workspace.help.link.overview.label",
        hintKey: "workspace.help.link.overview.hint",
        icon: Flag,
        leadershipOnly: true,
      },
      {
        href: "/workspace/integrations",
        labelKey: "workspace.help.link.intStatus.label",
        hintKey: "workspace.help.link.intStatus.hint",
        icon: Wrench,
      },
      {
        href: "/integrations",
        labelKey: "workspace.help.link.intHub.label",
        hintKey: "workspace.help.link.intHub.hint",
        icon: Search,
      },
      {
        href: "/workspace/notifications/preferences",
        labelKey: "workspace.help.link.notifications.label",
        hintKey: "workspace.help.link.notifications.hint",
        icon: Bell,
      },
      {
        href: "/settings",
        labelKey: "workspace.help.link.settings.label",
        hintKey: "workspace.help.link.settings.hint",
        icon: Settings,
      },
      {
        href: "/workspace/customize",
        labelKey: "workspace.help.link.customize.label",
        hintKey: "workspace.help.link.customize.hint",
        icon: LayoutTemplate,
      },
    ],
    []
  );

  const docLinks = useMemo(
    () =>
      [
        { href: "/docs/product", labelKey: "workspace.help.doc.product", icon: FileText },
        { href: "/docs/roadmap", labelKey: "workspace.help.doc.roadmap", icon: BookOpen },
        { href: "/trust", labelKey: "workspace.help.doc.trust", icon: Shield },
        { href: "/workspace/help", labelKey: "workspace.help.doc.support", icon: LifeBuoy },
      ] as const,
    []
  );

  const visibleLinks = useMemo(() => {
    const base = quickLinks.filter((l) => !l.leadershipOnly || isLead);
    return base.filter((l) =>
      matchesFilter(filter, t(l.labelKey), t(l.hintKey))
    );
  }, [quickLinks, isLead, filter, t]);

  const visibleDocs = useMemo(
    () =>
      docLinks.filter((l) => matchesFilter(filter, t(l.labelKey))),
    [docLinks, filter, t]
  );

  /** Always `neville@rayze.xyz` — never derive from translations. */
  const mailSupport = `mailto:${CONTACT_EMAIL}?${new URLSearchParams({
    subject: t("workspace.help.mail.supportSubject"),
  }).toString()}`;
  const mailIssue = `mailto:${CONTACT_EMAIL}?${new URLSearchParams({
    subject: t("workspace.help.mail.issueSubject"),
    body: t("workspace.help.mail.issueBody"),
  }).toString()}`;

  const shiftU = mod === "⌘" ? "⌘⇧U" : "Ctrl+Shift+U";

  const light = workspacePaletteLight;
  const shell = light
    ? "border-l border-slate-200 bg-white text-slate-900 shadow-[0_0_0_1px_rgba(15,23,42,0.06),-24px_0_80px_-48px_rgba(15,23,42,0.18)]"
    : "border-l border-emerald-500/15 bg-[linear-gradient(180deg,#0a1210_0%,#070b09_100%)] shadow-[-24px_0_80px_-40px_rgba(16,185,129,0.35)]";

  const secHead = light ? "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500" : "text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400/85";

  const linkCard = light
    ? "border border-slate-200/90 bg-slate-50/80 hover:border-sky-400/35 hover:bg-white"
    : "border border-white/10 bg-black/20 hover:border-emerald-500/35 hover:bg-emerald-500/[0.07]";

  const muted = light ? "text-slate-600" : "text-white/65";
  const bodyMuted = light ? "text-slate-500" : "text-white/45";

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => document.body.classList.add("overflow-hidden"), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.body.classList.remove("overflow-hidden");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setFilter("");
  }, [open]);

  if (typeof document === "undefined") return null;

  const copySupportEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      pushToast(t("workspace.help.copied"), "success");
    } catch {
      pushToast("Could not copy", "error");
    }
  };

  return createPortal(
    open ? (
      <>
        <button
          type="button"
          className={`fixed inset-0 z-[278] backdrop-blur-[2px] ${light ? "bg-slate-900/35" : "bg-black/55"}`}
          aria-label={t("workspace.help.backdropAria")}
          onClick={onClose}
        />
        <aside
          className={`fixed inset-y-0 right-0 z-[279] flex w-full max-w-[min(100%,32rem)] flex-col ${shell}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-panel-title"
        >
          <div
            className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${light ? "border-slate-200" : "border-white/10"}`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <LifeBuoy
                  className={`h-5 w-5 shrink-0 ${light ? "text-sky-600" : "text-emerald-400/90"}`}
                  strokeWidth={1.75}
                />
                <h2 id="help-panel-title" className={`text-[17px] font-semibold ${light ? "text-slate-900" : "text-white"}`}>
                  {t("workspace.help.title")}
                </h2>
              </div>
              <p className={`mt-1.5 pl-[1.75rem] text-[12px] leading-snug ${bodyMuted}`}>
                {t("workspace.help.subtitle.github")}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`shrink-0 rounded-full border p-2 transition ${light ? "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900" : "border-white/15 text-white/55 hover:bg-white/10 hover:text-white"}`}
              aria-label={t("workspace.help.closeAria")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className={`min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 text-[14px] leading-relaxed ${light ? "text-slate-700" : "text-white/75"}`}>
            <div className="relative">
              <Search
                className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${light ? "text-slate-400" : "text-white/35"}`}
                aria-hidden
              />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={t("workspace.help.filterPlaceholder")}
                className={
                  light
                    ? "w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none ring-sky-500/30 focus:border-sky-400 focus:ring-2"
                    : "w-full rounded-lg border border-white/12 bg-black/30 py-2 pl-9 pr-3 text-[13px] text-white placeholder:text-white/35 outline-none ring-emerald-500/25 focus:border-emerald-500/40 focus:ring-2"
                }
                aria-label={t("workspace.help.filterPlaceholder")}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  palette.open();
                }}
                className={
                  light
                    ? "flex items-center justify-center gap-2 rounded-xl border border-sky-400/35 bg-sky-500/10 px-3 py-3 text-left text-[13px] font-semibold text-sky-950 transition hover:bg-sky-500/15"
                    : "flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/12 px-3 py-3 text-left text-[13px] font-semibold text-emerald-50 transition hover:bg-emerald-500/20"
                }
              >
                <Zap className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                {t("workspace.help.openPalette")}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.dispatchEvent(new Event("route5:capture-open"));
                }}
                className={
                  light
                    ? "flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-[13px] font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                    : "flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-3 py-3 text-left text-[13px] font-semibold text-white/90 transition hover:border-white/20 hover:bg-white/10"
                }
              >
                <PanelTop className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                {t("workspace.help.openCapture")}
              </button>
            </div>

            <p className={`text-[12px] leading-relaxed ${light ? "text-slate-500" : "text-white/45"}`}>
              {isLead ? t("workspace.help.role.lead") : t("workspace.help.role.member")}
            </p>

            {/* Documentation — GitHub-style dense links */}
            <section className={`border-l-2 ${light ? "border-sky-500/40 pl-3" : "border-emerald-500/40 pl-3"}`}>
              <p className={`mb-2 flex items-center gap-2 ${secHead}`}>
                <BookOpen className="h-3.5 w-3.5" />
                {t("workspace.help.section.documentation")}
              </p>
              <ul className="space-y-1">
                {visibleDocs.map((d) => (
                  <li key={d.href}>
                    <Link
                      href={d.href}
                      onClick={onClose}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium transition ${light ? "text-sky-800 hover:bg-slate-100" : "text-emerald-200/95 hover:bg-white/[0.06]"}`}
                    >
                      <d.icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
                      <span className="min-w-0 flex-1">{t(d.labelKey)}</span>
                      <ExternalLink className={`h-3.5 w-3.5 shrink-0 ${light ? "text-sky-500/80" : "text-emerald-500/70"}`} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <p className={`mb-2.5 flex items-center gap-2 ${secHead}`}>
                <PlayCircle className="h-3.5 w-3.5" />
                {t("workspace.help.section.start")}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/workspace/dashboard?tour=1");
                }}
                className={
                  light
                    ? "flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/35 bg-sky-500/[0.08] py-2.5 text-[13px] font-semibold text-sky-950 transition hover:bg-sky-500/12"
                    : "flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-[13px] font-semibold text-emerald-50 transition hover:bg-emerald-500/16"
                }
              >
                <PlayCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                {t("workspace.help.tour")}
              </button>
            </section>

            <section>
              <p className={`mb-2.5 flex items-center gap-2 ${secHead}`}>
                <LayoutGrid className="h-3.5 w-3.5" />
                {t("workspace.help.section.workspace")}
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {visibleLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={onClose}
                    className={`group flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition ${linkCard}`}
                  >
                    <l.icon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${light ? "text-sky-600 group-hover:text-sky-700" : "text-emerald-400/80 group-hover:text-emerald-300"}`}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className={`block text-[13px] font-medium ${light ? "text-slate-900" : "text-white/90"}`}>
                        {t(l.labelKey)}
                      </span>
                      <span className={`block text-[11px] leading-snug ${light ? "text-slate-500" : "text-white/45"}`}>
                        {t(l.hintKey)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <p className={`mb-2.5 flex items-center gap-2 ${secHead}`}>
                <Keyboard className="h-3.5 w-3.5" />
                {t("workspace.help.section.keyboard")}
              </p>
              <ul
                className={`space-y-0 divide-y overflow-hidden rounded-xl border text-[12px] ${light ? "divide-slate-100 border-slate-200 bg-slate-50/90" : "divide-white/[0.06] border-white/10 bg-black/25"}`}
              >
                <li className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${muted}`}>
                  <span>{t("workspace.help.kbd.palette")}</span>
                  <kbd
                    className={`rounded border px-1.5 py-0.5 font-mono text-[11px] ${light ? "border-slate-200 bg-white text-slate-700" : "border-white/15 bg-white/5 text-emerald-200/95"}`}
                  >
                    {mod}K
                  </kbd>
                </li>
                <li className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${muted}`}>
                  <span>{t("workspace.help.kbd.capture")}</span>
                  <kbd
                    className={`rounded border px-1.5 py-0.5 font-mono text-[11px] ${light ? "border-slate-200 bg-white text-slate-700" : "border-white/15 bg-white/5 text-emerald-200/95"}`}
                  >
                    {mod}J
                  </kbd>
                </li>
                <li className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${muted}`}>
                  <span>{t("workspace.help.kbd.updates")}</span>
                  <kbd
                    className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${light ? "border-slate-200 bg-white text-slate-700" : "border-white/15 bg-white/5 text-emerald-200/95"}`}
                  >
                    {shiftU}
                  </kbd>
                </li>
                <li className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${muted}`}>
                  <span>{t("workspace.help.kbd.deskSearch")}</span>
                  <kbd
                    className={`rounded border px-1.5 py-0.5 font-mono text-[11px] ${light ? "border-slate-200 bg-white text-slate-700" : "border-white/15 bg-white/5 text-emerald-200/95"}`}
                  >
                    /
                  </kbd>
                </li>
                <li className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${muted}`}>
                  <span>{t("workspace.help.kbd.fullList")}</span>
                  <div className="flex gap-1">
                    <kbd
                      className={`rounded border px-1.5 py-0.5 font-mono text-[11px] ${light ? "border-slate-200 bg-white text-slate-700" : "border-white/15 bg-white/5 text-emerald-200/95"}`}
                    >
                      ?
                    </kbd>
                    <span className={light ? "text-slate-300" : "text-white/35"} aria-hidden>
                      ·
                    </span>
                    <kbd
                      className={`rounded border px-1.5 py-0.5 font-mono text-[11px] ${light ? "border-slate-200 bg-white text-slate-700" : "border-white/15 bg-white/5 text-emerald-200/95"}`}
                    >
                      {mod}/
                    </kbd>
                  </div>
                </li>
              </ul>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.dispatchEvent(new Event("route5:shortcuts-open"));
                }}
                className={`mt-2 w-full rounded-lg border px-3 py-2 text-center text-[12px] font-semibold transition ${light ? "border-slate-200 bg-white text-slate-800 hover:border-violet-400/40 hover:bg-slate-50" : "border-white/12 bg-white/[0.04] text-white/80 hover:border-violet-400/35 hover:text-white"}`}
              >
                {t("workspace.help.fullKeyboardRef")}
              </button>
            </section>

            <section
              className={`rounded-xl border p-3.5 ${light ? "border-amber-200 bg-amber-50/90" : "border-amber-500/15 bg-amber-500/[0.06]"}`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${light ? "text-amber-900/90" : "text-amber-200/80"}`}
              >
                {t("workspace.help.trouble.title")}
              </p>
              <ul className={`mt-2 list-disc space-y-1.5 pl-4 text-[12px] ${light ? "text-amber-950/80" : "text-white/60"}`}>
                <li>
                  {t("workspace.help.trouble.b1a")}{" "}
                  <Link
                    href="/workspace/integrations"
                    className={`font-medium underline-offset-2 hover:underline ${light ? "text-sky-700" : "text-emerald-300/90"}`}
                    onClick={onClose}
                  >
                    {t("workspace.help.trouble.b1link")}
                  </Link>
                  {t("workspace.help.trouble.b1b")}
                </li>
                <li>
                  {t("workspace.help.trouble.b2a")}{" "}
                  <Link
                    href="/workspace/notifications/preferences"
                    className={`font-medium underline-offset-2 hover:underline ${light ? "text-sky-700" : "text-emerald-300/90"}`}
                    onClick={onClose}
                  >
                    {t("workspace.help.trouble.b2link")}
                  </Link>
                  {t("workspace.help.trouble.b2b")}
                </li>
                <li>
                  {t("workspace.help.trouble.b3a")}{" "}
                  <Link
                    href="/docs/product"
                    className={`font-medium underline-offset-2 hover:underline ${light ? "text-sky-700" : "text-emerald-300/90"}`}
                    onClick={onClose}
                  >
                    {t("workspace.help.trouble.b3link")}
                  </Link>
                  {t("workspace.help.trouble.b3b")}
                </li>
              </ul>
            </section>

            <section className={`rounded-xl border p-4 ${light ? "border-slate-200 bg-slate-50" : "border-white/10 bg-black/25"}`}>
              <p className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${light ? "text-slate-500" : "text-white/45"}`}>
                {t("workspace.help.section.contact")}
              </p>
              <p className={`mb-3 text-[12px] leading-relaxed ${light ? "text-slate-600" : "text-white/55"}`}>
                {t("workspace.help.contactBlurb")}
              </p>
              <div
                className={`mb-4 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[13px] ${light ? "border-slate-200 bg-white text-slate-900" : "border-white/12 bg-black/30 text-emerald-100/95"}`}
              >
                <span className="min-w-0 flex-1 break-all">{CONTACT_EMAIL}</span>
                <button
                  type="button"
                  onClick={() => void copySupportEmail()}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${light ? "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100" : "border-white/15 bg-white/5 text-white/90 hover:bg-white/10"}`}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  {t("workspace.help.copyEmail")}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={mailSupport}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-center text-[13px] font-semibold ${light ? "border-slate-200 bg-white text-slate-900 hover:border-emerald-500/35" : "border-white/15 bg-white/5 text-white/90 hover:border-emerald-500/35"}`}
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {t("workspace.help.contact")}
                </a>
                <a
                  href={mailIssue}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-center text-[13px] font-medium ${light ? "border-slate-200 text-slate-700 hover:border-amber-400/40 hover:bg-amber-50/50" : "border-white/15 text-white/65 hover:border-amber-500/30 hover:text-white/85"}`}
                >
                  <MessageSquareWarning className="h-4 w-4 shrink-0" />
                  {t("workspace.help.report")}
                </a>
              </div>
            </section>
          </div>
        </aside>
      </>
    ) : null,
    document.body
  );
}
