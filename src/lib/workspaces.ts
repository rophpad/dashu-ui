import { config } from "./config";

export const ENV_WORKSPACE_ID = "configured";

export type Workspace = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
};

export type PublicWorkspace = {
  id: string;
  name: string;
  label: string;
  source: "env";
  editable: false;
};

function configuredWorkspace(): Workspace | null {
  if (!config.databaseUrl) return null;
  let name = "Database";
  try {
    name = new URL(config.databaseUrl).pathname.replace(/^\//, "") || "Database";
  } catch {}
  return { id: ENV_WORKSPACE_ID, name, url: config.databaseUrl, createdAt: "" };
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const workspace = configuredWorkspace();
  return workspace ? [workspace] : [];
}

export async function activeWorkspace(): Promise<Workspace | null> {
  return configuredWorkspace();
}

export async function activeWorkspaceId(): Promise<string | null> {
  return configuredWorkspace()?.id ?? null;
}

export function toPublic(workspace: Workspace): PublicWorkspace {
  let label = "configured database";
  try {
    const url = new URL(workspace.url);
    label = `${url.username ? `${url.username}@` : ""}${url.hostname}:${url.port || "5432"}${url.pathname}`;
  } catch {}
  return { id: workspace.id, name: workspace.name, label, source: "env", editable: false };
}
