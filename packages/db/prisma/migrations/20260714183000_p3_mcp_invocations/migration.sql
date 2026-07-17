CREATE TABLE "mcp_tool_invocations" (
    "id" TEXT NOT NULL,
    "serviceAccountId" TEXT NOT NULL,
    "toolKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_tool_invocations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mcp_tool_invocations_serviceAccountId_createdAt_idx"
    ON "mcp_tool_invocations"("serviceAccountId", "createdAt");

ALTER TABLE "mcp_tool_invocations"
    ADD CONSTRAINT "mcp_tool_invocations_serviceAccountId_fkey"
    FOREIGN KEY ("serviceAccountId") REFERENCES "service_accounts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
