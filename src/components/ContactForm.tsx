"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Check, Copy, Loader2 } from "lucide-react";
import { defaultTransition, inViewOpts } from "@/lib/motion";
import { copyToClipboard } from "@/lib/clipboard";
import { CONTACT_EMAIL, mailtoHref } from "@/lib/site";

const proofPoints = [
  "30-minute intro call",
  "Live workspace walkthrough",
  "Written next step within 48 hours when applicable",
  "No commitment to continue",
];

const teamSizes = ["1–10", "11–50", "51–200", "201–1,000", "1,000+"];

const useCases = [
  "Structured extraction from text",
  "Roadmap: legacy connectors",
  "Roadmap: generated APIs / MCP",
  "Roadmap: parity validation",
  "Other",
];

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-white/90 border border-black/[0.08] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] text-[15px] text-[#1d1d1f] placeholder:text-[#a1a1a6] transition-colors tracking-[-0.01em]";

const selectClass =
  "w-full px-4 py-3 rounded-xl bg-white/90 border border-black/[0.08] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] text-[15px] text-[#1d1d1f] transition-colors appearance-none cursor-pointer tracking-[-0.01em]";

export default function ContactForm() {
  const ref = useRef(null);
  const inView = useInView(ref, inViewOpts);

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlHydratedRef = useRef(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    teamSize: "",
    useCase: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors((p) => ({ ...p, [e.target.name]: "" }));
    }
  };

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  /** Marketplace / campaign deep links: `/contact?topic=integration&app=Slack` */
  useEffect(() => {
    if (urlHydratedRef.current || typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const app = p.get("app")?.trim();
    const topic = p.get("topic")?.trim();
    if (!app && !topic) return;
    urlHydratedRef.current = true;
    setForm((prev) => {
      const next = { ...prev };
      if (app) {
        const line =
          topic === "integration"
            ? `Integration interest: ${app}`
            : `Inquiry: ${app}${topic ? ` (${topic})` : ""}`;
        next.message = prev.message.trim() ? `${prev.message}\n\n${line}` : line;
      }
      if (topic === "integration" && !next.useCase) {
        next.useCase = "Other";
      }
      return next;
    });
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = "Full name is required";
    if (!form.email.trim()) newErrors.email = "Work email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Please enter a valid email";
    if (!form.company.trim()) newErrors.company = "Company is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleCopyEmail() {
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    const ok = await copyToClipboard(CONTACT_EMAIL);
    if (ok) {
      flushSync(() => setCopyStatus("copied"));
      copyResetRef.current = setTimeout(() => setCopyStatus("idle"), 2800);
    } else {
      flushSync(() => setCopyStatus("error"));
      copyResetRef.current = setTimeout(() => setCopyStatus("idle"), 4500);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));

    const subject = `Route5 inquiry — ${form.company}`;
    const body = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      `Company: ${form.company}`,
      form.role.trim() ? `Role: ${form.role}` : null,
      form.teamSize ? `Team size: ${form.teamSize}` : null,
      form.useCase ? `Use case: ${form.useCase}` : null,
      "",
      form.message.trim() || "(No additional message)",
    ]
      .filter((line) => line != null && line !== "")
      .join("\n");

    const url = mailtoHref(subject, body);
    window.location.href = url;
    setSubmitted(true);
    setIsSubmitting(false);
  };

  return (
    <div ref={ref} className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0071e3]/6 via-transparent to-[#a78bfa]/10" />

      <div className="container-apple relative z-10">
        <div className="grid items-start gap-16 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <motion.div
            initial={{ opacity: 1, y: 24 }}
            animate={{ opacity: 1, y: inView ? 0 : 24 }}
            transition={defaultTransition}
            className="lg:sticky lg:top-28"
          >
            <h1 className="section-headline mb-4 text-[#1d1d1f]">Contact</h1>
            <p className="body-copy mb-8 max-w-md text-[#6e6e73]">
              Tell us about your team and priorities. We&apos;ll follow up by email.
            </p>

            <div className="mb-12 space-y-4">
              {proofPoints.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#0071e3]">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5l2 2 4-4"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="text-[15px] leading-snug tracking-[-0.01em] text-[#6e6e73]">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-6 border-t border-black/[0.08] pt-8">
              <div>
                <p className="label-text mb-2 text-[#86868b]">Direct</p>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={mailtoHref("Route5 — conversation")}
                    className="rounded-md text-[17px] font-semibold tracking-[-0.022em] text-[#0071e3] outline-offset-2 transition-colors hover:text-[#0077ed] active:scale-[0.98]"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => void handleCopyEmail()}
                    className={`inline-flex min-h-[36px] min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold shadow-sm transition hover:bg-white active:bg-[#f5f5f7] disabled:opacity-60 ${
                      copyStatus === "copied"
                        ? "border-emerald-500/50 bg-emerald-50/95 text-emerald-900 ring-2 ring-emerald-400/35"
                        : copyStatus === "error"
                          ? "border-amber-400/60 bg-amber-50/90 text-amber-950 ring-1 ring-amber-300/40"
                          : "border-black/[0.1] bg-white/80 text-[#1d1d1f] hover:border-[#0071e3]/35"
                    }`}
                    aria-describedby="copy-email-status"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {copyStatus === "copied" ? (
                        <motion.span
                          key="ok"
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-1 text-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          Copied
                        </motion.span>
                      ) : (
                        <motion.span
                          key="copy"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-1 text-[#6e6e73]"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden />
                          Copy
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
                <p
                  id="copy-email-status"
                  role="status"
                  aria-live="polite"
                  className="mt-2 min-h-[1.25rem] text-[12px] font-medium"
                >
                  {copyStatus === "error" ? (
                    <span className="text-amber-800">
                      Couldn&apos;t copy — select the address or try another browser.
                    </span>
                  ) : copyStatus === "copied" ? (
                    <span className="text-emerald-700">Address copied to clipboard.</span>
                  ) : (
                    <span className="text-[#86868b]">&nbsp;</span>
                  )}
                </p>
              </div>
              <div className="flex gap-4 border-t border-black/[0.08] pt-6">
                <a
                  href="/privacy"
                  className="text-[13px] text-[#6e6e73] transition-colors hover:text-[#1d1d1f]"
                >
                  Privacy Policy
                </a>
                <span className="text-black/15">•</span>
                <a
                  href="/terms"
                  className="text-[13px] text-[#6e6e73] transition-colors hover:text-[#1d1d1f]"
                >
                  Terms
                </a>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 1, y: 24 }}
            animate={{ opacity: 1, y: inView ? 0 : 24 }}
            transition={{ ...defaultTransition, delay: 0.12 }}
          >
            {submitted ? (
              <div className="glass-liquid rounded-2xl p-14 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#0071e3]/15">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path
                      d="M6 14l5 5 11-11"
                      stroke="#0071e3"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h2 className="mb-3 text-[24px] font-semibold tracking-[-0.022em] text-[#1d1d1f]">
                  Request received
                </h2>
                <p className="mx-auto max-w-sm text-[15px] leading-relaxed tracking-[-0.01em] text-[#6e6e73]">
                  Your email app should open with this message addressed to {CONTACT_EMAIL}. If
                  nothing opened, use the address above or the Copy button — some browsers block
                  mailto links until you allow pop-ups for this site.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="glass-liquid space-y-6 rounded-2xl p-10"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-[12px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
                      Full Name *
                    </label>
                    <input
                      required
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Jane Smith"
                      className={inputClass}
                    />
                    {errors.name && (
                      <p className="text-[12px] text-red-400 mt-1">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-[12px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
                      Work Email *
                    </label>
                    <input
                      required
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="jane@company.com"
                      className={inputClass}
                    />
                    {errors.email && (
                      <p className="text-[12px] text-red-400 mt-1">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
                    Company *
                  </label>
                  <input
                    required
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    placeholder="Acme Financial Group"
                    className={inputClass}
                  />
                  {errors.company && (
                    <p className="text-[12px] text-red-400 mt-1">{errors.company}</p>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-[12px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
                      Role / Title
                    </label>
                    <input
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      placeholder="e.g. VP Engineering"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[12px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
                      Team Size
                    </label>
                    <select
                      name="teamSize"
                      value={form.teamSize}
                      onChange={handleChange}
                      className={selectClass}
                    >
                      <option value="">Select size</option>
                      {teamSizes.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
                    Primary Use Case
                  </label>
                  <select
                    name="useCase"
                    value={form.useCase}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="">Select your use case</option>
                    {useCases.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Context for your team…"
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileTap={{ scale: isSubmitting ? 1 : 0.99 }}
                  className="btn-shine relative flex w-full items-center justify-center gap-2 rounded-xl bg-[#0071e3] py-3.5 text-[17px] font-semibold tracking-[-0.022em] text-white shadow-md shadow-[#0071e3]/25 transition-colors duration-200 hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-85"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      <span>Opening mail…</span>
                    </>
                  ) : (
                    "Open email to send"
                  )}
                </motion.button>

                <p className="text-[12px] text-[#6e6e73] text-center leading-relaxed">
                  By submitting, you agree to our{" "}
                  <a href="/privacy" className="text-[#0071e3] hover:underline">
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a href="/terms" className="text-[#0071e3] hover:underline">
                    Terms of Service
                  </a>
                  . We will not share your information with third parties.
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
