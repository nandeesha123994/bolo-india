-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "category" TEXT,
ADD COLUMN     "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hashtags" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "video" TEXT,
ADD COLUMN     "visibility" "PostVisibility" NOT NULL DEFAULT 'PUBLIC';
