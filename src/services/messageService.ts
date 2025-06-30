import axios from "axios";
import { logger } from "../utils/logger";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface MessageResponse {
  succeeded: boolean;
  message: string;
  item?: any;
}

interface OtpModel {
  userId: string;
  otpCode: string;
}

export class MessageService {
  private readonly OTP_REMAINING_TIME_SECONDS = 180;
  private readonly OTP_EXPIRY_MINUTES = 3;
  private readonly OTP_COOLDOWN_MINUTES = 3;
  private readonly netgsmUrl: string;
  private readonly netgsmUsername: string;
  private readonly netgsmPassword: string;

  constructor() {
    this.netgsmUrl = "https://api.netgsm.com.tr/sms/rest/v2/send";
    this.netgsmUsername = process.env.NETGSM_USERNAME || "";
    this.netgsmPassword = process.env.NETGSM_PASSWORD || "";
  }

  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtpCode(
    phoneNumber: string,
    userId: string,
  ): Promise<MessageResponse> {
    try {
      // Check for existing OTP verification for this phone number and user
      const existingOtpVerification = await prisma.otpVerification.findFirst({
        where: {
          phoneNumber,
          userId,
          isDeleted: false,
        },
      });

      // If existing OTP exists and cooldown period hasn't passed (3 minutes)
      if (existingOtpVerification) {
        const cooldownEndTime = new Date(
          existingOtpVerification.generateDate.getTime() +
            this.OTP_COOLDOWN_MINUTES * 60 * 1000,
        );

        if (cooldownEndTime > new Date()) {
          const remainingSeconds = Math.floor(
            (cooldownEndTime.getTime() - new Date().getTime()) / 1000,
          );

          return {
            succeeded: false,
            message: "Kod gönderme süresi dolmadı.",
            item: { RemainingTime: remainingSeconds },
          };
        }
      }

      // Generate new OTP code
      const otpCode = this.generateOtp();

      // Send SMS
      const smsResult = await this.sendSmsAsync(
        phoneNumber,
        `Kodunuz: ${otpCode}`,
      );
      if (!smsResult.succeeded) {
        return {
          succeeded: false,
          message: smsResult.message || "SMS gönderilemedi.",
        };
      }

      // Update existing OTP or create new one
      if (existingOtpVerification) {
        await prisma.otpVerification.update({
          where: { id: existingOtpVerification.id },
          data: {
            otpCode,
            createdDate: new Date(),
            isDeleted: false,
            status: "Active",
            updatedBy: "system",
          },
        });
      } else {
        await prisma.otpVerification.create({
          data: {
            userId,
            phoneNumber,
            otpCode,
            createdDate: new Date(),
            generateDate: new Date(),
            uniqueKey: `${userId}-${phoneNumber}-${Date.now()}`,
            isDeleted: false,
            status: "Active",
            updatedBy: "system",
          },
        });
      }

      logger.info(`OTP sent to ${phoneNumber}: ${otpCode}`);

      return {
        succeeded: true,
        message: "Kod gönderildi.",
        item: { RemainingTime: this.OTP_REMAINING_TIME_SECONDS },
      };
    } catch (error: any) {
      logger.error("OTP send error:", error);
      return {
        succeeded: false,
        message: "OTP gönderimi sırasında hata oluştu.",
      };
    }
  }

  async otpVerification(otpModel: OtpModel): Promise<MessageResponse> {
    try {
      // Find the OTP verification record within expiry time (3 minutes)
      const otpVerification = await prisma.otpVerification.findFirst({
        where: {
          userId: otpModel.userId,
          generateDate: {
            gte: new Date(Date.now() - this.OTP_EXPIRY_MINUTES * 60 * 1000), // Last 3 minutes
          },
        },
      });

      // Check if OTP exists and code matches
      if (!otpVerification || otpVerification.otpCode !== otpModel.otpCode) {
        return {
          succeeded: false,
          message: "Kod geçersiz veya süresi dolmuş.",
        };
      }

      // Update verification status
      await prisma.otpVerification.update({
        where: {
          id: otpVerification.id,
        },
        data: {
          verification: true,
        },
      });

      // Update user's phone verification status
      const user = await prisma.user.findFirst({
        where: {
          id: otpModel.userId,
          isDeleted: false,
        },
      });

      if (!user) {
        return {
          succeeded: false,
          message: "Kullanıcı bulunamadı.",
        };
      }

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          phoneVerification: true,
        },
      });

      logger.info(
        `OTP verification successful for user ${otpModel.userId}: ${otpModel.otpCode}`,
      );

      return {
        succeeded: true,
        message: "Kod doğrulandı.",
      };
    } catch (error: any) {
      logger.error("OTP verification error:", error);
      return {
        succeeded: false,
        message: "OTP doğrulama sırasında hata oluştu.",
      };
    }
  }

  private async sendSmsAsync(
    phoneNumber: string,
    message: string,
  ): Promise<MessageResponse> {
    try {
      const data = {
        msgheader: "yemektaxi",
        messages: [{ msg: message, no: phoneNumber }],
        encoding: "TR",
        iysfilter: "",
        partnercode: "",
      };

      const credentials = Buffer.from(
        `${this.netgsmUsername}:${this.netgsmPassword}`,
      ).toString("base64");

      const response = await axios.post(this.netgsmUrl, data, {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200) {
        return { succeeded: true, message: "SMS başarıyla gönderildi." };
      } else {
        return { succeeded: false, message: "SMS gönderimi başarısız." };
      }
    } catch (error: any) {
      logger.error("SMS send error:", error);
      return {
        succeeded: false,
        message: "SMS gönderimi sırasında hata oluştu.",
      };
    }
  }
}
