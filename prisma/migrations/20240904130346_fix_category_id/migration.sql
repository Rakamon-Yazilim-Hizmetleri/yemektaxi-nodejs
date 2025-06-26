/*
  Warnings:

  - You are about to drop the column `category` on the `FluxPrompt` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `FluxPrompt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FluxPrompt" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT NOT NULL;
