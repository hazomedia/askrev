-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "intendedBinarySide" "BinaryLeg" DEFAULT 'LEFT';
