
import { config } from "./config";
import { readDocument, writeDocument } from "./storage";

/**
 * Optional semantic layer. Maps business vocabulary onto the physical schema so
 * "revenue" reliably resolves to `payments.amount` instead of being guessed.
 * The layer is saved through the UI and scoped to the configured database.
 */
export type SemanticLayer = {
  terms: Record<string, string>;
  notes: string[];
};

export const EMPTY_LAYER: SemanticLayer = { terms: {}, notes: [] };

type SavedLayers = Record<string, SemanticLayer>;

const globalForSemantic = globalThis as unknown as {
  askdbSavedLayers?: SavedLayers;
};


/**
 * Glossaries are keyed by workspace, so two workspaces on the same database can
 * still describe it differently — and renaming or repointing one never drags
 * another's vocabulary along.
 */
export async function connectionKey(): Promise<string | null> {
  return config.databaseUrl ? "configured" : null;
}


async function readSavedLayers(): Promise<SavedLayers> {
  if (globalForSemantic.askdbSavedLayers) return globalForSemantic.askdbSavedLayers;

  const stored = await readDocument<SavedLayers>("semantic", {});
  const layers = stored && typeof stored === "object" ? stored : {};
  globalForSemantic.askdbSavedLayers = layers;
  return layers;
}

export type SemanticSource = "saved" | "none";

export async function resolveSemanticLayer(): Promise<{
  layer: SemanticLayer;
  source: SemanticSource;
  scope: string | null;
}> {
  const key = await connectionKey();
  const saved = await readSavedLayers();

  if (key && saved[key]) {
    return { layer: saved[key], source: "saved", scope: key };
  }

  return { layer: EMPTY_LAYER, source: "none", scope: key };
}

/** Used by the ask route; identical resolution, layer only. */
export async function loadSemanticLayer(): Promise<SemanticLayer> {
  return (await resolveSemanticLayer()).layer;
}

export async function saveSemanticLayer(layer: SemanticLayer): Promise<string> {
  const key = await connectionKey();
  if (!key) throw new Error("Connect a database before saving a semantic layer.");

  const layers = { ...(await readSavedLayers()), [key]: layer };
  await writeDocument("semantic", layers);
  globalForSemantic.askdbSavedLayers = layers;
  return key;
}

/** Drop the saved layer for the configured database. */
export async function clearSemanticLayer(): Promise<void> {
  const key = await connectionKey();
  if (!key) return;

  const layers = { ...(await readSavedLayers()) };
  delete layers[key];
  await writeDocument("semantic", layers);
  globalForSemantic.askdbSavedLayers = layers;
}

/** Normalise whatever the UI submitted into a clean layer. */
export function sanitiseLayer(input: unknown): SemanticLayer {
  const raw = (input ?? {}) as Partial<SemanticLayer>;

  const terms: Record<string, string> = {};
  if (raw.terms && typeof raw.terms === "object") {
    for (const [term, meaning] of Object.entries(raw.terms)) {
      const key = String(term).trim();
      const value = String(meaning ?? "").trim();
      if (key && value) terms[key.slice(0, 120)] = value.slice(0, 600);
    }
  }

  const notes = Array.isArray(raw.notes)
    ? raw.notes
        .map((n) => String(n ?? "").trim())
        .filter(Boolean)
        .map((n) => n.slice(0, 600))
        .slice(0, 40)
    : [];

  return { terms, notes };
}

