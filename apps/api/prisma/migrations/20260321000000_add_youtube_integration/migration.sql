-- CreateEnum
CREATE TYPE "YouTubeBlockType" AS ENUM ('LATEST_VIDEOS', 'SINGLE_VIDEO');

-- CreateTable
CREATE TABLE "youtube_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "channelId" TEXT NOT NULL,
    "channelTitle" TEXT NOT NULL,
    "channelThumbnail" TEXT,
    "subscriberCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user_id_fk" TEXT,

    CONSTRAINT "youtube_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "youtube_blocks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "YouTubeBlockType" NOT NULL,
    "videoUrl" TEXT,
    "videoId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "youtube_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "youtube_connections_userId_key" ON "youtube_connections"("userId");

-- AddForeignKey
ALTER TABLE "youtube_connections" ADD CONSTRAINT "youtube_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_blocks" ADD CONSTRAINT "youtube_blocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
