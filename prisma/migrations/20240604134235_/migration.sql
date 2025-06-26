/*
  Warnings:

  - Added the required column `userId` to the `Predict` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Predict" ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Predict" ADD CONSTRAINT "Predict_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
