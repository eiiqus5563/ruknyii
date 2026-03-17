-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "InstagramBlockType" AS ENUM ('GRID', 'FEED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alter column to use enum
ALTER TABLE "instagram_blocks" ALTER COLUMN "type" TYPE "InstagramBlockType" USING "type"::"InstagramBlockType";
