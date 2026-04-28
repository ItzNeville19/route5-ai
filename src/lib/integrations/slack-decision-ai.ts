import OpenAI from "openai";
import { getOpenAIApiKey } from "@/lib/ai/openai-client";
import { z } from "zod";

const decisionSchema = z.object({
  is_decision: z.boolean(),
  decision_text: z.string().optional().nullable(),
  inferred_owner: z.string().optional().nullable(),
  inferred_deadline: z.string().optional().nullable(),
  inferred_priority: z.enum(["critical", "high", "medium", "low"]).optional().nullable(),
  confidence_score: z.number(),
});

export type SlackDecisionResult = z.infer<typeof decisionSchema>;

async function detectDecisionCore(
  text: string,
  sourceLabel: "Slack" | "email" | "Notion"
): Promise<SlackDecisionResult> {
  const key = getOpenAIApiKey();
  if (!key) {
    return { is_decision: false, confidence_score: 0 };
  }
  const sourcePhrase =
    sourceLabel === "Notion" ? "Notion page content" : `${sourceLabel} messages`;
  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          `You extract organizational decisions and commitments from ${sourcePhrase}.`,
          "Return JSON only with keys: is_decision (boolean), decision_text (short summary),",
          "inferred_owner (name fragment or email hint if any), inferred_deadline (ISO 8601 datetime if inferable else null),",
          "inferred_priority (critical|high|medium|low), confidence_score (0 to 1).",
          "is_decision is true only when the message clearly assigns work, sets a deadline, or records a firm decision.",
          "Casual chat should have is_decision false and low confidence.",
        ].join(" "),
      },
      { role: "user", content: text },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { is_decision: false, confidence_score: 0 };
  }
  const safe = decisionSchema.safeParse(parsed);
  if (!safe.success) {
    return { is_decision: false, confidence_score: 0 };
  }
  return safe.data;
}

export async function detectDecisionInSlackMessage(text: string): Promise<SlackDecisionResult> {
  return detectDecisionCore(text, "Slack");
}

/** Same model and JSON schema as Slack — used for Gmail bodies. */
export async function detectDecisionInText(text: string): Promise<SlackDecisionResult> {
  return detectDecisionCore(text, "email");
}

/** Notion page title + body text. */
export async function detectDecisionInNotionContent(text: string): Promise<SlackDecisionResult> {
  return detectDecisionCore(text, "Notion");
}
