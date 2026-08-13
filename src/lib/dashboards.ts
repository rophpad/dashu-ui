import { randomBytes } from "node:crypto";
import { readDocument, writeDocument } from "./storage";
import type { ChartSpec } from "@/components/types";

/**
 * Saved questions, grouped into dashboards, scoped to a workspace.
 *
 * A card keeps both the question and the SQL it produced. Re-opening a
 * dashboard replays the *SQL* — no model call, no cost, and the same numbers
 * every time — while the question stays around so the card can be regenerated
 * when the schema moves underneath it.
 */

export type DashboardCard = {
  id: string;
  title: string;
  /** The natural-language prompt, kept so the card can be rebuilt. */
  question: string;
  /** The SQL that answered it, replayed on load. */
  sql: string;
  explanation: string;
  chart: ChartSpec;
  createdAt: string;
};

export type Dashboard = {
  id: string;
  workspaceId: string;
  name: string;
  cards: DashboardCard[];
  createdAt: string;
  updatedAt: string;
};


const globalForDashboards = globalThis as unknown as {
  askdbDashboards?: Dashboard[];
};

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

async function readAll(): Promise<Dashboard[]> {
  if (globalForDashboards.askdbDashboards) return globalForDashboards.askdbDashboards;

  const stored = await readDocument<Dashboard[]>("dashboards", []);
  const all = Array.isArray(stored) ? stored : [];
  globalForDashboards.askdbDashboards = all;
  return all;
}

async function writeAll(all: Dashboard[]): Promise<void> {
  await writeDocument("dashboards", all);
  globalForDashboards.askdbDashboards = all;
}

/** Dashboards belonging to one workspace, most recently updated first. */
export async function listDashboards(workspaceId: string): Promise<Dashboard[]> {
  const all = await readAll();
  return all
    .filter((d) => d.workspaceId === workspaceId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Scoped by workspace so a dashboard id from another database can't be read. */
export async function getDashboard(
  id: string,
  workspaceId: string,
): Promise<Dashboard | null> {
  const all = await readAll();
  return all.find((d) => d.id === id && d.workspaceId === workspaceId) ?? null;
}

export async function createDashboard(
  workspaceId: string,
  name: string,
): Promise<Dashboard> {
  const now = new Date().toISOString();
  const dashboard: Dashboard = {
    id: newId("d"),
    workspaceId,
    name: name.trim().slice(0, 80) || "Untitled dashboard",
    cards: [],
    createdAt: now,
    updatedAt: now,
  };

  await writeAll([...(await readAll()), dashboard]);
  return dashboard;
}

async function mutate(
  id: string,
  workspaceId: string,
  fn: (d: Dashboard) => Dashboard,
): Promise<Dashboard> {
  const all = await readAll();
  const index = all.findIndex((d) => d.id === id && d.workspaceId === workspaceId);
  if (index === -1) throw new Error("No such dashboard.");

  const updated = { ...fn(all[index]), updatedAt: new Date().toISOString() };
  const next = [...all];
  next[index] = updated;
  await writeAll(next);
  return updated;
}

export async function renameDashboard(
  id: string,
  workspaceId: string,
  name: string,
): Promise<Dashboard> {
  const clean = name.trim().slice(0, 80);
  if (!clean) throw new Error("Give the dashboard a name.");
  return mutate(id, workspaceId, (d) => ({ ...d, name: clean }));
}

export async function deleteDashboard(id: string, workspaceId: string): Promise<void> {
  const all = await readAll();
  await writeAll(all.filter((d) => !(d.id === id && d.workspaceId === workspaceId)));
}

/** Maximum cards per dashboard — each one is a query on every load. */
const MAX_CARDS = 24;

export async function addCard(
  id: string,
  workspaceId: string,
  card: Omit<DashboardCard, "id" | "createdAt">,
): Promise<Dashboard> {
  return mutate(id, workspaceId, (d) => {
    if (d.cards.length >= MAX_CARDS) {
      throw new Error(`A dashboard holds at most ${MAX_CARDS} cards.`);
    }
    return {
      ...d,
      cards: [
        ...d.cards,
        {
          ...card,
          title: card.title.trim().slice(0, 120) || card.question.slice(0, 120),
          id: newId("card"),
          createdAt: new Date().toISOString(),
        },
      ],
    };
  });
}

export async function removeCard(
  id: string,
  workspaceId: string,
  cardId: string,
): Promise<Dashboard> {
  return mutate(id, workspaceId, (d) => ({
    ...d,
    cards: d.cards.filter((c) => c.id !== cardId),
  }));
}

/** Move a card one slot up or down, for arranging the page. */
export async function moveCard(
  id: string,
  workspaceId: string,
  cardId: string,
  direction: "up" | "down",
): Promise<Dashboard> {
  return mutate(id, workspaceId, (d) => {
    const index = d.cards.findIndex((c) => c.id === cardId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= d.cards.length) return d;

    const cards = [...d.cards];
    [cards[index], cards[target]] = [cards[target], cards[index]];
    return { ...d, cards };
  });
}

/** Replace a card's SQL after regenerating it from the question. */
export async function updateCard(
  id: string,
  workspaceId: string,
  cardId: string,
  patch: Partial<Pick<DashboardCard, "sql" | "explanation" | "chart" | "title">>,
): Promise<Dashboard> {
  return mutate(id, workspaceId, (d) => ({
    ...d,
    cards: d.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
  }));
}

/** Drop everything belonging to a workspace that is being removed. */
export async function deleteWorkspaceDashboards(workspaceId: string): Promise<void> {
  const all = await readAll();
  const remaining = all.filter((d) => d.workspaceId !== workspaceId);
  if (remaining.length !== all.length) await writeAll(remaining);
}
