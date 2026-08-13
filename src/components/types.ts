export type Cell = string | number | boolean | null;

export type ChartType = "none" | "bar" | "line" | "area" | "pie" | "scatter";

export type ChartSpec = {
  type: ChartType;
  labelColumn: string;
  valueColumn: string;
};

export type AskSuccess = {
  answered: true;
  sql: string;
  explanation: string;
  chart: ChartSpec;
  columns: string[];
  rows: Cell[][];
  rowCount: number;
  truncated: boolean;
  limit: number;
};

export type AskUnanswerable = {
  answered: false;
  explanation: string;
};

export type AskError = {
  error: string;
  kind?: string;
  sql?: string;
};

export type AskResponse = AskSuccess | AskUnanswerable | AskError;

export type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; result: AskSuccess }
  | { role: "assistant"; note: string }
  | { role: "assistant"; error: string; sql?: string; configure?: boolean };

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

export type Workspace = {
  id: string;
  name: string;
  /** Password-free `user@host:port/database`. */
  label: string;
  source: "env";
  editable: false;
};

export type LicenseState = {
  plan: "free" | "pro";
  licensedTo: string | null;
  expiresAt: string | null;
  problem: string | null;
  source: "cloud" | "none";
  editable: boolean;
};

export type WorkspaceState = {
  workspaces: Workspace[];
  activeId: string | null;

  schemas: string[];
  license?: LicenseState;
};

export type Column = {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  enumValues?: string[];
  comment?: string;
};

export type Table = {
  schema: string;
  name: string;
  kind: "table" | "view";
  columns: Column[];
  comment?: string;
};

export type SemanticLayer = {
  terms: Record<string, string>;
  notes: string[];
};

export type SemanticState = {
  layer: SemanticLayer;
  /** Whether a semantic layer has been saved. */
  source: "saved" | "none";
  /** Label of the connection this layer is scoped to. */
  scope: string | null;
};

export type ForeignKey = {
  fromSchema: string;
  fromTable: string;
  fromColumn: string;
  toSchema: string;
  toTable: string;
  toColumn: string;
};
