/**
 * Executive brief — plain language for non-technical readers.
 * Shown at /docs/ceo-brief (signed-in workspace).
 */

import { POSITIONING_WEDGE } from "@/lib/positioning-wedge";
import { PRODUCT_ROADMAP } from "@/lib/product-truth";

export const CEO_BRIEF = {
  title: "Executive brief",
  subtitle:
    "A short read: what Route5 does for your team, what it does not do, and how to try it without jargon.",
  sections: [
    {
      heading: "Who we built for first",
      body: `We focus first on people who own **follow-through** — ${POSITIONING_WEDGE.buyerRoles.join(
        "; "
      )}. Route5 is the **${POSITIONING_WEDGE.label.toLowerCase()}**: what was promised, who owns it, and a record you can audit — ${POSITIONING_WEDGE.qualityBar.toLowerCase()}`,
    },
    {
      heading: "The problem",
      body:
        "Important work still arrives as long emails, meeting notes, and chat threads. The usual failure is not ‘we need a summary’ — it is **follow-through**: nobody clearly owns the next step, and **commitments get lost** between meetings.",
    },
    {
      heading: "What Route5 does",
      body:
        "It is a **workspace built around projects**. You paste messy text (or pull it in where connections exist), run **one step** to turn it into **what is wrong, what to do next, and checkboxes for owners**. That work **stays saved** under each project — it does not vanish like a chat scroll. You can see **what is done and what is still open** in one place.",
    },
    {
      heading: "What Route5 does not do",
      body:
        "It does not run your business for you. It is not a full replacement for your CRM, ticketing, or email — think of it as a **clear layer on top of messy text** so commitments become visible. **Optional AI** helps structure the text faster; if AI is not enabled, you still get an organized layout that is **clearly labeled** so nobody mistakes it for magic.",
    },
    {
      heading: "Why this is different from a chat app",
      body:
        "Chat is for conversation. Route5 is for **commitments you can track**: who owes what, what was decided, and **a record you can point to** when someone asks, ‘What did we agree to?’",
    },
    {
      heading: "How to pilot it (about 30 days)",
      body:
        "Pick **one real program or client**. Choose **one simple measure of success** — for example: no important commitment sits more than two weeks without a named owner, or you can answer ‘what did we promise?’ in minutes instead of hours. Use Route5 on real work for **a few weeks**, then look at **open items and completion** on the overview.",
    },
    {
      heading: "Straight answers on scope",
      body:
        "Links to tools like Linear or GitHub work **as described inside the app** — live connections need the right setup on your side. **Privacy and security** follow your hosting and sign-in choices; we do not claim audits or certifications your deployment has not actually completed.",
    },
    {
      heading: "What we do not promise (roadmap talk only)",
      body: `These are **directions**, not closing scope until they appear in the app: ${PRODUCT_ROADMAP.join(
        "; "
      )}. Compare with **What we ship** (Guides or /product) for live product.`,
    },
  ] as const,
} as const;
