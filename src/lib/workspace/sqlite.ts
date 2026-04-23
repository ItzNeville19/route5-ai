/**
 * Embedded workspace DB when Supabase env is not set.
 * For serverless hosts without persistent disk, configure Supabase instead.
 */
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import Database from "better-sqlite3";
import type { ActionItemStored } from "@/lib/ai/schema";

let db: Database.Database | null = null;

/** True on Vercel / Lambda-style hosts: avoid WAL (extra -wal/-shm files) and prefer /tmp. */
function isServerlessFilesystem(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/** Writable directory for the SQLite file. Serverless: only /tmp is reliably writable. */
function sqliteDataDir(): string {
  if (isServerlessFilesystem()) {
    return path.join("/tmp", "route5-sqlite");
  }
  return path.join(process.cwd(), "data");
}

function getDb(): Database.Database {
  if (db) return db;
  const dir = sqliteDataDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    console.error("[sqlite] mkdir failed:", dir, e);
    throw e;
  }
  const file = path.join(dir, "route5.sqlite");
  let database: Database.Database;
  try {
    database = new Database(file);
  } catch (e) {
    console.error("[sqlite] Failed to open database file:", file, e);
    throw e;
  }
  database.pragma("foreign_keys = ON");
  /** WAL can fail or behave poorly on ephemeral serverless disks; DELETE is safer there. */
  if (isServerlessFilesystem()) {
    database.pragma("journal_mode = DELETE");
  } else {
    database.pragma("journal_mode = WAL");
  }
  database.pragma("busy_timeout = 8000");
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      clerk_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS extractions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      clerk_user_id TEXT NOT NULL,
      raw_input TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      problem TEXT NOT NULL DEFAULT '',
      solution TEXT NOT NULL DEFAULT '',
      open_questions TEXT NOT NULL DEFAULT '[]',
      decisions TEXT NOT NULL DEFAULT '[]',
      action_items TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_projects_clerk ON projects(clerk_user_id);
    CREATE INDEX IF NOT EXISTS idx_extractions_project ON extractions(project_id);
    CREATE INDEX IF NOT EXISTS idx_extractions_clerk ON extractions(clerk_user_id);
  `);
  const cols = database
    .prepare(`PRAGMA table_info(projects)`)
    .all() as { name: string }[];
  if (!cols.some((c) => c.name === "icon_emoji")) {
    database.exec(`ALTER TABLE projects ADD COLUMN icon_emoji TEXT`);
  }
  const extColNames = () =>
    (database.prepare(`PRAGMA table_info(extractions)`).all() as { name: string }[]).map(
      (c) => c.name
    );
  if (!extColNames().includes("problem")) {
    database.exec(`ALTER TABLE extractions ADD COLUMN problem TEXT NOT NULL DEFAULT ''`);
  }
  if (!extColNames().includes("solution")) {
    database.exec(`ALTER TABLE extractions ADD COLUMN solution TEXT NOT NULL DEFAULT ''`);
  }
  if (!extColNames().includes("open_questions")) {
    database.exec(
      `ALTER TABLE extractions ADD COLUMN open_questions TEXT NOT NULL DEFAULT '[]'`
    );
  }
  database.exec(`
    CREATE TABLE IF NOT EXISTS commitments (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      clerk_user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      owner_user_id TEXT,
      owner_display_name TEXT,
      source TEXT NOT NULL,
      source_reference TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      created_at TEXT NOT NULL,
      due_date TEXT,
      last_updated_at TEXT NOT NULL,
      activity_log TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_commitments_project ON commitments(project_id);
    CREATE INDEX IF NOT EXISTS idx_commitments_clerk ON commitments(clerk_user_id);
  `);
  const commitmentCols = (
    database.prepare(`PRAGMA table_info(commitments)`).all() as { name: string }[]
  ).map((c) => c.name);
  if (!commitmentCols.includes("archived_at")) {
    database.exec(`ALTER TABLE commitments ADD COLUMN archived_at TEXT`);
  }
  database.exec(`
    CREATE TABLE IF NOT EXISTS escalation_events (
      id TEXT PRIMARY KEY,
      clerk_user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      commitment_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      previous_status TEXT,
      new_status TEXT,
      created_at TEXT NOT NULL,
      notified_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_escalation_clerk ON escalation_events(clerk_user_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS integration_oauth_connections (
      id TEXT PRIMARY KEY,
      clerk_user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      team_id TEXT,
      team_name TEXT,
      bot_user_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (clerk_user_id, provider)
    );
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      clerk_user_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT 'Workspace',
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_organizations_clerk ON organizations(clerk_user_id);
    CREATE TABLE IF NOT EXISTS org_members (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'member')),
      invited_by TEXT,
      joined_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (org_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id, status);
    CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id, status);
    CREATE TABLE IF NOT EXISTS org_invitations (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'member')),
      invited_by TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      accepted_at TEXT,
      accepted_by TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_org_invitations_org ON org_invitations(org_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON org_invitations(email, accepted_at);
    CREATE TABLE IF NOT EXISTS project_members (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
      added_by TEXT,
      created_at TEXT NOT NULL,
      UNIQUE (project_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
    CREATE TABLE IF NOT EXISTS chat_channels (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('direct', 'project')),
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_channels_org ON chat_channels(org_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_channels_project ON chat_channels(project_id);
    CREATE TABLE IF NOT EXISTS chat_channel_members (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      last_read_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE (channel_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user ON chat_channel_members(user_id);
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      channel_type TEXT NOT NULL CHECK (channel_type IN ('direct', 'project')),
      channel_id TEXT NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      attachments TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_org ON chat_messages(org_id, created_at DESC);
  `);
  const projCols = database
    .prepare(`PRAGMA table_info(projects)`)
    .all() as { name: string }[];
  if (!projCols.some((c) => c.name === "org_id")) {
    database.exec(`ALTER TABLE projects ADD COLUMN org_id TEXT REFERENCES organizations(id) ON DELETE SET NULL`);
    database.exec(`CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(org_id)`);
  }
  database.exec(`
    CREATE TABLE IF NOT EXISTS org_commitments (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      owner_id TEXT NOT NULL,
      deadline TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      last_activity_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_org_commitments_org ON org_commitments(org_id) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_org_commitments_owner ON org_commitments(owner_id) WHERE deleted_at IS NULL;
    CREATE TABLE IF NOT EXISTS org_commitment_comments (
      id TEXT PRIMARY KEY,
      commitment_id TEXT NOT NULL REFERENCES org_commitments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS org_commitment_attachments (
      id TEXT PRIMARY KEY,
      commitment_id TEXT NOT NULL REFERENCES org_commitments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      storage_kind TEXT NOT NULL DEFAULT 'supabase',
      local_path TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS org_commitment_history (
      id TEXT PRIMARY KEY,
      commitment_id TEXT NOT NULL REFERENCES org_commitments(id) ON DELETE CASCADE,
      changed_by TEXT NOT NULL,
      field_changed TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS org_commitment_dependencies (
      id TEXT PRIMARY KEY,
      commitment_id TEXT NOT NULL REFERENCES org_commitments(id) ON DELETE CASCADE,
      depends_on_commitment_id TEXT NOT NULL REFERENCES org_commitments(id) ON DELETE CASCADE,
      UNIQUE (commitment_id, depends_on_commitment_id),
      CHECK (commitment_id <> depends_on_commitment_id)
    );
    CREATE TABLE IF NOT EXISTS org_escalations (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      commitment_id TEXT NOT NULL REFERENCES org_commitments(id) ON DELETE CASCADE,
      severity TEXT NOT NULL,
      triggered_at TEXT NOT NULL,
      resolved_at TEXT,
      resolved_by TEXT,
      resolution_notes TEXT,
      snoozed_until TEXT,
      snooze_reason TEXT,
      notified_owner_at TEXT,
      notified_manager_at TEXT,
      notified_admin_at TEXT,
      notified_all_admins_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_org_escalations_org ON org_escalations(org_id, triggered_at DESC);
    CREATE INDEX IF NOT EXISTS idx_org_escalations_commitment ON org_escalations(commitment_id);
    CREATE TABLE IF NOT EXISTS org_integrations (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      access_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT,
      team_id TEXT,
      team_name TEXT,
      bot_user_id TEXT,
      webhook_url TEXT,
      scope TEXT,
      status TEXT NOT NULL,
      connected_at TEXT,
      disconnected_at TEXT,
      last_used_at TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (org_id, type)
    );
    CREATE INDEX IF NOT EXISTS idx_org_integrations_org ON org_integrations(org_id);
    CREATE TABLE IF NOT EXISTS slack_captured_messages (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      slack_team_id TEXT NOT NULL,
      slack_channel_id TEXT NOT NULL,
      slack_message_ts TEXT NOT NULL,
      slack_user_id TEXT,
      content TEXT NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0,
      decision_detected INTEGER NOT NULL DEFAULT 0,
      commitment_id TEXT REFERENCES org_commitments(id) ON DELETE SET NULL,
      captured_at TEXT NOT NULL,
      confidence_score REAL,
      decision_text TEXT,
      UNIQUE (slack_team_id, slack_channel_id, slack_message_ts)
    );
    CREATE INDEX IF NOT EXISTS idx_slack_captured_org ON slack_captured_messages(org_id);
    CREATE TABLE IF NOT EXISTS gmail_captured_emails (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      gmail_message_id TEXT NOT NULL UNIQUE,
      gmail_thread_id TEXT NOT NULL,
      from_email TEXT NOT NULL,
      from_name TEXT,
      subject TEXT NOT NULL DEFAULT '',
      body_text TEXT NOT NULL DEFAULT '',
      received_at TEXT NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0,
      decision_detected INTEGER NOT NULL DEFAULT 0,
      commitment_id TEXT REFERENCES org_commitments(id) ON DELETE SET NULL,
      confidence_score REAL,
      decision_text TEXT,
      captured_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_gmail_captured_org ON gmail_captured_emails(org_id, captured_at DESC);
    CREATE TABLE IF NOT EXISTS gmail_watch (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      history_id TEXT NOT NULL,
      expiration TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (org_id)
    );
    CREATE TABLE IF NOT EXISTS notion_captured_pages (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      notion_page_id TEXT NOT NULL UNIQUE,
      notion_database_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      content_text TEXT NOT NULL DEFAULT '',
      page_url TEXT,
      created_time TEXT,
      last_edited_time TEXT,
      processed INTEGER NOT NULL DEFAULT 0,
      decision_detected INTEGER NOT NULL DEFAULT 0,
      commitment_id TEXT REFERENCES org_commitments(id) ON DELETE SET NULL,
      confidence_score REAL,
      decision_text TEXT,
      captured_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notion_captured_org ON notion_captured_pages(org_id, captured_at DESC);
    CREATE TABLE IF NOT EXISTS notion_watched_databases (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      notion_database_id TEXT NOT NULL,
      database_name TEXT,
      database_url TEXT,
      watching INTEGER NOT NULL DEFAULT 1,
      last_cursor TEXT,
      last_polled_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE (org_id, notion_database_id)
    );
    CREATE TABLE IF NOT EXISTS notion_completed_sync (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      commitment_id TEXT NOT NULL REFERENCES org_commitments(id) ON DELETE CASCADE,
      notion_page_id TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'ok'
    );
    CREATE TABLE IF NOT EXISTS org_subscriptions (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
      stripe_customer_id TEXT UNIQUE,
      stripe_subscription_id TEXT UNIQUE,
      plan TEXT NOT NULL,
      status TEXT NOT NULL,
      current_period_start TEXT,
      current_period_end TEXT,
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      cancelled_at TEXT,
      trial_end TEXT,
      seat_count INTEGER NOT NULL DEFAULT 1,
      payment_failed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS org_invoices (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      stripe_invoice_id TEXT NOT NULL UNIQUE,
      stripe_payment_intent_id TEXT,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'usd',
      status TEXT NOT NULL,
      invoice_url TEXT,
      invoice_pdf_url TEXT,
      period_start TEXT,
      period_end TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_org_invoices_org ON org_invoices(org_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS org_usage (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      metric TEXT NOT NULL,
      value INTEGER NOT NULL,
      recorded_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_org_usage_org_metric ON org_usage(org_id, metric, recorded_at DESC);
    CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      id TEXT PRIMARY KEY,
      stripe_event_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS org_notifications (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      metadata TEXT NOT NULL DEFAULT '{}',
      read INTEGER NOT NULL DEFAULT 0,
      read_at TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_org_notifications_user_created ON org_notifications(user_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      in_app INTEGER NOT NULL DEFAULT 1,
      email INTEGER NOT NULL DEFAULT 1,
      slack INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (org_id, user_id, type)
    );
    CREATE INDEX IF NOT EXISTS idx_notification_preferences_org_user ON notification_preferences(org_id, user_id);
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      scopes TEXT NOT NULL DEFAULT '["read"]',
      last_used_at TEXT,
      expires_at TEXT,
      revoked INTEGER NOT NULL DEFAULT 0,
      revoked_at TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);
    CREATE TABLE IF NOT EXISTS webhook_endpoints (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      description TEXT,
      secret TEXT NOT NULL,
      events TEXT NOT NULL DEFAULT '[]',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_org ON webhook_endpoints(org_id);
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      webhook_endpoint_id TEXT NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      response_status INTEGER,
      response_body TEXT,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      delivered_at TEXT,
      failed_at TEXT,
      next_retry_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries(webhook_endpoint_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at);
    CREATE TABLE IF NOT EXISTS execution_snapshots (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      health_score REAL NOT NULL,
      active_count INTEGER NOT NULL,
      on_track_count INTEGER NOT NULL,
      at_risk_count INTEGER NOT NULL,
      overdue_count INTEGER NOT NULL,
      completed_week_count INTEGER NOT NULL,
      completed_month_count INTEGER NOT NULL,
      snapshot_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (org_id, snapshot_date)
    );
    CREATE INDEX IF NOT EXISTS idx_execution_snapshots_org ON execution_snapshots(org_id, snapshot_date DESC);
    CREATE TABLE IF NOT EXISTS zoom_meetings (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      zoom_meeting_id TEXT NOT NULL UNIQUE,
      zoom_user_id TEXT,
      topic TEXT,
      start_time TEXT,
      end_time TEXT,
      transcript_fetched INTEGER NOT NULL DEFAULT 0,
      transcript_text TEXT,
      processed INTEGER NOT NULL DEFAULT 0,
      needs_review INTEGER NOT NULL DEFAULT 0,
      confidence_score REAL,
      commitment_id TEXT REFERENCES org_commitments(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_zoom_meetings_org ON zoom_meetings(org_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS gmeet_meetings (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      google_event_id TEXT NOT NULL UNIQUE,
      google_calendar_id TEXT,
      summary TEXT,
      start_time TEXT,
      end_time TEXT,
      transcript_fetched INTEGER NOT NULL DEFAULT 0,
      transcript_text TEXT,
      processed INTEGER NOT NULL DEFAULT 0,
      needs_review INTEGER NOT NULL DEFAULT 0,
      confidence_score REAL,
      commitment_id TEXT REFERENCES org_commitments(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_gmeet_meetings_org ON gmeet_meetings(org_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS teams_captured_messages (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      teams_message_id TEXT NOT NULL UNIQUE,
      teams_channel_id TEXT NOT NULL,
      teams_team_id TEXT NOT NULL,
      from_user_id TEXT,
      from_display_name TEXT,
      content TEXT NOT NULL,
      received_at TEXT NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0,
      decision_detected INTEGER NOT NULL DEFAULT 0,
      commitment_id TEXT REFERENCES org_commitments(id) ON DELETE SET NULL,
      confidence_score REAL,
      captured_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_teams_captured_org ON teams_captured_messages(org_id, captured_at DESC);
    CREATE TABLE IF NOT EXISTS calendar_deadline_events (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      commitment_id TEXT NOT NULL REFERENCES org_commitments(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
      calendar_event_id TEXT NOT NULL,
      reminder_event_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (commitment_id, provider)
    );
    CREATE INDEX IF NOT EXISTS idx_calendar_deadline_org ON calendar_deadline_events(org_id);
    CREATE TABLE IF NOT EXISTS onboarding_progress (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      step TEXT NOT NULL CHECK (step IN ('org_setup', 'invite_team', 'connect_integration', 'first_commitment', 'complete')),
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE (org_id, user_id, step)
    );
    CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON onboarding_progress(org_id, user_id);
    CREATE TABLE IF NOT EXISTS integration_waitlist_email (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      clerk_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_waitlist_email ON integration_waitlist_email(email);
  `);
  const orgCols = database.prepare(`PRAGMA table_info(organizations)`).all() as { name: string }[];
  if (!orgCols.some((c) => c.name === "primary_use_case")) {
    database.exec(`ALTER TABLE organizations ADD COLUMN primary_use_case TEXT`);
  }
  if (!orgCols.some((c) => c.name === "ui_policy")) {
    database.exec(`ALTER TABLE organizations ADD COLUMN ui_policy TEXT`);
  }
  const oaCols = (
    database.prepare(`PRAGMA table_info(org_commitment_attachments)`).all() as { name: string }[]
  ).map((c) => c.name);
  if (!oaCols.includes("storage_kind")) {
    database.exec(
      `ALTER TABLE org_commitment_attachments ADD COLUMN storage_kind TEXT NOT NULL DEFAULT 'supabase'`
    );
  }
  if (!oaCols.includes("local_path")) {
    database.exec(`ALTER TABLE org_commitment_attachments ADD COLUMN local_path TEXT`);
  }
  const ocCols = database.prepare(`PRAGMA table_info(org_commitments)`).all() as { name: string }[];
  if (!ocCols.some((c) => c.name === "project_id")) {
    database.exec(
      `ALTER TABLE org_commitments ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL`
    );
  }
  const projectMemberCols = (
    database.prepare(`PRAGMA table_info(project_members)`).all() as { name: string }[]
  ).map((c) => c.name);
  if (!projectMemberCols.includes("updated_at")) {
    database.exec(`ALTER TABLE project_members ADD COLUMN updated_at TEXT`);
    database.exec(`UPDATE project_members SET updated_at = created_at WHERE updated_at IS NULL`);
  }
  const chatChannelCols = (
    database.prepare(`PRAGMA table_info(chat_channels)`).all() as { name: string }[]
  ).map((c) => c.name);
  if (!chatChannelCols.includes("title")) {
    database.exec(`ALTER TABLE chat_channels ADD COLUMN title TEXT NOT NULL DEFAULT 'Channel'`);
  }
  if (!chatChannelCols.includes("created_by")) {
    database.exec(`ALTER TABLE chat_channels ADD COLUMN created_by TEXT`);
  }
  if (!chatChannelCols.includes("updated_at")) {
    database.exec(`ALTER TABLE chat_channels ADD COLUMN updated_at TEXT`);
    database.exec(`UPDATE chat_channels SET updated_at = created_at WHERE updated_at IS NULL`);
  }
  const chatChannelMemberCols = (
    database.prepare(`PRAGMA table_info(chat_channel_members)`).all() as { name: string }[]
  ).map((c) => c.name);
  if (!chatChannelMemberCols.includes("updated_at")) {
    database.exec(`ALTER TABLE chat_channel_members ADD COLUMN updated_at TEXT`);
    database.exec(
      `UPDATE chat_channel_members SET updated_at = created_at WHERE updated_at IS NULL`
    );
  }
  const chatMessageCols = (
    database.prepare(`PRAGMA table_info(chat_messages)`).all() as { name: string }[]
  ).map((c) => c.name);
  if (!chatMessageCols.includes("user_id")) {
    database.exec(`ALTER TABLE chat_messages ADD COLUMN user_id TEXT`);
    database.exec(`UPDATE chat_messages SET user_id = sender_id WHERE user_id IS NULL`);
  }
  if (!chatMessageCols.includes("body")) {
    database.exec(`ALTER TABLE chat_messages ADD COLUMN body TEXT NOT NULL DEFAULT ''`);
    database.exec(`UPDATE chat_messages SET body = content WHERE body = ''`);
  }
  if (!chatMessageCols.includes("attachments_json")) {
    database.exec(`ALTER TABLE chat_messages ADD COLUMN attachments_json TEXT NOT NULL DEFAULT '[]'`);
    database.exec(`UPDATE chat_messages SET attachments_json = attachments WHERE attachments_json = '[]'`);
  }
  if (!chatMessageCols.includes("metadata_json")) {
    database.exec(`ALTER TABLE chat_messages ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}'`);
  }
  if (!chatMessageCols.includes("updated_at")) {
    database.exec(`ALTER TABLE chat_messages ADD COLUMN updated_at TEXT`);
    database.exec(`UPDATE chat_messages SET updated_at = created_at WHERE updated_at IS NULL`);
  }
  database.exec(`
    CREATE TABLE IF NOT EXISTS chat_message_hides (
      user_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, message_id)
    );
    CREATE INDEX IF NOT EXISTS idx_chat_message_hides_user ON chat_message_hides(user_id);
  `);
  db = database;
  return database;
}

/** @internal — org-commitments repo shares the same embedded DB. */
export function getSqliteHandle(): Database.Database {
  return getDb();
}

/** Notify-me list on Integrations — one row per email (unique). */
export function insertIntegrationWaitlistEmail(
  email: string,
  clerkUserId: string
): { ok: true } | { ok: false; error: "duplicate" | "invalid" } {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, error: "invalid" };
  }
  try {
    getDb()
      .prepare(
        `INSERT INTO integration_waitlist_email (id, email, clerk_user_id, created_at) VALUES (?, ?, ?, ?)`
      )
      .run(randomUUID(), normalized, clerkUserId, new Date().toISOString());
    return { ok: true };
  } catch {
    return { ok: false, error: "duplicate" };
  }
}

export type SqliteProjectRow = {
  id: string;
  clerk_user_id: string;
  name: string;
  icon_emoji: string | null;
  org_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Phase 1: one org per Clerk user; backfills project.org_id. */
export function ensureOrganizationForClerkUser(userId: string): string {
  const d = getDb();
  const existing = d
    .prepare(`SELECT id FROM organizations WHERE clerk_user_id = ?`)
    .get(userId) as { id: string } | undefined;
  const now = new Date().toISOString();
  if (existing) {
    d.prepare(`UPDATE projects SET org_id = ? WHERE clerk_user_id = ? AND org_id IS NULL`).run(
      existing.id,
      userId
    );
    return existing.id;
  }
  const id = crypto.randomUUID();
  d.prepare(
    `INSERT INTO organizations (id, clerk_user_id, name, plan, created_at, updated_at)
     VALUES (?, ?, 'Workspace', 'free', ?, ?)`
  ).run(id, userId, now, now);
  d.prepare(`UPDATE projects SET org_id = ? WHERE clerk_user_id = ?`).run(id, userId);
  return id;
}

/**
 * Ensures SQLite has an `organizations` row with the same id as Postgres so `org_members`
 * inserts can succeed locally when Supabase writes fail (hybrid / degraded connectivity).
 */
export function ensureSqliteOrganizationMirror(
  orgId: string,
  ownerClerkUserId: string,
  name = "Workspace"
): void {
  const d = getDb();
  const existing = d.prepare(`SELECT id FROM organizations WHERE id = ?`).get(orgId) as { id: string } | undefined;
  if (existing) return;
  const now = new Date().toISOString();
  d.prepare(
    `INSERT INTO organizations (id, clerk_user_id, name, plan, created_at, updated_at)
     VALUES (?, ?, ?, 'free', ?, ?)`
  ).run(orgId, ownerClerkUserId, name, now, now);
}

export function listProjects(userId: string): SqliteProjectRow[] {
  const d = getDb();
  return d
    .prepare(
      `SELECT id, clerk_user_id, name, icon_emoji, org_id, created_at, updated_at
       FROM projects WHERE clerk_user_id = ?
       ORDER BY updated_at DESC`
    )
    .all(userId) as SqliteProjectRow[];
}

export function insertProject(
  userId: string,
  name: string,
  iconEmoji?: string | null,
  orgId?: string | null
): SqliteProjectRow {
  const d = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  let icon: string | null = null;
  if (iconEmoji != null && String(iconEmoji).trim()) {
    icon = [...String(iconEmoji).trim()][0] ?? null;
  }
  const resolvedOrg = orgId ?? ensureOrganizationForClerkUser(userId);
  d.prepare(
    `INSERT INTO projects (id, clerk_user_id, name, icon_emoji, org_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, name, icon, resolvedOrg, now, now);
  return {
    id,
    clerk_user_id: userId,
    name,
    icon_emoji: icon,
    org_id: resolvedOrg,
    created_at: now,
    updated_at: now,
  };
}

/** Resolve project owner for server-side ingest (webhook) — no user scope. */
export function getProjectOwnerClerkId(projectId: string): string | null {
  const d = getDb();
  const row = d
    .prepare(`SELECT clerk_user_id FROM projects WHERE id = ?`)
    .get(projectId) as { clerk_user_id: string } | undefined;
  return row?.clerk_user_id ?? null;
}

export function getProjectById(
  userId: string,
  projectId: string
): SqliteProjectRow | null {
  const d = getDb();
  const row = d
    .prepare(
      `SELECT id, clerk_user_id, name, icon_emoji, org_id, created_at, updated_at FROM projects
       WHERE id = ? AND clerk_user_id = ?`
    )
    .get(projectId, userId) as SqliteProjectRow | undefined;
  return row ?? null;
}

export function updateProjectMetadata(
  userId: string,
  projectId: string,
  fields: { name?: string; iconEmoji?: string | null }
): SqliteProjectRow | null {
  const d = getDb();
  const existing = getProjectById(userId, projectId);
  if (!existing) return null;
  const name = fields.name !== undefined ? fields.name.trim() : existing.name;
  if (!name) throw new Error("INVALID_NAME");
  let iconEmoji: string | null =
    fields.iconEmoji === undefined ? existing.icon_emoji : fields.iconEmoji;
  if (iconEmoji !== null && iconEmoji !== undefined) {
    const t = iconEmoji.trim();
    iconEmoji = t === "" ? null : [...t][0] ?? null;
  }
  const now = new Date().toISOString();
  d.prepare(
    `UPDATE projects SET name = ?, icon_emoji = ?, updated_at = ?
     WHERE id = ? AND clerk_user_id = ?`
  ).run(name, iconEmoji, now, projectId, userId);
  return getProjectById(userId, projectId);
}

/** Deletes every project (and cascaded extractions) for this Clerk user. */
export function deleteAllWorkspaceDataForUser(userId: string): void {
  const d = getDb();
  d.prepare(`DELETE FROM projects WHERE clerk_user_id = ?`).run(userId);
  d.prepare(`DELETE FROM organizations WHERE clerk_user_id = ?`).run(userId);
}

/** Deletes the project and cascaded extractions (FK). Returns whether a row was removed. */
export function deleteProject(userId: string, projectId: string): boolean {
  const d = getDb();
  const existing = getProjectById(userId, projectId);
  if (!existing) return false;
  const r = d
    .prepare(`DELETE FROM projects WHERE id = ? AND clerk_user_id = ?`)
    .run(projectId, userId);
  return r.changes > 0;
}

export type SqliteExtractionRow = {
  id: string;
  project_id: string;
  clerk_user_id: string;
  raw_input: string;
  summary: string;
  problem?: string;
  solution?: string;
  open_questions?: string;
  decisions: string;
  action_items: string;
  created_at: string;
};

export function listExtractionsForProject(
  userId: string,
  projectId: string
): SqliteExtractionRow[] {
  const d = getDb();
  return d
    .prepare(
      `SELECT id, project_id, clerk_user_id, raw_input, summary, problem, solution, open_questions, decisions, action_items, created_at
       FROM extractions WHERE project_id = ? AND clerk_user_id = ?
       ORDER BY created_at DESC`
    )
    .all(projectId, userId) as SqliteExtractionRow[];
}

export function insertExtraction(params: {
  projectId: string;
  userId: string;
  rawInput: string;
  summary: string;
  problem: string;
  solution: string;
  openQuestions: string[];
  decisions: string[];
  actionItems: ActionItemStored[];
}): { id: string } {
  const d = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  d.prepare(
    `INSERT INTO extractions (id, project_id, clerk_user_id, raw_input, summary, problem, solution, open_questions, decisions, action_items, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.projectId,
    params.userId,
    params.rawInput,
    params.summary,
    params.problem ?? "",
    params.solution ?? "",
    JSON.stringify(params.openQuestions ?? []),
    JSON.stringify(params.decisions),
    JSON.stringify(params.actionItems),
    now
  );
  d.prepare(`UPDATE projects SET updated_at = ? WHERE id = ?`).run(
    now,
    params.projectId
  );
  return { id };
}

export function getExtractionForUser(
  userId: string,
  projectId: string,
  extractionId: string
): SqliteExtractionRow | null {
  const d = getDb();
  const row = d
    .prepare(
      `SELECT id, project_id, clerk_user_id, raw_input, summary, problem, solution, open_questions, decisions, action_items, created_at
       FROM extractions WHERE id = ? AND project_id = ? AND clerk_user_id = ?`
    )
    .get(extractionId, projectId, userId) as SqliteExtractionRow | undefined;
  return row ?? null;
}

export function updateExtractionActionItems(
  userId: string,
  projectId: string,
  extractionId: string,
  actionItems: ActionItemStored[]
): void {
  const d = getDb();
  const r = d
    .prepare(
      `UPDATE extractions SET action_items = ?
       WHERE id = ? AND project_id = ? AND clerk_user_id = ?`
    )
    .run(JSON.stringify(actionItems), extractionId, projectId, userId);
  if (r.changes === 0) {
    throw new Error("NOT_FOUND");
  }
  const now = new Date().toISOString();
  d.prepare(`UPDATE projects SET updated_at = ? WHERE id = ?`).run(
    now,
    projectId
  );
}

export type SummaryResult = {
  projectCount: number;
  extractionCount: number;
  recent: {
    id: string;
    project_id: string;
    summary: string;
    created_at: string;
    projectName: string;
    action_items: string;
  }[];
};

export function getWorkspaceSummary(userId: string): SummaryResult {
  const d = getDb();
  const projectCount =
    (
      d
        .prepare(
          `SELECT COUNT(*) as c FROM projects WHERE clerk_user_id = ?`
        )
        .get(userId) as { c: number }
    ).c ?? 0;
  const extractionCount =
    (
      d
        .prepare(
          `SELECT COUNT(*) as c FROM extractions WHERE clerk_user_id = ?`
        )
        .get(userId) as { c: number }
    ).c ?? 0;
  const recentRows = d
    .prepare(
      `SELECT id, project_id, summary, created_at, action_items FROM extractions
       WHERE clerk_user_id = ?
       ORDER BY created_at DESC LIMIT 6`
    )
    .all(userId) as {
    id: string;
    project_id: string;
    summary: string;
    created_at: string;
    action_items: string;
  }[];

  const projectIds = [...new Set(recentRows.map((r) => r.project_id))];
  const nameByProject = new Map<string, string>();
  if (projectIds.length > 0) {
    const placeholders = projectIds.map(() => "?").join(",");
    const names = d
      .prepare(
        `SELECT id, name FROM projects WHERE clerk_user_id = ? AND id IN (${placeholders})`
      )
      .all(userId, ...projectIds) as { id: string; name: string }[];
    for (const n of names) {
      nameByProject.set(n.id, n.name);
    }
  }

  return {
    projectCount,
    extractionCount,
    recent: recentRows.map((r) => ({
      id: r.id,
      project_id: r.project_id,
      summary: r.summary,
      created_at: r.created_at,
      projectName: nameByProject.get(r.project_id) ?? "Project",
      action_items: r.action_items,
    })),
  };
}

/** All extractions for analytics (capped). */
/** Extractions at or after `sinceIso` (UTC), inclusive — for monthly plan caps. */
export function countExtractionsSince(userId: string, sinceIso: string): number {
  const d = getDb();
  const row = d
    .prepare(
      `SELECT COUNT(*) as c FROM extractions WHERE clerk_user_id = ? AND created_at >= ?`
    )
    .get(userId, sinceIso) as { c: number };
  return row?.c ?? 0;
}

/** Oldest extractions first — used to surface stale open actions before new capture. */
export function listExtractionsForOpenActionQueue(
  userId: string,
  limit = 400
): {
  id: string;
  project_id: string;
  created_at: string;
  action_items: string;
}[] {
  const d = getDb();
  return d
    .prepare(
      `SELECT id, project_id, created_at, action_items FROM extractions
       WHERE clerk_user_id = ?
       ORDER BY created_at ASC
       LIMIT ?`
    )
    .all(userId, limit) as {
    id: string;
    project_id: string;
    created_at: string;
    action_items: string;
  }[];
}

export function listExtractionsForExecutionMetrics(
  userId: string,
  limit = 8000
): {
  project_id: string;
  decisions: string;
  action_items: string;
  created_at: string;
}[] {
  const d = getDb();
  return d
    .prepare(
      `SELECT project_id, decisions, action_items, created_at FROM extractions
       WHERE clerk_user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(userId, limit) as {
    project_id: string;
    decisions: string;
    action_items: string;
    created_at: string;
  }[];
}

function decisionsJsonLength(raw: string): number {
  try {
    const j = JSON.parse(raw) as unknown;
    return Array.isArray(j) ? j.length : 0;
  } catch {
    return 0;
  }
}

/** Timestamps + decision counts for activity / chart APIs (last 14 days window). */
export function listExtractionActivityPointsSince(
  userId: string,
  sinceIso: string
): { created_at: string; decision_count: number }[] {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT created_at, decisions FROM extractions WHERE clerk_user_id = ? AND created_at >= ?`
    )
    .all(userId, sinceIso) as { created_at: string; decisions: string }[];
  return rows.map((r) => ({
    created_at: r.created_at,
    decision_count: decisionsJsonLength(r.decisions ?? "[]"),
  }));
}

export function listProjectPalette(userId: string): { id: string; name: string }[] {
  const d = getDb();
  return d
    .prepare(
      `SELECT id, name FROM projects WHERE clerk_user_id = ?
       ORDER BY updated_at DESC LIMIT 40`
    )
    .all(userId) as { id: string; name: string }[];
}

// --- Commitments (execution layer) ---

export type SqliteCommitmentRow = {
  id: string;
  project_id: string;
  clerk_user_id: string;
  title: string;
  description: string | null;
  owner_user_id: string | null;
  owner_display_name: string | null;
  source: string;
  source_reference: string;
  status: string;
  priority: string;
  created_at: string;
  due_date: string | null;
  last_updated_at: string;
  activity_log: string;
  archived_at: string | null;
};

export function insertCommitmentRow(params: {
  projectId: string;
  userId: string;
  title: string;
  description: string | null;
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  source: string;
  sourceReference: string;
  status: string;
  priority: string;
  dueDate: string | null;
  activityLogJson: string;
}): { id: string } {
  const d = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  d.prepare(
    `INSERT INTO commitments (
      id, project_id, clerk_user_id, title, description,
      owner_user_id, owner_display_name, source, source_reference,
      status, priority, created_at, due_date, last_updated_at, activity_log, archived_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.projectId,
    params.userId,
    params.title,
    params.description,
    params.ownerUserId,
    params.ownerDisplayName,
    params.source,
    params.sourceReference,
    params.status,
    params.priority,
    now,
    params.dueDate,
    now,
    params.activityLogJson,
    null
  );
  d.prepare(`UPDATE projects SET updated_at = ? WHERE id = ?`).run(now, params.projectId);
  return { id };
}

export function insertCommitmentRowsBatch(
  rows: Array<{
    projectId: string;
    userId: string;
    title: string;
    description: string | null;
    ownerUserId: string | null;
    ownerDisplayName: string | null;
    source: string;
    sourceReference: string;
    status: string;
    priority: string;
    dueDate: string | null;
    activityLogJson: string;
  }>
): Array<{ id: string }> {
  if (rows.length === 0) return [];
  const d = getDb();
  const insertStmt = d.prepare(
    `INSERT INTO commitments (
      id, project_id, clerk_user_id, title, description,
      owner_user_id, owner_display_name, source, source_reference,
      status, priority, created_at, due_date, last_updated_at, activity_log, archived_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const updateProjectStmt = d.prepare(`UPDATE projects SET updated_at = ? WHERE id = ?`);
  const run = d.transaction(() => {
    const now = new Date().toISOString();
    const out: Array<{ id: string }> = [];
    for (const row of rows) {
      const id = crypto.randomUUID();
      insertStmt.run(
        id,
        row.projectId,
        row.userId,
        row.title,
        row.description,
        row.ownerUserId,
        row.ownerDisplayName,
        row.source,
        row.sourceReference,
        row.status,
        row.priority,
        now,
        row.dueDate,
        now,
        row.activityLogJson,
        null
      );
      updateProjectStmt.run(now, row.projectId);
      out.push({ id });
    }
    return out;
  });
  return run();
}


export function getCommitmentRow(
  userId: string,
  projectId: string,
  commitmentId: string
): SqliteCommitmentRow | null {
  const d = getDb();
  const row = d
    .prepare(
      `SELECT * FROM commitments WHERE id = ? AND project_id = ? AND clerk_user_id = ?`
    )
    .get(commitmentId, projectId, userId) as SqliteCommitmentRow | undefined;
  return row ?? null;
}

export function listCommitmentsForProject(
  userId: string,
  projectId: string
): SqliteCommitmentRow[] {
  const d = getDb();
  return d
    .prepare(
      `SELECT * FROM commitments WHERE project_id = ? AND clerk_user_id = ?
       AND (archived_at IS NULL OR archived_at = '')
       ORDER BY last_updated_at DESC`
    )
    .all(projectId, userId) as SqliteCommitmentRow[];
}

/** Active (non-archived) commitments — Desk, Overview, reconciliation. */
export function listCommitmentsForUser(userId: string): SqliteCommitmentRow[] {
  const d = getDb();
  return d
    .prepare(
      `SELECT * FROM commitments WHERE clerk_user_id = ?
       AND (archived_at IS NULL OR archived_at = '')
       ORDER BY last_updated_at DESC`
    )
    .all(userId) as SqliteCommitmentRow[];
}

/** Includes archived rows — audit log and compliance views. */
export function listCommitmentsForUserAll(userId: string): SqliteCommitmentRow[] {
  const d = getDb();
  return d
    .prepare(
      `SELECT * FROM commitments WHERE clerk_user_id = ?
       ORDER BY last_updated_at DESC`
    )
    .all(userId) as SqliteCommitmentRow[];
}

export function updateCommitmentRow(
  userId: string,
  projectId: string,
  commitmentId: string,
  patch: {
    title?: string;
    description?: string | null;
    ownerUserId?: string | null;
    ownerDisplayName?: string | null;
    status?: string;
    priority?: string;
    dueDate?: string | null;
    activityLogJson?: string;
  }
): SqliteCommitmentRow | null {
  const d = getDb();
  const existing = getCommitmentRow(userId, projectId, commitmentId);
  if (!existing) return null;
  const now = new Date().toISOString();
  const title = patch.title !== undefined ? patch.title : existing.title;
  const description =
    patch.description !== undefined ? patch.description : existing.description;
  const ownerUserId =
    patch.ownerUserId !== undefined ? patch.ownerUserId : existing.owner_user_id;
  const ownerDisplayName =
    patch.ownerDisplayName !== undefined
      ? patch.ownerDisplayName
      : existing.owner_display_name;
  const status = patch.status !== undefined ? patch.status : existing.status;
  const priority = patch.priority !== undefined ? patch.priority : existing.priority;
  const dueDate = patch.dueDate !== undefined ? patch.dueDate : existing.due_date;
  const activityLog =
    patch.activityLogJson !== undefined ? patch.activityLogJson : existing.activity_log;

  d.prepare(
    `UPDATE commitments SET
      title = ?, description = ?, owner_user_id = ?, owner_display_name = ?,
      status = ?, priority = ?, due_date = ?, last_updated_at = ?, activity_log = ?
     WHERE id = ? AND project_id = ? AND clerk_user_id = ?`
  ).run(
    title,
    description,
    ownerUserId,
    ownerDisplayName,
    status,
    priority,
    dueDate,
    now,
    activityLog,
    commitmentId,
    projectId,
    userId
  );
  d.prepare(`UPDATE projects SET updated_at = ? WHERE id = ?`).run(now, projectId);
  return getCommitmentRow(userId, projectId, commitmentId);
}

/** Soft-archive: row stays in DB for audit; hidden from active lists. */
export function archiveCommitmentRow(
  userId: string,
  projectId: string,
  commitmentId: string,
  activityLogJson: string
): boolean {
  const d = getDb();
  const now = new Date().toISOString();
  const r = d
    .prepare(
      `UPDATE commitments SET archived_at = ?, last_updated_at = ?, activity_log = ?
       WHERE id = ? AND project_id = ? AND clerk_user_id = ?
         AND (archived_at IS NULL OR archived_at = '')`
    )
    .run(now, now, activityLogJson, commitmentId, projectId, userId);
  if (r.changes > 0) {
    d.prepare(`UPDATE projects SET updated_at = ? WHERE id = ?`).run(now, projectId);
  }
  return r.changes > 0;
}

export function insertEscalationEvent(params: {
  userId: string;
  projectId: string;
  commitmentId: string;
  reason: string;
  previousStatus: string | null;
  newStatus: string | null;
  notifiedAt: string | null;
}): void {
  const d = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  d.prepare(
    `INSERT INTO escalation_events (
      id, clerk_user_id, project_id, commitment_id, reason, previous_status, new_status, created_at, notified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.userId,
    params.projectId,
    params.commitmentId,
    params.reason,
    params.previousStatus,
    params.newStatus,
    now,
    params.notifiedAt
  );
}

export function listEscalationEventsForUser(userId: string, limit = 80): {
  id: string;
  project_id: string;
  commitment_id: string;
  reason: string;
  previous_status: string | null;
  new_status: string | null;
  created_at: string;
}[] {
  const d = getDb();
  return d
    .prepare(
      `SELECT id, project_id, commitment_id, reason, previous_status, new_status, created_at
       FROM escalation_events WHERE clerk_user_id = ?
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(userId, limit) as {
    id: string;
    project_id: string;
    commitment_id: string;
    reason: string;
    previous_status: string | null;
    new_status: string | null;
    created_at: string;
  }[];
}

export function deleteCommitmentRow(
  userId: string,
  projectId: string,
  commitmentId: string
): boolean {
  const d = getDb();
  const r = d
    .prepare(
      `DELETE FROM commitments WHERE id = ? AND project_id = ? AND clerk_user_id = ?`
    )
    .run(commitmentId, projectId, userId);
  if (r.changes > 0) {
    const now = new Date().toISOString();
    d.prepare(`UPDATE projects SET updated_at = ? WHERE id = ?`).run(now, projectId);
  }
  return r.changes > 0;
}
