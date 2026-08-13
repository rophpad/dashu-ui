/** Runtime configuration. Secrets remain server-only. */


function first(...values: Array<string | undefined>): string {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

export const config = {
  /** Read-only product database queried by Dashu. */
  databaseUrl: first(process.env.DASHU_DATABASE_URL),
  /** Optional persistence database for users, dashboards, settings and saved queries. */
  storageDatabaseUrl: first(process.env.DASHU_STORAGE_DATABASE_URL),
  /** Dashu Cloud endpoint and revocable installation credential. */
  cloudUrl: first(process.env.DASHU_CLOUD_URL, "https://dashu.vercel.app").replace(/\/+$/, ""),
  cloudCredential: first(process.env.DASHU_CLOUD_CREDENTIAL),
  /** Fixed private JSON fallback directory when storage PostgreSQL is not set. */
  dataDir: `${process.cwd()}/.dashu`,

  // Product defaults are intentionally not part of the deployment contract.
  maxOutputTokens: 2000,
  requestTimeoutMs: 60_000,
  maxRows: 500,
  statementTimeoutMs: 15_000,
  schemaTtlMs: 60_000,
  schemas: ["public"],
  ipFamily: "4",
};
