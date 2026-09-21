CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Additive support knowledge-base storage. Import data separately via the KB CLI.
CREATE TABLE "support_knowledge_documents" (
    "id" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_knowledge_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_knowledge_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_knowledge_chunks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "support_knowledge_documents_sourcePath_key"
    ON "support_knowledge_documents"("sourcePath");

CREATE INDEX "support_knowledge_chunks_text_trgm_idx"
    ON "support_knowledge_chunks" USING GIN ((coalesce("text", '') || '') gin_trgm_ops);

ALTER TABLE "support_knowledge_chunks"
    ADD CONSTRAINT "support_knowledge_chunks_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "support_knowledge_documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
