import { dashuRunRoute } from "@rophpad/dashu-next";
import type { AskResult } from "@rophpad/dashu-core";
import { dashu, dashuRouteOptions } from "@/lib/dashu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const response = await dashuRunRoute(await dashu(), dashuRouteOptions)(request);
    const payload = await response.json();
    if (!response.ok) {
      const error = payload?.error;
      return Response.json(
        { error: error?.message ?? "Could not run that saved query.", kind: error?.code?.toLowerCase() },
        { status: response.status },
      );
    }

    const result = payload as AskResult;
    if (!result.answered) return Response.json({ error: result.answer.text, kind: "query" }, { status: 400 });
    const columns = result.data.columns.map((column) => column.label);
    const keys = result.data.columns.map((column) => column.key);
    return Response.json({
      answered: true,
      sql: result.query?.sql ?? "",
      columns,
      rows: result.data.rows.map((row) => keys.map((key) => row[key] ?? null)),
      rowCount: result.meta.rowCount,
      truncated: result.data.truncated,
      limit: result.meta.rowCount,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Dashu is not configured.", kind: "not_configured" },
      { status: 409 },
    );
  }
}
