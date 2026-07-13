CREATE TYPE "ScanActionMode" AS ENUM ('IMMEDIATE', 'CONFIRM');

ALTER TABLE "users"
ADD COLUMN "scan_action_mode" "ScanActionMode" NOT NULL DEFAULT 'IMMEDIATE';
