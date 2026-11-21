import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('--- CHECKING MISSING PRISMA MIGRATIONS ---');

const migrationDir = path.resolve('packages/database/prisma/migrations');
const migrations = fs.readdirSync(migrationDir).filter(f => fs.statSync(path.join(migrationDir, f)).isDirectory());
console.log('Existing migrations in filesystem:', migrations);

// Check if 20261122000000_user_intended_binary_side already exists
const targetMigrationName = '20261122000000_user_intended_binary_side';
const targetDir = path.join(migrationDir, targetMigrationName);

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  const migrationSql = `-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "intendedBinarySide" "BinaryLeg" DEFAULT 'LEFT';
`;
  fs.writeFileSync(path.join(targetDir, 'migration.sql'), migrationSql);
  console.log(`Created migration: ${targetMigrationName}/migration.sql`);
} else {
  console.log(`Migration ${targetMigrationName} already exists.`);
}
