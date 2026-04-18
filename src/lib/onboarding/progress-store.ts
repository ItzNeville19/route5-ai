import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";

export type OnboardingStep =
  | "org_setup"
  | "invite_team"
  | "connect_integration"
  | "first_commitment"
  | "complete";

export type OnboardingProgressRow = {
  step: OnboardingStep;
  completed: boolean;
  completedAt: string | null;
};

const STEPS: OnboardingStep[] = [
  "org_setup",
  "invite_team",
  "connect_integration",
  "first_commitment",
  "complete",
];

export async function getOnboardingState(
  orgId: string,
  userId: string
): Promise<{ steps: Record<OnboardingStep, boolean>; fullyComplete: boolean }> {
  const steps: Record<OnboardingStep, boolean> = {
    org_setup: false,
    invite_team: false,
    connect_integration: false,
    first_commitment: false,
    complete: false,
  };
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("onboarding_progress")
      .select("step, completed")
      .eq("org_id", orgId)
      .eq("user_id", userId);
    if (error) throw error;
    for (const r of data ?? []) {
      const s = (r as { step: string; completed: boolean }).step as OnboardingStep;
      if (s in steps) steps[s] = (r as { completed: boolean }).completed;
    }
  } else {
    const d = getSqliteHandle();
    const rows = d
      .prepare(`SELECT step, completed FROM onboarding_progress WHERE org_id = ? AND user_id = ?`)
      .all(orgId, userId) as { step: string; completed: number }[];
    for (const r of rows) {
      const s = r.step as OnboardingStep;
      if (s in steps) steps[s] = Boolean(r.completed);
    }
  }
  const fullyComplete = steps.complete === true;
  return { steps, fullyComplete };
}

export async function markOnboardingStepComplete(
  orgId: string,
  userId: string,
  step: OnboardingStep
): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: existing, error: exErr } = await supabase
      .from("onboarding_progress")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .eq("step", step)
      .maybeSingle();
    if (exErr) throw exErr;
    if (existing) {
      const { error } = await supabase
        .from("onboarding_progress")
        .update({ completed: true, completed_at: now })
        .eq("id", (existing as { id: string }).id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("onboarding_progress").insert({
        id: crypto.randomUUID(),
        org_id: orgId,
        user_id: userId,
        step,
        completed: true,
        completed_at: now,
        created_at: now,
      });
      if (error) throw error;
    }
    return;
  }
  const d = getSqliteHandle();
  const existing = d
    .prepare(`SELECT id FROM onboarding_progress WHERE org_id = ? AND user_id = ? AND step = ?`)
    .get(orgId, userId, step) as { id: string } | undefined;
  if (existing) {
    d.prepare(
      `UPDATE onboarding_progress SET completed = 1, completed_at = ? WHERE org_id = ? AND user_id = ? AND step = ?`
    ).run(now, orgId, userId, step);
  } else {
    const id = crypto.randomUUID();
    d.prepare(
      `INSERT INTO onboarding_progress (id, org_id, user_id, step, completed, completed_at, created_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`
    ).run(id, orgId, userId, step, now, now);
  }
}

export async function ensureOnboardingRowsInitialized(orgId: string, userId: string): Promise<void> {
  const { steps } = await getOnboardingState(orgId, userId);
  const hasAny = Object.values(steps).some(Boolean);
  if (hasAny) return;
  /* lazy: no insert until user starts — first GET status returns all false */
}

export async function isOnboardingCompleteForUser(orgId: string, userId: string): Promise<boolean> {
  const { fullyComplete } = await getOnboardingState(orgId, userId);
  return fullyComplete;
}

export { STEPS };
