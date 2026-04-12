import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { deleteAllWorkspaceDataForUser } from "@/lib/workspace/store";
import {
  cleanText,
  enforceRateLimits,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const deleteAccountBodySchema = z
  .object({
    confirmationPhrase: z.string().min(1).max(64),
    password: z.string().max(512).optional(),
    reason: z
      .string()
      .transform(cleanText)
      .pipe(
        z
          .string()
          .min(
            20,
            "Please write a bit more — what made you want to delete your account?"
          )
          .max(4000)
      ),
    acknowledgedPermanent: z.literal(true),
  })
  .strict();

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "account:delete", userId, {
      userLimit: 5,
      ipLimit: 15,
      userWindowMs: 3600_000,
    })
  );
  if (rateLimited) return rateLimited;

  const parsed = await parseJsonBody(req, deleteAccountBodySchema);
  if (!parsed.ok) return parsed.response;

  const phrase = parsed.data.confirmationPhrase.trim().toLowerCase();
  if (phrase !== "delete") {
    return NextResponse.json(
      { error: 'Type the word "delete" to confirm.' },
      { status: 400 }
    );
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    if (user.passwordEnabled) {
      const pwd = parsed.data.password?.trim() ?? "";
      if (!pwd) {
        return NextResponse.json(
          { error: "Enter your account password to confirm deletion." },
          { status: 400 }
        );
      }
      try {
        await client.users.verifyPassword({ userId, password: pwd });
      } catch {
        return NextResponse.json(
          { error: "Incorrect password." },
          { status: 401 }
        );
      }
    }

    await deleteAllWorkspaceDataForUser(userId);
    await client.users.deleteUser(userId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}
