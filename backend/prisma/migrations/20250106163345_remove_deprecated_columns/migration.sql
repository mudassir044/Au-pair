-- AlterTable: Remove deprecated columns if they exist
ALTER TABLE "users" DROP COLUMN IF EXISTS "preferredlanguage";
ALTER TABLE "users" DROP COLUMN IF EXISTS "profilecompleted";
