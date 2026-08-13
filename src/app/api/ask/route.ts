import { dashuRoute } from "@rophpad/dashu-next";
import type { AskResult } from "@rophpad/dashu-core";
import { dashu, dashuRouteOptions } from "@/lib/dashu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorPayload(payload: unknown) {
  const error = (payload as { error?: { code?: string; message?: string } })?.error;
  return {
    error: error?.message ?? "Something went wrong handling that question.",
    kind: error?.code === "DATA_SOURCE_NOT_CONFIGURED" ? "not_configured" : error?.code?.toLowerCase(),
  };
}

/** Dashu SDK route with a compatibility response for the existing UI. */
export async function POST(request: Request): Promise<Response> {
  try {
    const response = await dashuRoute(await dashu(), dashuRouteOptions)(request);
    const payload = await response.json();
    if (!response.ok) {
      return Response.json(errorPayload(payload), { status: response.status });
    }

    const result = payload as AskResult;
    if (!result.answered) {
      return Response.json({ answered: false, explanation: result.answer.text });
    }

    const columns = result.data.columns.map((column) => column.label);
    const keys = result.data.columns.map((column) => column.key);
    const primary = result.display.primary;
    const chartType = primary.type.endsWith("-chart")
      ? primary.type.replace("-chart", "")
      : primary.type === "table" || primary.type === "metric"
        ? "none"
        : primary.type;

    return Response.json({
      answered: true,
      sql: result.query?.sql ?? "",
      explanation: result.answer.text,
      chart: {
        type: chartType,
        labelColumn: primary.x ?? "",
        valueColumn: primary.y ?? "",
      },
      columns,
      rows: result.data.rows.map((row) => keys.map((key) => row[key] ?? null)),
      rowCount: result.meta.rowCount,
      truncated: result.data.truncated,
      limit: result.meta.rowCount,
    });
  } catch (error) {
    console.error("[dashu] failed to create the ask route", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Dashu is not configured.", kind: "not_configured" },
      { status: 409 },
    );
  }
}
