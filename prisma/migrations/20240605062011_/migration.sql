-- CreateEnum
CREATE TYPE "StatusEnum" AS ENUM ('RUNNING', 'FAILED', 'SUCCEEDED', 'IN_QUE', 'PENDING');

-- AlterTable
ALTER TABLE "Predict" ADD COLUMN     "status" "StatusEnum" NOT NULL DEFAULT 'PENDING';
