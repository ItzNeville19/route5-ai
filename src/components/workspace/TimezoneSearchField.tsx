"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  formatGmtOffsetLabel,
  formatTimezonePickerPrimary,
  formatTimezonePickerSecondary,
  getAllIanaTimezones,
  getSuggestedTimezoneOrder,
  normalizeLegacyIana,
} from "@/lib/iana-timezones";
import { getTimezoneSearchBlob, warmTimezoneSearchBlobs } from "@/lib/timezone-search-blobs";

function filterAndRankTimezones(
  zones: readonly string[],
  blobMap: Map<string, string>,
  query: string
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    const suggested = getSuggestedTimezoneOrder();
    const set = new Set(zones);
    const head = suggested.filter((z) => set.has(z));
    const headSet = new Set(head);
    const rest = zones.filter((z) => !headSet.has(z));
    return [...head, ...rest].slice(0, 100);
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: { z: string; s: number }[] = [];
  for (const z of zones) {
    const blob = blobMap.get(z) ?? getTimezoneSearchBlob(z);
    if (!tokens.every((t) => blob.includes(t))) continue;
    let s = 0;
    const zl = z.toLowerCase();
    if (zl === q) s += 200;
    else if (zl.startsWith(q)) s += 120;
    else if (blob.startsWith(q)) s += 60;
    const city = formatTimezonePickerPrimary(z).toLowerCase();
    if (city.startsWith(q)) s += 40;
    s += tokens.length * 3;
    scored.push({ z, s });
  }
  scored.sort((a, b) => b.s - a.s || a.z.localeCompare(b.z));
  return scored.map((x) => x.z).slice(0, 150);
}

type TimezoneSearchFieldProps = {
  id: string;
  value: string;
  onChange: (iana: string) => void;
  placeholder: string;
  hint: string;
  moreLabel: string;
};

export default function TimezoneSearchField({
  id,
  value,
  onChange,
  placeholder,
  hint,
  moreLabel,
}: TimezoneSearchFieldProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const allZones = useMemo(() => {
    const base = getAllIanaTimezones();
    const v = normalizeLegacyIana(value);
    if (v && !base.includes(v)) {
      return [v, ...base];
    }
    return base;
  }, [value]);

  const blobMap = useMemo(() => {
    warmTimezoneSearchBlobs(allZones);
    const m = new Map<string, string>();
    for (const z of allZones) {
      m.set(z, getTimezoneSearchBlob(z));
    }
    return m;
  }, [allZones]);

  const filtered = useMemo(
    () => filterAndRankTimezones(allZones, blobMap, q),
    [allZones, blobMap, q]
  );

  const displayValue = normalizeLegacyIana(value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQ("");
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const pick = useCallback(
    (z: string) => {
      onChange(normalizeLegacyIana(z));
      setOpen(false);
      setQ("");
    },
    [onChange]
  );

  return (
    <div ref={rootRef} className="relative w-full max-w-xl">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-left text-[13px] text-[var(--workspace-fg)] focus:border-[var(--workspace-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/15"
      >
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">{formatTimezonePickerPrimary(displayValue)}</span>
          <span className="workspace-pref-secondary block truncate text-[11px]">
            {formatTimezonePickerSecondary(displayValue)}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--workspace-muted-fg)] transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 z-50 mt-1 max-h-[min(70vh,420px)] overflow-hidden rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] shadow-lg"
          role="presentation"
        >
          <div className="border-b border-[var(--workspace-border)] p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--workspace-fg)]/50"
                aria-hidden
              />
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={placeholder}
                autoComplete="off"
                aria-controls={listId}
                className="w-full rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] py-2 pl-8 pr-3 text-[13px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-[var(--workspace-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/15"
              />
            </div>
            <p className="workspace-pref-secondary mt-1.5 px-1 text-[11px] leading-snug">{hint}</p>
          </div>
          <ul id={listId} role="listbox" className="max-h-[min(52vh,320px)] overflow-y-auto py-1">
            {filtered.map((z) => {
              const primary = formatTimezonePickerPrimary(z);
              const off = formatGmtOffsetLabel(z);
              return (
                <li key={z} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={displayValue === normalizeLegacyIana(z)}
                    onClick={() => pick(z)}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-[13px] text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-nav-hover)]"
                  >
                    <span className="font-medium">{primary}</span>
                    <span className="workspace-pref-secondary text-[11px]">
                      {z}
                      {off ? ` · ${off}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {filtered.length >= 150 ? (
            <p className="workspace-pref-secondary border-t border-[var(--workspace-border)] px-3 py-2 text-[11px]">
              {moreLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
