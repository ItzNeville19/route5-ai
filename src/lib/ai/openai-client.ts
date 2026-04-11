import OpenAI from "openai";
import { looksLikeTutorialOrEmptySecret } from "@/lib/env-template-guards";
import {
  APIError,
  AuthenticationError,
  RateLimitError,
  APIConnectionError,
  APIConnectionTimeoutError,
} from "openai";

const DEFAULT_MODEL = "gpt-4o-mini";

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

/** Returns trimmed key or null if unset / whitespace-only. */
export function getOpenAIApiKey(): string | null {
  const k = process.env.OPENAI_API_KEY?.trim();
  return k || null;
}

export function isOpenAIConfigured(): boolean {
  const k = getOpenAIApiKey();
  if (!k) return false;
  if (looksLikeTutorialOrEmptySecret(k)) return false;
  return true;
}

export function createOpenAIClient(): OpenAI {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error("AI_EXTRACTION_UNAVAILABLE");
  }
  return new OpenAI({
    apiKey,
    maxRetries: 2,
    timeout: 120_000,
  });
}

/**
 * Maps OpenAI SDK errors to safe, user-facing messages (no secret leakage).
 */
export function formatOpenAIError(error: unknown): string {
  if (error instanceof AuthenticationError) {
    return "AI credentials for this workspace were rejected. Contact your administrator.";
  }
  if (error instanceof RateLimitError) {
    return "Rate limit reached. Wait a moment and try again.";
  }
  if (error instanceof APIConnectionTimeoutError) {
    return "Request timed out. Try again with shorter text.";
  }
  if (error instanceof APIConnectionError) {
    return "Could not reach the AI service. Check your network and try again.";
  }
  if (error instanceof APIError) {
    if (error.status === 401) {
      return "AI service rejected this workspace’s credentials. Contact your administrator.";
    }
    if (error.status === 429) {
      return "Too many requests. Try again shortly.";
    }
    if (error.status === 503 || error.status === 502) {
      return "AI service is temporarily unavailable. Try again in a moment.";
    }
    const msg = error.message?.trim();
    if (msg && msg.length < 280) {
      return msg;
    }
    return "The AI service returned an error. Try again.";
  }
  if (error instanceof Error) {
    if (
      error.message === "AI_EXTRACTION_UNAVAILABLE" ||
      (error.message.toLowerCase().includes("openai") && error.message.includes("not set"))
    ) {
      return "AI extraction isn’t enabled for this workspace yet.";
    }
    return error.message.slice(0, 280);
  }
  return "Something went wrong while processing your text.";
}
