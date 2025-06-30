-- DropForeignKey
ALTER TABLE "OtpVerifications" DROP CONSTRAINT "OtpVerifications_userId_fkey";

-- AlterTable
ALTER TABLE "EmailVerifications" ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "OtpVerifications" ADD CONSTRAINT "OtpVerifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerifications" ADD CONSTRAINT "EmailVerifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
