"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import TimezoneSearchField from "@/components/workspace/TimezoneSearchField";
import { normalizeLegacyIana } from "@/lib/iana-timezones";
import {
  inferRegionKeyForTimezone,
  normalizeRegionKeyForTimezone,
  regionsForTimezone,
} from "@/lib/workspace-regions";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { UI_LOCALES, type UiLocaleCode } from "@/lib/i18n/ui-locales";
import {
  WORKSPACE_SURFACE_MATERIAL_IDS,
  type WorkspaceSurfaceMaterialId,
  resolveWorkspaceSurfaceMaterial,
} from "@/lib/workspace-surface-material";
import { WORKSPACE_TZ_DIRTY_SESSION_KEY } from "@/lib/workspace-prefs";

function guessTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export default function WorkspacePreferencesCard() {
  const { user } = useUser();
  const exp = useWorkspaceExperience();
  const { t, setUiLocale } = useI18n();
  const [tz, setTz] = useState(normalizeLegacyIana(exp.prefs.workspaceTimezone ?? guessTz()));
  const [regionKey, setRegionKey] = useState(exp.prefs.workspaceRegionKey ?? "");

  useEffect(() => {
    setTz(normalizeLegacyIana(exp.prefs.workspaceTimezone ?? guessTz()));
    setRegionKey(exp.prefs.workspaceRegionKey ?? "");
  }, [exp.prefs.workspaceTimezone, exp.prefs.workspaceRegionKey]);

  const regionOptions = useMemo(() => regionsForTimezone(tz), [tz]);

  const applyLocation = useCallback(() => {
    try {
      sessionStorage.setItem(WORKSPACE_TZ_DIRTY_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    const resolvedTz = normalizeLegacyIana(tz);
    const normalized = normalizeRegionKeyForTimezone(resolvedTz, regionKey || undefined);
    exp.setPrefs({ workspaceTimezone: resolvedTz, workspaceRegionKey: normalized });
  }, [exp, tz, regionKey]);

  const onTimezoneChange = useCallback(
    (next: string) => {
      const resolved = normalizeLegacyIana(next);
      setTz(resolved);
      const n = normalizeRegionKeyForTimezone(resolved, regionKey || undefined);
      setRegionKey(n ?? inferRegionKeyForTimezone(resolved) ?? regionsForTimezone(resolved)[0]?.key ?? "");
    },
    [regionKey]
  );

  const gradientsOn = exp.prefs.appearanceGradients !== false;

  return (
    <section
      id="workspace-prefs"
      className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-6 shadow-sm"
      aria-labelledby="workspace-prefs-heading"
    >
      <h2 id="workspace-prefs-heading" className="sr-only">
        Workspace preferences
      </h2>

      <div className="space-y-5">
        <p className="text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
          {t("prefs.defaultsIntro")}
        </p>
        <div id="workspace-lang">
          <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]">
            {t("lang.section")}
          </h3>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
            {t("lang.description")}
          </p>
          <label htmlFor="workspace-ui-locale" className="mt-3 block text-[12px] font-medium text-[var(--workspace-fg)]">
            {t("lang.selectLabel")}
          </label>
          <select
            id="workspace-ui-locale"
            value={exp.prefs.uiLocale ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setUiLocale(v === "" ? undefined : (v as UiLocaleCode));
            }}
            className="mt-1.5 w-full max-w-md rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[13px] text-[var(--workspace-fg)] focus:border-[var(--workspace-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/15"
          >
            <option value="">{t("lang.autoBrowser")}</option>
            {UI_LOCALES.map((row) => (
              <option key={row.code} value={row.code}>
                {row.native} ({row.label})
              </option>
            ))}
          </select>
        </div>

        <hr className="border-[var(--workspace-border)]" />

        <div>
          <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]">
            {t("prefs.timePlace")}
          </h3>
          <p className="workspace-pref-secondary mt-2 max-w-xl text-[13px] leading-relaxed">
            {t("prefs.timeIntro")}{" "}
            <Link href="/product" className="font-medium text-[var(--workspace-accent)] hover:underline">
              {t("sidebar.product")}
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="workspace-tz" className="text-[12px] font-medium text-[var(--workspace-fg)]">
            {t("prefs.timezone")}
          </label>
          <div className="mt-1.5">
            <TimezoneSearchField
              id="workspace-tz"
              value={tz}
              onChange={onTimezoneChange}
              placeholder={t("prefs.timezoneSearchPlaceholder")}
              hint={t("prefs.timezoneSearchHint")}
              moreLabel={t("prefs.timezoneMoreResults")}
            />
          </div>
        </div>

        {regionOptions.length > 0 ? (
          <div>
            <label htmlFor="workspace-region" className="text-[12px] font-medium text-[var(--workspace-fg)]">
              {t("prefs.region")}
            </label>
            <p className="workspace-pref-secondary mt-0.5 text-[11px]">
              {t("prefs.regionHint")}
            </p>
            <select
              id="workspace-region"
              value={regionKey || inferRegionKeyForTimezone(tz) || regionOptions[0]!.key}
              onChange={(e) => setRegionKey(e.target.value)}
              className="mt-1.5 min-w-[min(100%,280px)] rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[13px] text-[var(--workspace-fg)] focus:border-[var(--workspace-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/15"
            >
              {regionOptions.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={applyLocation}
            className="rounded-lg bg-[var(--workspace-fg)] px-3 py-2 text-[12px] font-semibold text-[var(--workspace-canvas)] transition hover:opacity-95"
          >
            {t("prefs.applyLocation")}
          </button>
          <p className="workspace-pref-secondary text-[11px]">
            {t("prefs.browserZone")}: <span className="font-medium text-[var(--workspace-fg)]">{guessTz()}</span>
          </p>
          <p className="workspace-pref-secondary mt-2 max-w-xl text-[12px] leading-relaxed">
            {t("prefs.timezoneSyncNote")}
          </p>
        </div>

        <hr className="border-[var(--workspace-border)]" />

        <h3 className="text-[14px] font-semibold text-[var(--workspace-fg)]">{t("prefs.appearanceSection")}</h3>
        <p className="workspace-pref-secondary text-[12px] leading-relaxed">
          {t("prefs.appearanceIntro")}{" "}
          <Link href="/settings" className="font-medium text-[var(--workspace-accent)] hover:underline">
            {t("prefs.appearanceLink")}
          </Link>
          .
        </p>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[var(--workspace-border)]"
            checked={gradientsOn}
            onChange={(e) => exp.setPrefs({ appearanceGradients: e.target.checked })}
          />
          <span>
            <span className="block text-[13px] font-medium text-[var(--workspace-fg)]">
              {t("prefs.meshGradients")}
            </span>
            <span className="workspace-pref-secondary mt-0.5 block text-[12px]">
              {t("prefs.meshGradientsHint")}
            </span>
          </span>
        </label>

        <div id="workspace-surface" className="scroll-mt-24">
          <label
            htmlFor="workspace-surface-material"
            className="text-[12px] font-medium text-[var(--workspace-fg)]"
          >
            {t("prefs.surfaceMaterialLabel")}
          </label>
          <p className="workspace-pref-secondary mt-1.5 max-w-xl text-[12px] leading-relaxed">
            {t("prefs.surfaceMaterialHint")}
          </p>
          <select
            id="workspace-surface-material"
            value={resolveWorkspaceSurfaceMaterial(exp.prefs.surfaceMaterial)}
            onChange={(e) =>
              exp.setPrefs({
                surfaceMaterial: e.target.value as WorkspaceSurfaceMaterialId,
              })
            }
            className="mt-2 w-full max-w-md rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[13px] text-[var(--workspace-fg)] focus:border-[var(--workspace-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/15"
          >
            {WORKSPACE_SURFACE_MATERIAL_IDS.map((id) => (
              <option key={id} value={id}>
                {id === "liquid"
                  ? t("prefs.surfaceLiquid")
                  : id === "standard"
                    ? t("prefs.surfaceStandard")
                    : t("prefs.surfaceFlat")}
              </option>
            ))}
          </select>
        </div>

        <hr className="border-[var(--workspace-border)]" />

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[var(--workspace-border)]"
            checked={Boolean(exp.prefs.compact)}
            onChange={(e) => exp.setPrefs({ compact: e.target.checked })}
          />
          <span>
            <span className="block text-[13px] font-medium text-[var(--workspace-fg)]">{t("prefs.compact")}</span>
            <span className="workspace-pref-secondary mt-0.5 block text-[12px]">
              {t("prefs.compactHint")}
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[var(--workspace-border)]"
            checked={Boolean(exp.prefs.focusMode)}
            onChange={(e) => exp.setPrefs({ focusMode: e.target.checked })}
          />
          <span>
            <span className="block text-[13px] font-medium text-[var(--workspace-fg)]">{t("prefs.focus")}</span>
            <span className="workspace-pref-secondary mt-0.5 block text-[12px]">
              {t("prefs.focusHint")}
            </span>
          </span>
        </label>

        {user?.id ? (
          <p className="workspace-pref-secondary text-[11px]">{t("prefs.signedInSync")}</p>
        ) : null}
      </div>
    </section>
  );
}
