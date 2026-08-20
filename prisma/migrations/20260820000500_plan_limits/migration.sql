-- AlterTable
ALTER TABLE "plans" ADD COLUMN "max_contacts" INTEGER;

-- UpdateData: limite de empresas por conta passa a 5 (INDIVIDUAL e TEAM).
-- AGENCY permanece ilimitado (null).
UPDATE "plans"
SET "max_companies_per_account" = 5
WHERE "key" IN ('INDIVIDUAL', 'TEAM');