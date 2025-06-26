/*
  Warnings:

  - You are about to drop the column `appleSub` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `googleSub` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_appleSub_key";

-- DropIndex
DROP INDEX "User_googleSub_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "appleSub",
DROP COLUMN "googleSub";
