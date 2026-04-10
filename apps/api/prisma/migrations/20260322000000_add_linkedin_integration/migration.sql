-- CreateEnum
CREATE TYPE "LinkedInBlockType" AS ENUM ('PROFILE_CARD');

-- CreateTable
CREATE TABLE "linkedin_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "linkedinSub" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "profilePicUrl" TEXT,
    "profileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linkedin_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linkedin_blocks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LinkedInBlockType" NOT NULL,
    "postUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linkedin_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "linkedin_connections_userId_key" ON "linkedin_connections"("userId");

-- AddForeignKey
ALTER TABLE "linkedin_connections" ADD CONSTRAINT "linkedin_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linkedin_blocks" ADD CONSTRAINT "linkedin_blocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
