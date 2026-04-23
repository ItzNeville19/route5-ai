# Route5

**Execution layer for enterprise teams** — decisions become owned commitments with owners, deadlines, and accountability state across projects. Live site: [route5ai.vercel.app](https://route5ai.vercel.app). What ships today vs roadmap (honest scope): [`/product`](https://route5ai.vercel.app/product). Deeper walkthrough without signing in: [`/docs`](https://route5ai.vercel.app/docs). Security and procurement: [`/trust`](https://route5ai.vercel.app/trust).

Stack: Next.js (App Router), Clerk, Supabase, Stripe, optional OpenAI for structured capture.

> **YC / investors:** Admission and funding depend on your team, traction, and how you explain the problem in the application and interview — not on README copy. This repository is the product; put your real metrics and users in the [YC application](https://www.ycombinator.com/apply). The canonical narrative without inflated claims is in [`src/lib/product-truth.ts`](src/lib/product-truth.ts).

---

## Route 5 app (Clerk + Supabase + OpenAI)

1. Copy `.env.example` to `.env.local` and set **Clerk**, **OpenAI**, and **Supabase** variables (see comments in `.env.example`).
2. In [Supabase](https://supabase.com) SQL Editor, run migrations **in order** (include org commitments, escalations, and integrations as your product version requires):
   - [`supabase/migrations/001_route5_mvp.sql`](supabase/migrations/001_route5_mvp.sql)
   - [`supabase/migrations/002_project_icon_emoji.sql`](supabase/migrations/002_project_icon_emoji.sql)
   - [`supabase/migrations/003_extraction_problem_solution.sql`](supabase/migrations/003_extraction_problem_solution.sql) (structured pass fields: problem, path, open questions)
   - …through Phase 1 org bridge, commitments, dashboard, escalations, [`009_integrations.sql`](supabase/migrations/009_integrations.sql) (Slack OAuth storage), [`010_gmail.sql`](supabase/migrations/010_gmail.sql) (Gmail capture + watch), [`011_notion.sql`](supabase/migrations/011_notion.sql) (Notion capture + watched DBs + sync log), and [`012_billing.sql`](supabase/migrations/012_billing.sql) (Stripe subscriptions, invoices, usage; service role only).
3. In Clerk, allow your production URL (and `http://localhost:3000` for dev) under **Domains**.
4. Run `npm run launch-check` locally before shipping (lint, theme audit, production build).
5. Deploy to Vercel (or your host) and add the same env vars in project settings (never commit secrets).
6. Signed-in workspace docs live under `/docs` (e.g. **Executive brief**, **Sales playbook**, **Product**).

### Local development

```bash
npm install
cp .env.example .env.local   # add Clerk, Supabase, etc.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Clerk keys, marketing pages work; signed-in routes show a clear “configure Clerk” message instead of crashing the build.

If the browser shows **connection refused**, the dev server is not listening—run `npm run dev` from the repo root and wait for “Ready”, or free port 3000 if another process is using it (`lsof -i :3000`).

### Vercel: Hobby vs scheduled crons

- The committed **`vercel.json`** uses **`"crons": []`** so deploys work on the **Vercel Hobby** plan (Hobby does not allow multi-day / high-frequency cron expressions).
- After upgrading to **Pro**, restore full schedules by replacing the `crons` array with the contents of [`vercel.crons.pro.json`](vercel.crons.pro.json), or run external schedulers (e.g. GitHub Actions) that `GET` your `/api/cron/*` routes with the `CRON_SECRET` header.

## Slack app setup (Phase 4)

Configure a Slack app at [api.slack.com/apps](https://api.slack.com/apps) for OAuth, Events, slash commands, and interactivity.

1. **Create app** → **From scratch**, pick your workspace.
2. **OAuth & Permissions** → **Redirect URLs**: add `{APP_URL}/api/integrations/slack/callback` (use your production or `http://localhost:3000` for dev).
3. **Scopes** → **Bot Token Scopes** (OAuth install):  
   `channels:history`, `channels:read`, `groups:history`, `groups:read`, `im:read`, `mpim:read`, `users:read`, `users:read.email`, `chat:write`, `commands`, `incoming-webhook`.
4. **Event Subscriptions** → Enable events → **Request URL**: `{APP_URL}/api/integrations/slack/events` (must respond to the URL challenge).  
   Subscribe to **bot events**: `message.channels`, `message.groups`.
5. **Slash Commands** → Create `/route5` with **Request URL** `{APP_URL}/api/integrations/slack/command`.
6. **Interactivity & Shortcuts** → **Request URL** `{APP_URL}/api/integrations/slack/interactions`.
7. **Install app** to your workspace after setting env vars.

**Required env vars** (see `.env.example`): `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`. Optional: `SLACK_BOT_TOKEN`, `OPENAI_API_KEY`, `INTEGRATIONS_ENCRYPTION_KEY`, `CRON_SECRET` (for `/api/cron/slack-digest` and other crons).

After deploy, users connect from **Workspace → Integrations** (`/workspace/integrations`).

## Gmail + Google Cloud setup (Phase 4)

1. In [Google Cloud Console](https://console.cloud.google.com), create a project (or pick one).
2. **APIs & Services** → **Enable APIs**: **Gmail API**, **Google Pub/Sub API**.
3. **Credentials** → **Create credentials** → **OAuth client ID** → **Web application**.  
   Add **Authorized redirect URI**: `{APP_URL}/api/integrations/gmail/callback`.
4. **Pub/Sub** → **Topics** → Create topic `route5-gmail-push` (or your name). Note the full resource name: `projects/<PROJECT_ID>/topics/<TOPIC_NAME>`.
5. **Subscriptions** → **Create subscription** → **Push** → endpoint `{APP_URL}/api/integrations/gmail/push` (optionally append `?token=<GOOGLE_PUBSUB_VERIFICATION_TOKEN>` if you use query auth). Set a verification token in env and configure your subscription to send `Authorization: Bearer <token>` if supported, or rely on the same token check in the handler.
6. Grant **publish** on the topic to Google’s Gmail push service account: add principal `gmail-api-push@system.gserviceaccount.com` with role **Pub/Sub Publisher** on the topic (per [Gmail push](https://developers.google.com/gmail/api/guides/push)).
7. OAuth **scopes** (app requests these): Gmail readonly/send, **Google Calendar events** (`calendar.events`), and **Google Meet** readonly (`meetings.space.readonly`) for Meet hooks and deadline sync.
8. **Google Workspace Events API** (Meet): enable **Workspace Events API** in the same project. Create a **second** Pub/Sub topic (e.g. `route5-meet-events`) and grant **Pub/Sub Publisher** to `meet-api-event-push@system.gserviceaccount.com` on that topic. Set `GOOGLE_WORKSPACE_EVENTS_PUBSUB_TOPIC` to the full topic name. Add a **push** subscription on that topic to `{APP_URL}/api/integrations/gmeet/push` (same verification token pattern as Gmail push). After Gmail OAuth, Route5 creates a Workspace Events subscription that delivers Meet transcript events to that topic. Renewals run with `/api/cron/gmail-watch-renew`.

**Required env vars** (see `.env.example`): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_PUBSUB_TOPIC` (full `projects/.../topics/...` name), `GOOGLE_PUBSUB_VERIFICATION_TOKEN`. Also `OPENAI_API_KEY`, `INTEGRATIONS_ENCRYPTION_KEY`, `CRON_SECRET` (for `/api/cron/gmail-watch-renew` and `/api/cron/weekly-summary`). Optional: `ROUTE5_EXECUTIVE_EMAILS` (comma-separated) to add recipients for the Monday executive summary alongside org admins from `ESCALATION_ADMIN_EMAILS` / org owner. Optional: `GOOGLE_WORKSPACE_EVENTS_PUBSUB_TOPIC` for Meet transcript delivery via Pub/Sub.

## Zoom integration

1. Create an app at [marketplace.zoom.us](https://marketplace.zoom.us) → **OAuth** app.
2. Add redirect URI: `{APP_URL}/api/integrations/zoom/callback`.
3. Subscribe to app scopes: **meeting:read**, **recording:read**, **user:read** (adjust to match your Zoom app settings).
4. Enable **Event Subscriptions** and add endpoint `{APP_URL}/api/integrations/zoom/webhook`. Subscribe to **recording.transcript_completed** (or equivalent transcript event for your account type).
5. Set **Webhook Secret Token** in the Zoom app and copy it to `ZOOM_WEBHOOK_SECRET_TOKEN`.

**Required env vars**: `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_WEBHOOK_SECRET_TOKEN`.

## Microsoft Teams integration

1. Register an app in [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**.
2. **API permissions** → **Microsoft Graph** → **Delegated**: `ChannelMessage.Read.All`, `User.Read`, `Team.ReadBasic.All`, `Calendars.ReadWrite`, plus **offline_access** for refresh tokens. Grant admin consent if required.
3. **Authentication** → add redirect URI: `{APP_URL}/api/integrations/teams/callback`.
4. Create a **Client secret** and set `TEAMS_CLIENT_ID`, `TEAMS_CLIENT_SECRET`, `TEAMS_TENANT_ID` (use `common` or `organizations` for multi-tenant if preferred).
5. Set `TEAMS_GRAPH_SUBSCRIPTION_SECRET` to a long random string; Route5 sends it as **clientState** on Graph subscriptions and validates incoming webhooks.

**Required env vars**: `TEAMS_CLIENT_ID`, `TEAMS_CLIENT_SECRET`, `TEAMS_TENANT_ID`, `TEAMS_GRAPH_SUBSCRIPTION_SECRET`.

Graph subscriptions are renewed on a schedule via `/api/cron/teams-subscription-renew` (every 2 days in `vercel.json`; protect with `CRON_SECRET` in production).

## Notion integration (Phase 4)

1. Open [notion.so/my-integrations](https://www.notion.so/my-integrations) (Notion **Creator dashboard**) and create a **public** integration.
2. Under **OAuth** → add redirect URI: `{APP_URL}/api/integrations/notion/callback`.
3. Enable capabilities: **Read content**, **Insert content**, **Update content** (so Route5 can read databases/pages, add comments, and update status when a commitment completes).
4. Copy **OAuth client ID** and **client secret** into `NOTION_CLIENT_ID` and `NOTION_CLIENT_SECRET`.
5. After a user connects, they must **share** each target database with the integration (Notion → database → **•••** → **Connections** / **Add connections**).

Polling uses `/api/cron/notion-poll` every 15 minutes (`CRON_SECRET` in production). Users can watch or unwatch databases under **Workspace → Integrations**.

**Required env vars**: `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`. Optional: `NOTION_API_VERSION` (defaults to `2022-06-28`), `NOTION_OAUTH_STATE_SECRET` (defaults to other integration secrets).

## Stripe billing (Phase 11)

1. Create a [Stripe](https://stripe.com) account.
2. In the Stripe Dashboard, create **three products** (Starter and Growth with recurring prices; Enterprise is sales-led only):
   - **Starter**: **$299/month** and **$2,990/year** (about 20% savings vs paying monthly).
   - **Growth**: **$799/month** and **$7,990/year** (about 20% savings vs paying monthly).
   - **Enterprise**: no Stripe product required — customers contact sales.
3. Copy each **Price ID** into the corresponding env vars (monthly vs annual for Starter and Growth).
4. **Developers** → **Webhooks** → **Add endpoint**: `{APP_URL}/api/billing/webhook` (use your production URL or `http://localhost:3000` with the Stripe CLI for local testing).
5. Subscribe the endpoint to at least: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.trial_will_end`.
6. Set **billing emails** with [Resend](https://resend.com): `RESEND_API_KEY` and a verified `RESEND_FROM` domain in production.

**Required env vars** (see `.env.example`): `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_STARTER_MONTHLY_PRICE_ID`, `STRIPE_STARTER_ANNUAL_PRICE_ID`, `STRIPE_GROWTH_MONTHLY_PRICE_ID`, `STRIPE_GROWTH_ANNUAL_PRICE_ID`.

Workspace UI: **Workspace → Billing** (`/workspace/billing`) for plan, usage, invoices, Stripe Checkout, and the Stripe Customer Portal. Plan limits are enforced on org commitments, integrations, dashboard PDF export, and seat checks for invites.
