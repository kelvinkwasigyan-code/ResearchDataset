-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Dataset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "license" TEXT NOT NULL DEFAULT 'CC-BY-4.0',
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "deletionRequested" BOOLEAN NOT NULL DEFAULT false,
    "deletionReason" TEXT,
    "deletionRequestedAt" DATETIME,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Dataset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Dataset" ("authors", "createdAt", "description", "downloadCount", "id", "license", "ownerId", "slug", "summary", "title", "updatedAt", "viewCount", "visibility") SELECT "authors", "createdAt", "description", "downloadCount", "id", "license", "ownerId", "slug", "summary", "title", "updatedAt", "viewCount", "visibility" FROM "Dataset";
DROP TABLE "Dataset";
ALTER TABLE "new_Dataset" RENAME TO "Dataset";
CREATE UNIQUE INDEX "Dataset_slug_key" ON "Dataset"("slug");
CREATE INDEX "Dataset_visibility_createdAt_idx" ON "Dataset"("visibility", "createdAt");
CREATE INDEX "Dataset_status_createdAt_idx" ON "Dataset"("status", "createdAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "institution" TEXT,
    "role" TEXT,
    "country" TEXT,
    "department" TEXT,
    "orcid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("country", "createdAt", "department", "email", "id", "institution", "name", "orcid", "passwordHash", "role") SELECT "country", "createdAt", "department", "email", "id", "institution", "name", "orcid", "passwordHash", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
