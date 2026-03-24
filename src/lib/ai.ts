import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export type AIProvider = "openai" | "google";

const PROVIDER_CONFIG: Record<
  AIProvider,
  { model: () => LanguageModel; name: string }
> = {
  openai: {
    model: () => openai("gpt-4o-mini"),
    name: "GPT-4o Mini",
  },
  google: {
    model: () => google("gemini-2.0-flash"),
    name: "Gemini 2.0 Flash",
  },
};

/**
 * Returns the AI model based on environment config or explicit provider.
 * Set AI_PROVIDER=openai|google in .env.local to switch globally.
 */
export function getAIModel(provider?: AIProvider): LanguageModel {
  const selected =
    provider ?? (process.env.AI_PROVIDER as AIProvider) ?? "google";
  const config = PROVIDER_CONFIG[selected] ?? PROVIDER_CONFIG.google;
  return config.model();
}

export function getProviderName(provider?: AIProvider): string {
  const selected =
    provider ?? (process.env.AI_PROVIDER as AIProvider) ?? "google";
  return PROVIDER_CONFIG[selected]?.name ?? "Gemini 2.0 Flash";
}
