-- CreateEnum
CREATE TYPE "PackageCategory" AS ENUM ('LOGO_ONLY', 'BUSINESS_KIT', 'BRAND_KIT', 'BRAND_KIT_SOCIAL', 'FULL_IDENTITY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AddonCategory" AS ENUM ('FORMAT', 'MOCKUP', 'BRAND_ASSET', 'SOCIAL_MEDIA', 'USAGE_RIGHTS', 'EXTRA');

-- CreateEnum
CREATE TYPE "ReviewKind" AS ENUM ('MILESTONE', 'FINAL');

-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'INCOMING';

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_designerId_fkey";

-- AlterTable
ALTER TABLE "Addon" ADD COLUMN     "category" "AddonCategory" NOT NULL DEFAULT 'EXTRA',
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "ClientContact" ADD COLUMN     "company" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "category" "PackageCategory" NOT NULL DEFAULT 'LOGO_ONLY',
ADD COLUMN     "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "popular" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "budgetMinor" INTEGER,
ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "references" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "designerId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "clientContactId" TEXT NOT NULL,
    "kind" "ReviewKind" NOT NULL,
    "rating" INTEGER,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_projectId_createdAt_idx" ON "Review"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_clientContactId_fkey" FOREIGN KEY ("clientContactId") REFERENCES "ClientContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
