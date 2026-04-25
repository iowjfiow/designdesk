/*
  Warnings:

  - The values [CLIENT_APPROVE,DESIGNER_ACCEPT,MANAGER_SUBMIT,CLIENT_VERIFY] on the enum `ApprovalKind` will be removed. If these variants are still used in the database, this will fail.
  - The values [CLIENT] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `clientId` on the `Approval` table. All the data in the column will be lost.
  - You are about to drop the column `senderId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `Project` table. All the data in the column will be lost.
  - Added the required column `senderName` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientContactId` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AccessTokenRole" AS ENUM ('CLIENT', 'READONLY');

-- AlterEnum
BEGIN;
CREATE TYPE "ApprovalKind_new" AS ENUM ('SCOPE_DESIGNER', 'SCOPE_MANAGER', 'MILESTONE_CLIENT', 'MILESTONE_DESIGNER_SUBMIT');
ALTER TABLE "Approval" ALTER COLUMN "kind" TYPE "ApprovalKind_new" USING ("kind"::text::"ApprovalKind_new");
ALTER TYPE "ApprovalKind" RENAME TO "ApprovalKind_old";
ALTER TYPE "ApprovalKind_new" RENAME TO "ApprovalKind";
DROP TYPE "public"."ApprovalKind_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProjectStatus" ADD VALUE 'AWAITING_APPROVAL';
ALTER TYPE "ProjectStatus" ADD VALUE 'SCOPE_APPROVED';

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'DESIGNER', 'CLIENT_MANAGER');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'DESIGNER';
COMMIT;

-- DropForeignKey
ALTER TABLE "Approval" DROP CONSTRAINT "Approval_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_raisedById_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_clientId_fkey";

-- DropIndex
DROP INDEX "Project_clientId_idx";

-- AlterTable
ALTER TABLE "Approval" DROP COLUMN "clientId",
ADD COLUMN     "clientContactId" TEXT;

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "raisedByClientContactId" TEXT,
ALTER COLUMN "raisedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "senderId",
ADD COLUMN     "senderClientContactId" TEXT,
ADD COLUMN     "senderName" TEXT NOT NULL,
ADD COLUMN     "senderUserId" TEXT;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "clientId",
ADD COLUMN     "clientContactId" TEXT NOT NULL,
ADD COLUMN     "designerApprovedAt" TIMESTAMP(3),
ADD COLUMN     "managerApprovedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'DESIGNER';

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAccessToken" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT,
    "role" "AccessTokenRole" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientContact_email_key" ON "ClientContact"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAccessToken_tokenHash_key" ON "ProjectAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ProjectAccessToken_projectId_idx" ON "ProjectAccessToken"("projectId");

-- CreateIndex
CREATE INDEX "Project_clientContactId_idx" ON "Project"("clientContactId");

-- AddForeignKey
ALTER TABLE "ProjectAccessToken" ADD CONSTRAINT "ProjectAccessToken_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientContactId_fkey" FOREIGN KEY ("clientContactId") REFERENCES "ClientContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_clientContactId_fkey" FOREIGN KEY ("clientContactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderClientContactId_fkey" FOREIGN KEY ("senderClientContactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
