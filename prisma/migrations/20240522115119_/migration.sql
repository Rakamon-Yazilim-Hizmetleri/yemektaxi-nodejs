/*
  Warnings:

  - You are about to drop the column `cost` on the `CreditHistory` table. All the data in the column will be lost.
  - Added the required column `amount` to the `CreditHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CreditHistory" DROP COLUMN "cost",
ADD COLUMN     "amount" INTEGER NOT NULL;
