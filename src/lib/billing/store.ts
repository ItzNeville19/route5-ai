import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { withSqliteFallback } from "@/lib/supabase/with-sqlite-fallback";
import { getSqliteHandle } from "@/lib/workspace/sqlite";
import type {
  BillingPlanId,
  OrgInvoiceRow,
  OrgInvoiceStatus,
  OrgSubscriptionRow,
  SubscriptionStatus,
  UsageMetric,
} from "@/lib/billing/types";

function mapSub(r: Record<string, unknown>): OrgSubscriptionRow {
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    stripeCustomerId: r.stripe_customer_id == null ? null : String(r.stripe_customer_id),
    stripeSubscriptionId:
      r.stripe_subscription_id == null ? null : String(r.stripe_subscription_id),
    plan: r.plan as BillingPlanId,
    status: r.status as SubscriptionStatus,
    currentPeriodStart: r.current_period_start == null ? null : String(r.current_period_start),
    currentPeriodEnd: r.current_period_end == null ? null : String(r.current_period_end),
    cancelAtPeriodEnd: Boolean(r.cancel_at_period_end),
    cancelledAt: r.cancelled_at == null ? null : String(r.cancelled_at),
    trialEnd: r.trial_end == null ? null : String(r.trial_end),
    seatCount: Number(r.seat_count ?? 1),
    paymentFailedAt: r.payment_failed_at == null ? null : String(r.payment_failed_at),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapInvoice(r: Record<string, unknown>): OrgInvoiceRow {
  return {
    id: String(r.id),
    orgId: String(r.org_id),
    stripeInvoiceId: String(r.stripe_invoice_id),
    stripePaymentIntentId:
      r.stripe_payment_intent_id == null ? null : String(r.stripe_payment_intent_id),
    amountCents: Number(r.amount_cents),
    currency: String(r.currency ?? "usd"),
    status: r.status as OrgInvoiceStatus,
    invoiceUrl: r.invoice_url == null ? null : String(r.invoice_url),
    invoicePdfUrl: r.invoice_pdf_url == null ? null : String(r.invoice_pdf_url),
    periodStart: r.period_start == null ? null : String(r.period_start),
    periodEnd: r.period_end == null ? null : String(r.period_end),
    createdAt: String(r.created_at),
  };
}

export async function getOrganizationPlanColumn(orgId: string): Promise<string> {
  return withSqliteFallback(
    async () => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("organizations")
        .select("plan")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      return String((data as { plan?: string } | null)?.plan ?? "free");
    },
    () => {
      const d = getSqliteHandle();
      const row = d.prepare(`SELECT plan FROM organizations WHERE id = ?`).get(orgId) as
        | { plan: string }
        | undefined;
      return row?.plan ?? "free";
    }
  );
}

export async function getOrganizationCreatedAt(orgId: string): Promise<string | null> {
  return withSqliteFallback(
    async () => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("organizations")
        .select("created_at")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      return (data as { created_at?: string } | null)?.created_at ?? null;
    },
    () => {
      const d = getSqliteHandle();
      const row = d.prepare(`SELECT created_at FROM organizations WHERE id = ?`).get(orgId) as
        | { created_at: string }
        | undefined;
      return row?.created_at ?? null;
    }
  );
}

export async function updateOrganizationPlan(orgId: string, plan: string): Promise<void> {
  const now = new Date().toISOString();
  await withSqliteFallback(
    async () => {
      const supabase = getServiceClient();
      const { error } = await supabase
        .from("organizations")
        .update({ plan, updated_at: now })
        .eq("id", orgId);
      if (error) throw error;
    },
    () => {
      const d = getSqliteHandle();
      d.prepare(`UPDATE organizations SET plan = ?, updated_at = ? WHERE id = ?`).run(plan, now, orgId);
    }
  );
}

export async function findOrgIdByStripeCustomerId(customerId: string): Promise<string | null> {
  return withSqliteFallback(
    async () => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("org_subscriptions")
        .select("org_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (error) throw error;
      return data ? String((data as { org_id: string }).org_id) : null;
    },
    () => {
      const d = getSqliteHandle();
      const row = d
        .prepare(`SELECT org_id FROM org_subscriptions WHERE stripe_customer_id = ?`)
        .get(customerId) as { org_id: string } | undefined;
      return row?.org_id ?? null;
    }
  );
}

export async function findOrgIdByStripeSubscriptionId(subscriptionId: string): Promise<string | null> {
  return withSqliteFallback(
    async () => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("org_subscriptions")
        .select("org_id")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();
      if (error) throw error;
      return data ? String((data as { org_id: string }).org_id) : null;
    },
    () => {
      const d = getSqliteHandle();
      const row = d
        .prepare(`SELECT org_id FROM org_subscriptions WHERE stripe_subscription_id = ?`)
        .get(subscriptionId) as { org_id: string } | undefined;
      return row?.org_id ?? null;
    }
  );
}

export async function getOrgSubscription(orgId: string): Promise<OrgSubscriptionRow | null> {
  return withSqliteFallback(
    async () => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("org_subscriptions")
        .select("*")
        .eq("org_id", orgId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapSub(data as Record<string, unknown>);
    },
    () => {
      const d = getSqliteHandle();
      const row = d
        .prepare(`SELECT * FROM org_subscriptions WHERE org_id = ?`)
        .get(orgId) as Record<string, unknown> | undefined;
      if (!row) return null;
      const r = row;
      return mapSub({
        ...r,
        cancel_at_period_end: Boolean(r.cancel_at_period_end),
      });
    }
  );
}

export async function upsertOrgSubscriptionPartial(params: {
  orgId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  plan?: BillingPlanId;
  status?: SubscriptionStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string | null;
  trialEnd?: string | null;
  seatCount?: number;
  paymentFailedAt?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const existing = await getOrgSubscription(params.orgId);
  const merged = {
    stripe_customer_id:
      params.stripeCustomerId !== undefined ? params.stripeCustomerId : (existing?.stripeCustomerId ?? null),
    stripe_subscription_id:
      params.stripeSubscriptionId !== undefined
        ? params.stripeSubscriptionId
        : (existing?.stripeSubscriptionId ?? null),
    plan: params.plan ?? existing?.plan ?? ("free" as BillingPlanId),
    status: params.status ?? existing?.status ?? ("incomplete" as SubscriptionStatus),
    current_period_start:
      params.currentPeriodStart !== undefined
        ? params.currentPeriodStart
        : (existing?.currentPeriodStart ?? null),
    current_period_end:
      params.currentPeriodEnd !== undefined ? params.currentPeriodEnd : (existing?.currentPeriodEnd ?? null),
    cancel_at_period_end:
      params.cancelAtPeriodEnd !== undefined ? params.cancelAtPeriodEnd : (existing?.cancelAtPeriodEnd ?? false),
    cancelled_at: params.cancelledAt !== undefined ? params.cancelledAt : (existing?.cancelledAt ?? null),
    trial_end: params.trialEnd !== undefined ? params.trialEnd : (existing?.trialEnd ?? null),
    seat_count: params.seatCount ?? existing?.seatCount ?? 1,
    payment_failed_at:
      params.paymentFailedAt !== undefined ? params.paymentFailedAt : (existing?.paymentFailedAt ?? null),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const payload = {
        org_id: params.orgId,
        stripe_customer_id: merged.stripe_customer_id,
        stripe_subscription_id: merged.stripe_subscription_id,
        plan: merged.plan,
        status: merged.status,
        current_period_start: merged.current_period_start,
        current_period_end: merged.current_period_end,
        cancel_at_period_end: merged.cancel_at_period_end,
        cancelled_at: merged.cancelled_at,
        trial_end: merged.trial_end,
        seat_count: merged.seat_count,
        payment_failed_at: merged.payment_failed_at,
        updated_at: now,
        ...(existing ? {} : { created_at: now }),
      };
      const { error } = await supabase.from("org_subscriptions").upsert(payload, { onConflict: "org_id" });
      if (error) throw error;
      return;
    } catch (e) {
      console.error("[billing] upsertOrgSubscriptionPartial Supabase failed; writing SQLite.", e);
    }
  }

  const d = getSqliteHandle();
  if (!existing) {
    const id = crypto.randomUUID();
    d.prepare(
      `INSERT INTO org_subscriptions (
        id, org_id, stripe_customer_id, stripe_subscription_id, plan, status,
        current_period_start, current_period_end, cancel_at_period_end, cancelled_at, trial_end,
        seat_count, payment_failed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      params.orgId,
      merged.stripe_customer_id,
      merged.stripe_subscription_id,
      merged.plan,
      merged.status,
      merged.current_period_start,
      merged.current_period_end,
      merged.cancel_at_period_end ? 1 : 0,
      merged.cancelled_at,
      merged.trial_end,
      merged.seat_count,
      merged.payment_failed_at,
      now,
      now
    );
    return;
  }
  const sets: string[] = [];
  const vals: unknown[] = [];
  const add = (col: string, v: unknown) => {
    sets.push(`${col} = ?`);
    vals.push(v);
  };
  if (params.stripeCustomerId !== undefined) add("stripe_customer_id", params.stripeCustomerId);
  if (params.stripeSubscriptionId !== undefined) add("stripe_subscription_id", params.stripeSubscriptionId);
  if (params.plan !== undefined) add("plan", params.plan);
  if (params.status !== undefined) add("status", params.status);
  if (params.currentPeriodStart !== undefined) add("current_period_start", params.currentPeriodStart);
  if (params.currentPeriodEnd !== undefined) add("current_period_end", params.currentPeriodEnd);
  if (params.cancelAtPeriodEnd !== undefined) add("cancel_at_period_end", params.cancelAtPeriodEnd ? 1 : 0);
  if (params.cancelledAt !== undefined) add("cancelled_at", params.cancelledAt);
  if (params.trialEnd !== undefined) add("trial_end", params.trialEnd);
  if (params.seatCount !== undefined) add("seat_count", params.seatCount);
  if (params.paymentFailedAt !== undefined) add("payment_failed_at", params.paymentFailedAt);
  add("updated_at", now);
  vals.push(params.orgId);
  d.prepare(`UPDATE org_subscriptions SET ${sets.join(", ")} WHERE org_id = ?`).run(...vals);
}

export async function tryClaimStripeWebhookEvent(stripeEventId: string): Promise<boolean> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const { error } = await supabase.from("stripe_webhook_events").insert({
        stripe_event_id: stripeEventId,
        created_at: now,
      });
      if (error) {
        if (error.code === "23505") return false;
        const msg = error.message?.toLowerCase() ?? "";
        if (msg.includes("duplicate") || msg.includes("unique")) return false;
        throw error;
      }
      return true;
    } catch (e) {
      console.error("[billing] tryClaimStripeWebhookEvent Supabase failed; SQLite.", e);
    }
  }
  const d = getSqliteHandle();
  const id = crypto.randomUUID();
  try {
    d.prepare(`INSERT INTO stripe_webhook_events (id, stripe_event_id, created_at) VALUES (?, ?, ?)`).run(
      id,
      stripeEventId,
      now
    );
    return true;
  } catch {
    return false;
  }
}

export async function insertOrgInvoiceIfNew(row: {
  orgId: string;
  stripeInvoiceId: string;
  stripePaymentIntentId: string | null;
  amountCents: number;
  currency: string;
  status: OrgInvoiceStatus;
  invoiceUrl: string | null;
  invoicePdfUrl: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}): Promise<boolean> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const { error } = await supabase.from("org_invoices").insert({
        org_id: row.orgId,
        stripe_invoice_id: row.stripeInvoiceId,
        stripe_payment_intent_id: row.stripePaymentIntentId,
        amount_cents: row.amountCents,
        currency: row.currency,
        status: row.status,
        invoice_url: row.invoiceUrl,
        invoice_pdf_url: row.invoicePdfUrl,
        period_start: row.periodStart,
        period_end: row.periodEnd,
        created_at: now,
      });
      if (error) {
        if (error.message?.toLowerCase().includes("duplicate")) return false;
        throw error;
      }
      return true;
    } catch (e) {
      console.error("[billing] insertOrgInvoiceIfNew Supabase failed; SQLite.", e);
    }
  }
  const d = getSqliteHandle();
  const id = crypto.randomUUID();
  try {
    d.prepare(
      `INSERT INTO org_invoices (
        id, org_id, stripe_invoice_id, stripe_payment_intent_id, amount_cents, currency, status,
        invoice_url, invoice_pdf_url, period_start, period_end, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      row.orgId,
      row.stripeInvoiceId,
      row.stripePaymentIntentId,
      row.amountCents,
      row.currency,
      row.status,
      row.invoiceUrl,
      row.invoicePdfUrl,
      row.periodStart,
      row.periodEnd,
      now
    );
    return true;
  } catch {
    return false;
  }
}

export async function countActiveCommitments(orgId: string): Promise<number> {
  return withSqliteFallback(
    async () => {
      const supabase = getServiceClient();
      const { count, error } = await supabase
        .from("org_commitments")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .is("deleted_at", null);
      if (error) throw error;
      return count ?? 0;
    },
    () => {
      const d = getSqliteHandle();
      const row = d
        .prepare(
          `SELECT COUNT(*) as c FROM org_commitments WHERE org_id = ? AND deleted_at IS NULL`
        )
        .get(orgId) as { c: number };
      return row?.c ?? 0;
    }
  );
}

export async function countConnectedIntegrations(orgId: string): Promise<number> {
  return withSqliteFallback(
    async () => {
      const supabase = getServiceClient();
      const { count, error } = await supabase
        .from("org_integrations")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "connected");
      if (error) throw error;
      return count ?? 0;
    },
    () => {
      const d = getSqliteHandle();
      const row = d
        .prepare(
          `SELECT COUNT(*) as c FROM org_integrations WHERE org_id = ? AND status = 'connected'`
        )
        .get(orgId) as { c: number };
      return row?.c ?? 0;
    }
  );
}

export async function getLatestUsageValue(orgId: string, metric: UsageMetric): Promise<number | null> {
  return withSqliteFallback(
    async () => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("org_usage")
        .select("value")
        .eq("org_id", orgId)
        .eq("metric", metric)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return Number((data as { value: number }).value);
    },
    () => {
      const d = getSqliteHandle();
      const row = d
        .prepare(
          `SELECT value FROM org_usage WHERE org_id = ? AND metric = ? ORDER BY recorded_at DESC LIMIT 1`
        )
        .get(orgId, metric) as { value: number } | undefined;
      return row ? Number(row.value) : null;
    }
  );
}

export async function recordUsage(orgId: string, metric: UsageMetric, value: number): Promise<void> {
  const now = new Date().toISOString();
  await withSqliteFallback(
    async () => {
      const supabase = getServiceClient();
      const { error } = await supabase.from("org_usage").insert({
        org_id: orgId,
        metric,
        value,
        recorded_at: now,
      });
      if (error) throw error;
    },
    () => {
      const d = getSqliteHandle();
      const id = crypto.randomUUID();
      d.prepare(
        `INSERT INTO org_usage (id, org_id, metric, value, recorded_at) VALUES (?, ?, ?, ?, ?)`
      ).run(id, orgId, metric, value, now);
    }
  );
}

export async function ensureSeatUsageInitialized(orgId: string, seatCount: number): Promise<void> {
  const latest = await getLatestUsageValue(orgId, "seats");
  if (latest == null) {
    await recordUsage(orgId, "seats", seatCount);
  }
}

export async function listOrgInvoices(orgId: string, limit = 50): Promise<OrgInvoiceRow[]> {
  return withSqliteFallback(
    async () => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("org_invoices")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((r) => mapInvoice(r as Record<string, unknown>));
    },
    () => {
      const d = getSqliteHandle();
      const rows = d
        .prepare(
          `SELECT * FROM org_invoices WHERE org_id = ? ORDER BY created_at DESC LIMIT ?`
        )
        .all(orgId, limit) as Record<string, unknown>[];
      return rows.map(mapInvoice);
    }
  );
}
