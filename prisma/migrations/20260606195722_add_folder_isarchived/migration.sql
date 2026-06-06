-- Add isArchived column to Folder (soft-delete for trash)
ALTER TABLE "Folder" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Folder_isArchived_idx" ON "Folder"("isArchived");
