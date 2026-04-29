# Route5 — product & engineering overview

Route5 is a **B2B operations and execution workspace** that connects commitments, integrations, and team visibility. It is built as a **Next.js App Router** application with **Clerk** authentication (including organizations), **Supabase** for realtime and data, and deployment on **Vercel**.

## What we ship

### Workspace shell

- **Workspace layout** with command-style navigation, density and theme preferences, and a persistent **top toolbar** (brand, search, home / agent / history, actions menu, notifications, customize, help, **Clerk `UserButton`**).
- **Mobile sidebar** and responsive patterns for field use.
- **Internationalization** with English base strings and locale overlays (e.g. Spanish via `es-fill.json`).

### Command center & dashboards

- **Lead / admin dashboard** (`Route5AdminDashboard`) with hero summary, escalated action queue preview, and modular sections: attention, **health trend chart** (14-day series with carry-forward from snapshots), **“See who needs backup”** (owners with overdue or at-risk work, **Clerk profile photos** from `/api/workspace/collaborators`), operations (escalations), and recent activity.
- **Employee preview** lens for IC-style viewing with **Welcome** hero and **`EmployeePreviewPanel`** (my commitments, due language, updates).
- **Executive** and **velocity** style views where applicable, plus PDF export hooks from shared **dashboard compute** (`compute.ts`).

### Commitments & execution

- **Org commitments** model (statuses, deadlines, owners) with health scoring aligned to **execution health** utilities.
- **Escalations**, **agent** commitment-ops preview and execution flows, **cron** jobs for snapshots, digests, and integrations.
- **Org commitment tracker**, weekly executive summary, and related reporting paths.

### Integrations

- Connectors and webhooks for **Slack**, **Gmail**, **Notion**, **Linear**, **Teams**, **Zoom**, and more; review queues and OAuth-style flows where required.
- **Chat**, **capture/desk**, **feed**, and **notifications** services for operational communication.

### Platform & quality

- **Fluid / Node** API routes, structured **env** patterns, and **Electron** packaging hooks for a desktop client.
- **Security-minded** defaults (headers, CSP-related choices, audit logging surfaces).

## Tech stack (high level)

| Area        | Choice                          |
|------------|----------------------------------|
| Framework  | Next.js (App Router)             |
| Auth       | Clerk (users, orgs, `UserButton`) |
| Database   | Supabase (client + migrations)  |
| Styling    | Tailwind CSS, Framer Motion      |
| Charts     | Recharts                         |
| Deploy     | Vercel                           |

## Repository layout ( pointers )

- `src/app/(app)/` — signed-in app routes and API route handlers.
- `src/components/workspace/` — workspace UI (toolbar, layout, dashboard, panels).
- `src/lib/dashboard/` — metrics, compute, exports.
- `src/lib/i18n/` — message packs and translations.

This document is meant as a **portfolio-friendly summary** of scope; for exact APIs and schemas, follow the code and `supabase/migrations/`.
