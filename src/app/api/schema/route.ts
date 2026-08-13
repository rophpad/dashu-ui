import { dashuSchemaRoute } from "@rophpad/dashu-next";
import { dashu, dashuRouteOptions } from "@/lib/dashu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const response = await dashuSchemaRoute(await dashu(), dashuRouteOptions)(request);
    const payload = await response.json();
    if (!response.ok) {
      const error = payload?.error;
      return Response.json(
        { error: error?.message ?? "Could not read the database schema.", kind: error?.code?.toLowerCase() },
        { status: response.status },
      );
    }
    return Response.json({
      tables: payload.schema.tables,
      foreignKeys: payload.schema.relationships,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Dashu is not configured.", kind: "not_configured" },
      { status: 409 },
    );
  }
}
