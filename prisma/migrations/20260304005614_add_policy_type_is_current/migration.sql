-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PolicyDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "extension" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "policyType" TEXT NOT NULL DEFAULT 'SIGNED_PDF',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "archivedById" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PolicyDocument_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PolicyDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PolicyDocument" (
    "id", "extension", "version", "originalName", "storagePath",
    "fileSize", "mimeType", "policyType", "isCurrent", "isArchived",
    "archivedAt", "archivedById", "uploadedById", "createdAt"
)
SELECT
    "id", "extension", "version", "originalName", "storagePath",
    "fileSize", "mimeType",
    CASE
        WHEN "extension" IN ('ppt', 'pptx') THEN 'POLICY_PPT'
        ELSE 'SIGNED_PDF'
    END,
    0,
    "isArchived", "archivedAt", "archivedById", "uploadedById", "createdAt"
FROM "PolicyDocument";
DROP TABLE "PolicyDocument";
ALTER TABLE "new_PolicyDocument" RENAME TO "PolicyDocument";

-- Backfill: set isCurrent=true for the latest non-archived doc per policyType
UPDATE "PolicyDocument"
SET "isCurrent" = 1
WHERE "id" = (
    SELECT "id" FROM "PolicyDocument"
    WHERE "policyType" = 'SIGNED_PDF' AND "isArchived" = 0
    ORDER BY "createdAt" DESC LIMIT 1
);

UPDATE "PolicyDocument"
SET "isCurrent" = 1
WHERE "id" = (
    SELECT "id" FROM "PolicyDocument"
    WHERE "policyType" = 'POLICY_PPT' AND "isArchived" = 0
    ORDER BY "createdAt" DESC LIMIT 1
);

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
