-- Add app-level wallet balances and scope WhatsApp accounts to developer apps.

-- 1. App wallet table
CREATE TABLE IF NOT EXISTS "developer_app_wallets" (
  "id" TEXT NOT NULL,
  "developerAppId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'IQD',
  "totalAllocated" INTEGER NOT NULL DEFAULT 0,
  "totalSpent" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "developer_app_wallets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "developer_app_wallets_developerAppId_key" ON "developer_app_wallets"("developerAppId");
CREATE INDEX IF NOT EXISTS "developer_app_wallets_developerAppId_idx" ON "developer_app_wallets"("developerAppId");
CREATE INDEX IF NOT EXISTS "developer_app_wallets_balance_idx" ON "developer_app_wallets"("balance");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developer_app_wallets_developerAppId_fkey') THEN
    ALTER TABLE "developer_app_wallets"
      ADD CONSTRAINT "developer_app_wallets_developerAppId_fkey"
      FOREIGN KEY ("developerAppId") REFERENCES "developer_apps"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "developer_app_wallets" (
  "id",
  "developerAppId",
  "balance",
  "currency",
  "totalAllocated",
  "totalSpent",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text || da."id"),
  da."id",
  0,
  'IQD',
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "developer_apps" da
LEFT JOIN "developer_app_wallets" daw ON daw."developerAppId" = da."id"
WHERE daw."id" IS NULL;

-- 2. Scope WhatsApp accounts to developer apps
ALTER TABLE "developer_whatsapp_accounts" ADD COLUMN IF NOT EXISTS "developerAppId" TEXT;

WITH first_apps AS (
  SELECT DISTINCT ON ("userId") "userId", "id"
  FROM "developer_apps"
  WHERE "status" <> 'DELETED'
  ORDER BY "userId", "createdAt" ASC
)
UPDATE "developer_whatsapp_accounts" dwa
SET "developerAppId" = fa."id"
FROM first_apps fa
WHERE dwa."developerAppId" IS NULL
  AND dwa."userId" = fa."userId";

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "developer_whatsapp_accounts" WHERE "developerAppId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot backfill developerAppId for all developer_whatsapp_accounts';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developer_whatsapp_accounts_developerAppId_fkey') THEN
    ALTER TABLE "developer_whatsapp_accounts"
      ADD CONSTRAINT "developer_whatsapp_accounts_developerAppId_fkey"
      FOREIGN KEY ("developerAppId") REFERENCES "developer_apps"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "developer_whatsapp_accounts" ALTER COLUMN "developerAppId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "developer_whatsapp_accounts_developerAppId_idx" ON "developer_whatsapp_accounts"("developerAppId");

-- 3. Extend wallet transaction enum
DO $$ BEGIN
  ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'APP_ALLOCATION';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;