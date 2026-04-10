-- AlterTable
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "themeKey" TEXT NOT NULL DEFAULT 'classic';
