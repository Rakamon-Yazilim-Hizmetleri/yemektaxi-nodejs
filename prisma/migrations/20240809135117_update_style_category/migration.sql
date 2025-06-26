/*
  Warnings:

  - A unique constraint covering the columns `[modelId]` on the table `Style` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `modelId` to the `Style` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "loraPrompt" TEXT,
ALTER COLUMN "banner" DROP NOT NULL,
ALTER COLUMN "prompt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Style" ADD COLUMN     "loraPrompt" TEXT,
ADD COLUMN     "modelId" TEXT NOT NULL,
ALTER COLUMN "banner" DROP NOT NULL,
ALTER COLUMN "prompt" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Style_modelId_key" ON "Style"("modelId");
