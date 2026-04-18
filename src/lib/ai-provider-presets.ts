/**
 * User-selectable extraction + LLM providers (prefs → /api/extract).
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
    label: "Automatic",
    hint: "Use OpenAI when configured; otherwise offline heuristics.",
  },
  {
    id: "openai",
    label: "OpenAI",
    hint: "GPT-powered extraction (requires OPENAI_API_KEY on the server).",
  },
  {
    id: "apple-intelligence",
    label: "Apple Intelligence",
    hint: "Saved as a preference only today; extraction still falls back until a server backend exists.",
  },
  {
    id: "groq-asr",
    label: "Groq",
    hint: "Planned provider. Stored here for future backend wiring; not live server-side today.",
  },
  {
    id: "nvidia-parakeet",
    label: "NVIDIA Parakeet",
    hint: "Planned local ASR path when a connected deployment exists.",
  },
  {
    id: "whisperkit",
    label: "WhisperKit",
    hint: "Planned on-device transcription path; not active in this deployment.",
  },
  {
    id: "apple-speech",
    label: "Apple Speech",
    hint: "Planned system speech path; not active in this deployment.",
  },
  {
    id: "offline",
    label: "Offline only",
    hint: "Heuristic extraction — no external AI calls.",
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
    hint: "Follows extraction provider and server keys.",
  },
  {
    id: "openai",
    label: "OpenAI",
    hint: "GPT models via your configured API key.",
  },
  {
    id: "apple-intelligence",
    label: "Apple Intelligence",
    hint: "Saved as a preference only today; no live Route5 backend path yet.",
  },
  {
    id: "groq-llm",
    label: "Groq",
    hint: "Planned provider; kept here for future backend support.",
  },
  {
    id: "offline",
    label: "None (offline)",
    hint: "No LLM post-processing.",
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
