"use client";

import { useEffect, useState, type FormEvent } from "react";

type Mode = "managed" | "openrouter" | "local";
type State = {
  configured: boolean;
  mode: Mode;
  model: string;
  cloudUrl: string;
  openrouter: { hasApiKey: boolean; model: string };
  local: { baseUrl: string; model: string; hasApiKey: boolean };
};

const empty: State = {
  configured: false,
  mode: "managed",
  model: "dashu-sql",
  cloudUrl: "",
  openrouter: { hasApiKey: false, model: "" },
  local: { baseUrl: "http://localhost:11434/v1", model: "", hasApiKey: false },
};

const fieldClass =
  "mt-1.5 w-full rounded-lg border bg-panel px-3 py-2 text-[13px] outline-none transition-colors focus:border-accent";

export default function AiSettingsPanel() {
  const [state, setState] = useState<State | null>(null);
  const [mode, setMode] = useState<Mode>("managed");
  const [openrouterModel, setOpenrouterModel] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [localUrl, setLocalUrl] = useState(empty.local.baseUrl);
  const [localModel, setLocalModel] = useState("");
  const [localKey, setLocalKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function apply(next: State) {
    setState(next);
    setMode(next.mode);
    setOpenrouterModel(next.openrouter.model);
    setLocalUrl(next.local.baseUrl);
    setLocalModel(next.local.model);
    setOpenrouterKey("");
    setLocalKey("");
  }

  useEffect(() => {
    fetch("/api/ai-settings")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load AI settings.");
        apply(body as State);
      })
      .catch((reason) => {
        setState(empty);
        setError(reason instanceof Error ? reason.message : "Could not load AI settings.");
      });
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          openrouter: { model: openrouterModel, apiKey: openrouterKey },
          local: { baseUrl: localUrl, model: localModel, apiKey: localKey },
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not save AI settings.");
      apply(body as State);
      setMessage("AI provider saved. New questions will use this provider.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save AI settings.");
    } finally {
      setSaving(false);
    }
  }

  if (!state) return <div className="h-32 animate-pulse rounded-lg bg-surface" />;

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {([
          ["managed", "Dashu Managed", "Cloud credential"],
          ["openrouter", "OpenRouter", "Your API key"],
          ["local", "Local model", "OpenAI-compatible"],
        ] as const).map(([value, title, description]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-lg border px-3 py-3 text-left transition-colors ${
              mode === value ? "border-accent bg-surface" : "bg-panel hover:bg-surface"
            }`}
          >
            <span className="block text-[13px] font-medium">{title}</span>
            <span className="mt-0.5 block text-[11px] text-muted">{description}</span>
          </button>
        ))}
      </div>

      {mode === "managed" && (
        <div className="rounded-lg border bg-surface px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium">Dashu Managed AI</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                Query planning runs through {state.cloudUrl || "Dashu Cloud"}. Configure it with
                <code className="mx-1 font-mono">DASHU_CLOUD_CREDENTIAL</code>.
              </p>
            </div>
            <Status configured={mode === state.mode && state.configured} />
          </div>
        </div>
      )}

      {mode === "openrouter" && (
        <div className="grid gap-3 rounded-lg border bg-surface px-4 py-3 sm:grid-cols-2">
          <label className="text-[12px] font-medium">
            Model
            <input
              value={openrouterModel}
              onChange={(event) => setOpenrouterModel(event.target.value)}
              placeholder="openai/gpt-4.1-mini"
              className={fieldClass}
              required
            />
          </label>
          <label className="text-[12px] font-medium">
            API key
            <input
              type="password"
              value={openrouterKey}
              onChange={(event) => setOpenrouterKey(event.target.value)}
              placeholder={state.openrouter.hasApiKey ? "Saved — leave blank to keep" : "sk-or-..."}
              className={fieldClass}
              required={!state.openrouter.hasApiKey}
              autoComplete="new-password"
            />
          </label>
          <p className="text-[11.5px] leading-relaxed text-muted sm:col-span-2">
            The key is stored in the configured storage database or private JSON fallback and is never returned to the browser.
          </p>
        </div>
      )}

      {mode === "local" && (
        <div className="grid gap-3 rounded-lg border bg-surface px-4 py-3 sm:grid-cols-2">
          <label className="text-[12px] font-medium sm:col-span-2">
            OpenAI-compatible base URL
            <input
              type="url"
              value={localUrl}
              onChange={(event) => setLocalUrl(event.target.value)}
              placeholder="http://localhost:11434/v1"
              className={fieldClass}
              required
            />
          </label>
          <label className="text-[12px] font-medium">
            Model
            <input
              value={localModel}
              onChange={(event) => setLocalModel(event.target.value)}
              placeholder="qwen2.5-coder:7b"
              className={fieldClass}
              required
            />
          </label>
          <label className="text-[12px] font-medium">
            API key <span className="font-normal text-muted">(optional)</span>
            <input
              type="password"
              value={localKey}
              onChange={(event) => setLocalKey(event.target.value)}
              placeholder={state.local.hasApiKey ? "Saved — leave blank to keep" : "Optional"}
              className={fieldClass}
              autoComplete="new-password"
            />
          </label>
          <p className="text-[11.5px] leading-relaxed text-muted sm:col-span-2">
            Works with Ollama, vLLM, LocalAI, llama.cpp, and other OpenAI-compatible servers reachable from this Dashu server.
          </p>
        </div>
      )}

      {(error || message) && (
        <p className={`text-[12.5px] ${error ? "text-danger" : "text-accent"}`}>
          {error ?? message}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11.5px] text-muted">
          Current provider: <span className="font-medium text-fg">{state.mode}</span>
          {state.model ? ` · ${state.model}` : ""}
        </p>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save provider"}
        </button>
      </div>
    </form>
  );
}

function Status({ configured }: { configured: boolean }) {
  return (
    <span className={`shrink-0 rounded-full border bg-panel px-2.5 py-1 text-[11px] font-medium ${configured ? "text-accent" : "text-muted"}`}>
      {configured ? "Connected" : "Not configured"}
    </span>
  );
}
