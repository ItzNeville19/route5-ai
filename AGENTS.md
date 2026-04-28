<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Workspace UI

Signed-in routes under `(app)` use **`WorkspaceLayout`** (command shell). The main operational home is **`/workspace/dashboard`** (`Route5AdminDashboard` + `WelcomeHeroCard`). Preferences persist via **`WorkspaceExperienceProvider`** / `src/lib/workspace-prefs.ts` and **`POST /api/workspace/prefs`**. Do not reintroduce removed **`AdminCommandCenter`** — extend **`Route5AdminDashboard`** instead.
