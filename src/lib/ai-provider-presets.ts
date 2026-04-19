/**
 * User-selectable capture + model providers (prefs → /api/extract).
 * Server maps these to real backends; unimplemented IDs fall back safely.
 */

export type ExtractionProviderId =
  | "auto"
  | "openai"
  | "apple-intelligence"
  | "groq-asr"
  | "nvidia-parakeet"
  | "whisperkit"
  | "apple-speech"
  | "offline";

export type LlmProviderId =
  | "auto"
  | "openai"
  | "apple-intelligence"
  | "groq-llm"
  | "offline";

export const EXTRACTION_PROVIDER_OPTIONS: {
  id: ExtractionProviderId;
  label: string;
  hint: string;
}[] = [
  {
    id: "auto",
    label: "Automatic (recommended)",
    hint: "Uses OpenAI when this deployment is configured, otherwise falls back to offline processing.",
  },
  {
    id: "openai",
    label: "OpenAI",
    hint: "AI decision capture through your server-side OpenAI configuration.",
  },
  {
    id: "offline",
    label: "Offline only",
    hint: "No external AI calls. Uses local heuristics for deterministic capture.",
  },
];

export const LLM_PROVIDER_OPTIONS: {
  id: LlmProviderId;
  label: string;
  hint: string;
}[] = [
  {
    id: "auto",
    label: "Automatic",
    hint: "Follows capture provider and server keys.",
  },
  {
    id: "openai",
    label: "OpenAI",
    hint: "GPT models via your configured API key.",
  },
  {
    id: "apple-intelligence",
    label: "Apple Intelligence",
    hint: "",
  },
  {
    id: "groq-llm",
    label: "Groq",
    hint: "",
  },
  {
    id: "offline",
    label: "None (offline)",
    hint: "No model post-processing.",
  },
];

/** Map client preference to server extraction behavior (honest: only OpenAI path is live today). */
/** When user “installs” a marketplace engine, sync extraction dropdown in settings. */
export const MARKETPLACE_INSTALL_TO_EXTRACTION: Partial<
  Record<string, ExtractionProviderId>
> = {
  "apple-intelligence": "apple-intelligence",
  "nvidia-parakeet": "nvidia-parakeet",
  whisperkit: "whisperkit",
  "groq-asr": "groq-asr",
  "openai-whisper": "openai",
  "openai-compatible": "openai",
  "apple-speech": "apple-speech",
  "qwen3-asr-3b-4bit": "offline",
  "qwen3-asr-3b-8bit": "offline",
  "qwen3-asr-1.7b-4bit": "offline",
  "qwen3-asr-1.7b-8bit": "offline",
};

/** When user enables an LLM listing in Marketplace, sync the Settings default. */
export const MARKETPLACE_INSTALL_TO_LLM: Partial<Record<string, LlmProviderId>> = {
  "openai-llm": "openai",
  "groq-llm": "groq-llm",
};

export function resolveExtractionRoute(
  extractionProviderId: string | undefined,
  openaiConfigured: boolean
): "openai" | "offline" {
  const id = (extractionProviderId ?? "auto") as ExtractionProviderId;
  if (id === "offline") return "offline";
  if (id === "openai" || id === "auto") {
    return openaiConfigured ? "openai" : "offline";
  }
  return "offline";
}
