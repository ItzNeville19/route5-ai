"use client";

import { useId } from "react";
import { AlertTriangle } from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";

/** Company teardown — not wired to Clerk Organizations deletion yet (honest disabled affordance). */
export default function OrganizationDangerZone() {
  const { t } = useI18n();
  const { workspacePaletteLight } = useWorkspaceExperience();
  const light = workspacePaletteLight;

  const titleId = useId();
  const { orgRole, organizationName } = useWorkspaceData();
  if (orgRole !== "admin") return null;

  const sectionClass = light
    ? "rounded-2xl border border-red-200 bg-gradient-to-b from-red-50/90 to-white p-5 shadow-sm"
    : "rounded-2xl border border-red-500/35 bg-gradient-to-b from-red-950/[0.12] to-transparent p-5 shadow-[0_0_0_1px_rgba(239,68,68,0.06)]";

  const iconBox = light
    ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700"
    : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300";

  const heading = light
    ? "text-[15px] font-semibold tracking-[-0.02em] text-slate-900"
    : "text-[15px] font-semibold tracking-[-0.02em] text-zinc-50";
  const body = light ? "mt-1 text-[13px] leading-relaxed text-slate-600" : "mt-1 text-[13px] leading-relaxed text-zinc-400";

  const btn = light
    ? "rounded-xl border border-red-300 bg-white px-4 py-2 text-[13px] font-semibold text-red-900 opacity-60"
    : "rounded-xl border border-red-500/25 bg-red-950/10 px-4 py-2 text-[13px] font-semibold text-red-200/80 opacity-60";

  const hint = light ? "text-[12px] leading-snug text-slate-600" : "text-[12px] leading-snug text-zinc-500";

  const orgLabel = organizationName ?? t("settings.danger.org.fallbackName");

  return (
    <section className={sectionClass} aria-labelledby={titleId}>
      <div className="flex items-start gap-3">
        <div className={iconBox}>
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className={heading}>
            {t("settings.danger.org.title")}
          </h2>
          <p className={body}>
            {t("settings.danger.org.lead", { orgName: orgLabel })}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled className={btn}>
          {t("settings.danger.org.button")}
        </button>
        <span className={hint}>{t("settings.danger.org.hint")}</span>
      </div>
    </section>
  );
}
