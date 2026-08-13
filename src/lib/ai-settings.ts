import type { DashuAiProvider } from "@rophpad/dashu-core";
import { openAiCompatibleProvider } from "@rophpad/dashu-provider-openai-compatible";
import { managedProvider } from "@rophpad/dashu-provider-managed";
import { openRouterProvider } from "@rophpad/dashu-provider-openrouter";
import { config } from "./config";
import { readDocument, writeDocument } from "./storage";

export type AiMode = "managed" | "openrouter" | "local";

export type AiSettings = {
  mode: AiMode;
  openrouter: {
    apiKey: string;
    model: string;
  };
  local: {
    baseUrl: string;
    model: string;
    apiKey: string;
  };
};

export type PublicAiSettings = {
  mode: AiMode;
  configured: boolean;
  model: string;
  cloudUrl: string;
  openrouter: {
    hasApiKey: boolean;
    model: string;
  };
  local: {
    baseUrl: string;
    model: string;
    hasApiKey: boolean;
  };
};

type SettingsByUser = Record<string, AiSettings>;

const DEFAULTS: AiSettings = {
  mode: "managed",
  openrouter: { apiKey: "", model: "" },
  local: { baseUrl: "http://localhost:11434/v1", model: "", apiKey: "" },
};

function clean(settings?: Partial<AiSettings>): AiSettings {
  return {
    mode:
      settings?.mode === "openrouter" || settings?.mode === "local"
        ? settings.mode
        : "managed",
    openrouter: {
      apiKey: settings?.openrouter?.apiKey?.trim() ?? "",
      model: settings?.openrouter?.model?.trim() ?? "",
    },
    local: {
      baseUrl: settings?.local?.baseUrl?.trim() || DEFAULTS.local.baseUrl,
      model: settings?.local?.model?.trim() ?? "",
      apiKey: settings?.local?.apiKey?.trim() ?? "",
    },
  };
}

export async function getAiSettings(userId: string): Promise<AiSettings> {
  const all = await readDocument<SettingsByUser>("ai-settings", {});
  return clean(all[userId]);
}

export async function saveAiSettings(userId: string, next: AiSettings): Promise<AiSettings> {
  const all = await readDocument<SettingsByUser>("ai-settings", {});
  const settings = clean(next);
  await writeDocument("ai-settings", { ...all, [userId]: settings });
  return settings;
}

export function publicAiSettings(settings: AiSettings): PublicAiSettings {
  const configured =
    settings.mode === "managed"
      ? Boolean(config.cloudUrl && config.cloudCredential)
      : settings.mode === "openrouter"
        ? Boolean(settings.openrouter.apiKey && settings.openrouter.model)
        : Boolean(settings.local.baseUrl && settings.local.model);
  const model =
    settings.mode === "managed"
      ? "dashu-sql"
      : settings.mode === "openrouter"
        ? settings.openrouter.model
        : settings.local.model;

  return {
    mode: settings.mode,
    configured,
    model,
    cloudUrl: config.cloudUrl,
    openrouter: {
      hasApiKey: Boolean(settings.openrouter.apiKey),
      model: settings.openrouter.model,
    },
    local: {
      baseUrl: settings.local.baseUrl,
      model: settings.local.model,
      hasApiKey: Boolean(settings.local.apiKey),
    },
  };
}

export function createAiProvider(settings: AiSettings): DashuAiProvider {
  if (settings.mode === "openrouter") {
    if (!settings.openrouter.apiKey || !settings.openrouter.model) {
      throw new Error("Configure an OpenRouter API key and model in Settings.");
    }
    return openRouterProvider({
      apiKey: settings.openrouter.apiKey,
      model: settings.openrouter.model,
      timeoutMs: config.requestTimeoutMs,
    });
  }

  if (settings.mode === "local") {
    if (!settings.local.baseUrl || !settings.local.model) {
      throw new Error("Configure a local model URL and model in Settings.");
    }
    return openAiCompatibleProvider({
      name: "Local AI",
      mode: "local",
      baseUrl: settings.local.baseUrl,
      model: settings.local.model,
      apiKey: settings.local.apiKey || undefined,
      timeoutMs: config.requestTimeoutMs,
    });
  }

  if (!config.cloudUrl || !config.cloudCredential) {
    throw new Error("DASHU_CLOUD_URL and DASHU_CLOUD_CREDENTIAL are required for managed AI.");
  }
  return managedProvider({
    cloudUrl: config.cloudUrl,
    credential: config.cloudCredential,
    timeoutMs: config.requestTimeoutMs,
  });
}
