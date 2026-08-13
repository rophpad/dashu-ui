import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { config } from "./config";

const { Pool } = pg;
type StoragePool = pg.Pool;

const globalForStorage = globalThis as unknown as {
  dashuStoragePool?: StoragePool;
  dashuStorageReady?: Promise<void>;
};

function pool(): StoragePool | null {
  if (!config.storageDatabaseUrl) return null;
  globalForStorage.dashuStoragePool ??= new Pool({
    connectionString: config.storageDatabaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: "dashu-ui-storage",
  });
  return globalForStorage.dashuStoragePool;
}

async function ensureTable(database: StoragePool): Promise<void> {
  globalForStorage.dashuStorageReady ??= database
    .query(`
      CREATE TABLE IF NOT EXISTS dashu_ui_documents (
        key text PRIMARY KEY,
        value jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    .then(() => undefined);
  await globalForStorage.dashuStorageReady;
}

function jsonFile(key: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(key)) throw new Error("Invalid storage key.");
  return path.join(config.dataDir, `${key}.json`);
}

/**
 * UI-owned persistence. When DASHU_STORAGE_DATABASE_URL is configured every
 * document is stored in PostgreSQL; otherwise the same documents are stored as
 * private JSON files in DASHU_DATA_DIR.
 */
export async function readDocument<T>(key: string, fallback: T): Promise<T> {
  const database = pool();
  if (database) {
    await ensureTable(database);
    const result = await database.query<{ value: T }>(
      "SELECT value FROM dashu_ui_documents WHERE key = $1",
      [key],
    );
    return result.rows[0]?.value ?? fallback;
  }

  try {
    return JSON.parse(await readFile(jsonFile(key), "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`[dashu] could not read ${key}:`, error);
    }
    return fallback;
  }
}

export async function writeDocument<T>(key: string, value: T): Promise<void> {
  const database = pool();
  if (database) {
    await ensureTable(database);
    await database.query(
      `INSERT INTO dashu_ui_documents (key, value, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(value)],
    );
    return;
  }

  await mkdir(config.dataDir, { recursive: true, mode: 0o700 });
  await writeFile(jsonFile(key), JSON.stringify(value, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
}

export async function deleteDocument(key: string): Promise<void> {
  const database = pool();
  if (database) {
    await ensureTable(database);
    await database.query("DELETE FROM dashu_ui_documents WHERE key = $1", [key]);
    return;
  }
  await unlink(jsonFile(key)).catch((error) => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  });
}

export function storageKind(): "postgres" | "json" {
  return config.storageDatabaseUrl ? "postgres" : "json";
}
