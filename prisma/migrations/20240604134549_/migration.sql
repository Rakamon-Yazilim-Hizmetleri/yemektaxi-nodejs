/*
  Warnings:

  - You are about to drop the column `name` on the `Predict` table. All the data in the column will be lost.
  - Added the required column `url` to the `Predict` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Predict" DROP COLUMN "name",
ADD COLUMN     "inputImage" TEXT,
ADD COLUMN     "url" TEXT NOT NULL;
