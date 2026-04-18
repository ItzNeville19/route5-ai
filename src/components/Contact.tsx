"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { defaultTransition, inViewOpts } from "@/lib/motion";
import { CONTACT_EMAIL, mailtoHref } from "@/lib/site";

const proofPoints = [
  "30-minute intro call",
  "Live workspace walkthrough",
  "Written next step within 48 hours when applicable",
  "No commitment to continue",
];

const teamSizes = ["1–10", "11–50", "51–200", "201–1,000", "1,000+"];

const useCases = [
  "Structured decision capture from text",
  "Roadmap: legacy connectors",
  "Roadmap: generated APIs / MCP",
  "Roadmap: parity validation",
  "Other",
];

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#0071e3] focus:outline-none text-[15px] text-white placeholder:text-[#6e6e73] transition-colors tracking-[-0.01em]";

const selectClass =
  "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#0071e3] focus:outline-none text-[15px] text-white transition-colors appearance-none cursor-pointer tracking-[-0.01em]";

export default function Contact() {
  const ref = useRef(null);
  const inView = useInView(ref, inViewOpts);

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

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
    window.location.assign(url);
    setSubmitted(true);
  };

  return (
    <section id="contact" ref={ref} className="section-dark py-28 lg:py-36 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0071e3]/5 via-transparent to-transparent pointer-events-none" />

      <div className="container-apple relative z-10">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-16 lg:gap-20 items-start">
          {/* Left: Sidebar */}
          <motion.div
            initial={{ opacity: 1, y: 24 }}
            animate={{ opacity: 1, y: inView ? 0 : 24 }}
            transition={defaultTransition}
            className="lg:sticky lg:top-28"
          >
            <h2 className="section-headline text-white mb-6">
              Book.
            </h2>

            {/* Proof points */}
            <div className="space-y-4 mb-12">
              {proofPoints.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#0071e3] flex items-center justify-center flex-shrink-0 mt-0.5">
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
                  <span className="text-[15px] text-[#a1a1a6] leading-snug tracking-[-0.01em]">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* Contact info */}
            <div className="space-y-6 pt-8 border-t border-white/10">
              <div>
                <p className="label-text text-[#6e6e73] mb-2">Direct</p>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={mailtoHref("Route5 — conversation")}
                    className="text-[17px] text-[#0071e3] hover:text-[#0077ed] transition-colors tracking-[-0.022em] font-semibold"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      void navigator.clipboard.writeText(CONTACT_EMAIL)
                    }
                    className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white/70 transition hover:border-white/25 hover:text-white"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="pt-6 border-t border-white/10 flex gap-4">
                <a
                  href="/privacy"
                  className="text-[13px] text-[#6e6e73] hover:text-white transition-colors"
                >
                  Privacy Policy
                </a>
                <span className="text-white/10">•</span>
                <a
                  href="/terms"
                  className="text-[13px] text-[#6e6e73] hover:text-white transition-colors"
                >
                  Terms
                </a>
              </div>
            </div>
          </motion.div>

          {/* Right: Form */}
          <motion.div
            initial={{ opacity: 1, y: 24 }}
            animate={{ opacity: 1, y: inView ? 0 : 24 }}
            transition={{ ...defaultTransition, delay: 0.12 }}
          >
            {submitted ? (
              <div className="rounded-2xl backdrop-blur-sm border border-white/10 bg-white/[0.03] p-14 text-center">
                <div className="w-16 h-16 rounded-full bg-[#0071e3]/20 flex items-center justify-center mx-auto mb-6">
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
                <h3 className="text-[24px] font-semibold text-white tracking-[-0.022em] mb-3">
                  Request Received
                </h3>
                <p className="text-[15px] text-[#a1a1a6] leading-relaxed max-w-sm mx-auto tracking-[-0.01em]">
                  Your email app should open with this message addressed to {CONTACT_EMAIL}. If
                  nothing opened, use the address above or the Copy button — some browsers block
                  mailto links until you allow pop-ups for this site.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl backdrop-blur-sm border border-white/10 bg-white/[0.03] p-10 space-y-6"
              >
                {/* Name + Email */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-white mb-2 tracking-[-0.01em]">
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
                    <label className="block text-[12px] font-semibold text-white mb-2 tracking-[-0.01em]">
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

                {/* Company */}
                <div>
                  <label className="block text-[12px] font-semibold text-white mb-2 tracking-[-0.01em]">
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

                {/* Role + Team Size */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-white mb-2 tracking-[-0.01em]">
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
                    <label className="block text-[12px] font-semibold text-white mb-2 tracking-[-0.01em]">
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

                {/* Use Case */}
                <div>
                  <label className="block text-[12px] font-semibold text-white mb-2 tracking-[-0.01em]">
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

                {/* Message */}
                <div>
                  <label className="block text-[12px] font-semibold text-white mb-2 tracking-[-0.01em]">
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Tell us about your legacy system..."
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="btn-shine w-full py-3.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[17px] font-semibold rounded-xl transition-colors duration-200 tracking-[-0.022em] relative overflow-hidden"
                >
                  Open email to send
                </button>

                <p className="text-[12px] text-[#6e6e73] text-center leading-relaxed">
                  By submitting, you agree to our{" "}
                  <a href="/privacy" className="text-[#0071e3] hover:underline">
                    Privacy Policy
                  </a>
                  {" "}and{" "}
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
    </section>
  );
}
