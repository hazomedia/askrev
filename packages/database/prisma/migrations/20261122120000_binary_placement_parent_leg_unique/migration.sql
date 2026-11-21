-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BinaryPlacement_parentId_leg_key" ON "BinaryPlacement"("parentId", "leg");
