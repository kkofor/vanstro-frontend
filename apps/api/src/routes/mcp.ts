import { prisma, type Prisma } from "@vanstro/db";
import { Hono } from "hono";
import {
  hasMachinePermission,
  requireMachineAccess,
  type MachineEnv,
  writeMachineAudit
} from "../auth/service-account-access.js";
import { getOperationalAlerts } from "../operations/alerts.js";

const MCP_TOOLS = [
  {
    key: "platform.health",
    description: "Read the VanStro API and database health state.",
    permission: "mcp.access"
  },
  {
    key: "operations.alerts",
    description: "Read failed and waiting ERP/email operation alerts.",
    permission: "mcp.access"
  }
] as const;

export function createMcpRoutes() {
  const routes = new Hono<MachineEnv>();

  routes.get("/mcp/health", async (context) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return context.json({ data: { status: "ok", service: "vanstro-mcp", database: "ok" } });
    } catch {
      return context.json(
        { data: { status: "error", service: "vanstro-mcp", database: "error" } },
        503
      );
    }
  });

  routes.get("/mcp/tools", requireMachineAccess("mcp.access"), (context) => {
    const account = context.get("serviceAccount");
    const tools = MCP_TOOLS.filter((tool) => hasMachinePermission(account, tool.permission));

    return context.json({ data: tools });
  });

  routes.post("/mcp", requireMachineAccess("mcp.access"), async (context) => {
    const body = await context.req.json().catch(() => null);
    const toolKey =
      body && typeof body === "object" && "tool" in body && typeof body.tool === "string"
        ? body.tool
        : undefined;

    if (!toolKey) return context.json({ error: "tool is required." }, 400);

    const account = context.get("serviceAccount");

    if (!hasMachinePermission(account, "mcp.tools.execute")) {
      return context.json({ error: "mcp.tools.execute is required." }, 403);
    }

    const invocation = await prisma.mcpToolInvocation.create({
      data: {
        serviceAccountId: account.id,
        toolKey,
        status: "running",
        input: { tool: toolKey }
      }
    });

    if (toolKey !== "platform.health" && toolKey !== "operations.alerts") {
      await prisma.mcpToolInvocation.update({
        where: { id: invocation.id },
        data: { status: "failed", error: "Tool is not registered." }
      });
      await writeMachineAudit(context, "mcp.tools.execute_failed", "mcp_tool", invocation.id, { tool: toolKey });

      return context.json({ error: "Tool is not registered." }, 404);
    }

    try {
      let output: Prisma.InputJsonObject;

      if (toolKey === "platform.health") {
        await prisma.$queryRaw`SELECT 1`;
        output = { status: "ok", service: "vanstro-api", database: "ok" };
      } else {
        output = { alerts: await getOperationalAlerts() };
      }
      const completed = await prisma.mcpToolInvocation.update({
        where: { id: invocation.id },
        data: { status: "succeeded", output }
      });
      await writeMachineAudit(context, "mcp.tools.execute", "mcp_tool", completed.id, { tool: toolKey });

      return context.json({ data: { invocation: completed, output } });
    } catch {
      await prisma.mcpToolInvocation.update({
        where: { id: invocation.id },
        data: { status: "failed", error: "Database is unavailable." }
      });
      await writeMachineAudit(context, "mcp.tools.execute_failed", "mcp_tool", invocation.id, { tool: toolKey });

      return context.json({ error: "Database is unavailable." }, 503);
    }
  });

  return routes;
}
