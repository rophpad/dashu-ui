import { createDashu, PERMISSIONS, type DashuActor } from "@rophpad/dashu-core";
import { postgresAdapter } from "@rophpad/dashu-database-postgres";
import { currentUser } from "./auth";
import { createAiProvider, getAiSettings } from "./ai-settings";
import { config } from "./config";
import { loadSemanticLayer } from "./semantic";

const DATA_SOURCE = "configured";

function requireEnvironment(name: string, value: string): string {
  if (!value.trim()) {
    throw new Error(`${name} is required. Add it to your environment and restart Dashu.`);
  }
  return value;
}

export async function dashu() {
  const user = await currentUser();
  if (!user) throw new Error("Sign in to continue.");

  const databaseUrl = requireEnvironment("DASHU_DATABASE_URL", config.databaseUrl);
  const aiSettings = await getAiSettings(user.id);

  return createDashu({
    ai: createAiProvider(aiSettings),
    dataSources: {
      [DATA_SOURCE]: postgresAdapter({
        connectionString: databaseUrl,
        schemas: config.schemas,
        schemaTtlMs: config.schemaTtlMs,
        ipFamily: config.ipFamily,
        applicationName: "dashu-ui",
      }),
    },
    defaultDataSource: DATA_SOURCE,
    maxOutputTokens: config.maxOutputTokens,
    defaults: {
      schemas: config.schemas,
      maxRows: config.maxRows,
      statementTimeoutMs: config.statementTimeoutMs,
      exposeSql: true,
      allowExport: true,
      allowSaveDashboard: true,
    },
  });
}

export async function dashuActor(): Promise<DashuActor | null> {
  const user = await currentUser();
  if (!user) return null;
  return {
    id: user.id,
    permissions: [
      PERMISSIONS.ask,
      PERMISSIONS.viewSchema,
      PERMISSIONS.viewSql,
      PERMISSIONS.export,
      PERMISSIONS.saveDashboard,
    ],
  };
}

export const dashuRouteOptions = {
  getActor: dashuActor,
  getSemanticLayer: loadSemanticLayer,
};
