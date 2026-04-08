import { NextResponse } from "next/server";
import OpenAI from "openai";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  clampRawInput,
  parseExtractionJson,
  type ActionItemStored,
} from "@/lib/ai/schema";
import { EXTRACTION_SYSTEM_PROMPT } from "@/lib/ai/prompt";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gpt-4o-mini";

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey: key });
}

export async function POST(req: Request) {
  let body: { projectId?: string; rawInput?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const projectId = body.projectId?.trim();
  const rawInputRaw = typeof body.rawInput === "string" ? body.rawInput : "";
  if (!projectId || !rawInputRaw.trim()) {
    return NextResponse.json(
      { error: "projectId and non-empty rawInput are required" },
      { status: 400 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization Bearer token" },
      { status: 401 }
    );
  }

  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const db = adminDb();
  const projectRef = db.collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const projectData = projectSnap.data() as { ownerId?: string };
  if (projectData.ownerId !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawInput = clampRawInput(rawInputRaw);
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;

  let content: string;
  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze the following text:\n\n---\n${rawInput}\n---`,
        },
      ],
    });
    const choice = completion.choices[0]?.message?.content;
    if (!choice) {
      return NextResponse.json(
        { error: "No response from language model" },
        { status: 502 }
      );
    }
    content = choice;
  } catch (e) {
    const message = e instanceof Error ? e.message : "OpenAI request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let parsed;
  try {
    parsed = parseExtractionJson(content);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Parse error";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const actionItems: ActionItemStored[] = parsed.actionItems.map((a) => ({
    id: nanoid(),
    text: a.text,
    owner: a.owner ?? null,
    completed: false,
  }));

  const extractionRef = projectRef.collection("extractions").doc();
  await extractionRef.set({
    ownerId: uid,
    rawInput,
    summary: parsed.summary,
    decisions: parsed.decisions,
    actionItems,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    extractionId: extractionRef.id,
    summary: parsed.summary,
    decisions: parsed.decisions,
    actionItems,
  });
}
