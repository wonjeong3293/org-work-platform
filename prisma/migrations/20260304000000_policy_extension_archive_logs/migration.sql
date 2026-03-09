-- CreateTable: PolicyDocument (new schema with extension + archive fields)
CREATE TABLE "PolicyDocument_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "extension" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "archivedById" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PolicyDocument_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PolicyDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Migrate data: convert type to extension
INSERT INTO "PolicyDocument_new" ("id", "extension", "version", "originalName", "storagePath", "fileSize", "mimeType", "isArchived", "uploadedById", "createdAt")
SELECT "id",
  CASE
    WHEN "type" = 'PPT' THEN 'pptx'
    WHEN "type" = 'PDF' THEN 'pdf'
    ELSE LOWER("type")
  END,
  "version", "originalName", "storagePath", "fileSize", "mimeType", 0, "uploadedById", "createdAt"
FROM "PolicyDocument";

-- Drop old table and rename new one
DROP TABLE "PolicyDocument";
ALTER TABLE "PolicyDocument_new" RENAME TO "PolicyDocument";

-- CreateTable: PolicyDocumentLog
CREATE TABLE "PolicyDocumentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT,
    "action" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PolicyDocumentLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PolicyDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PolicyDocumentLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
