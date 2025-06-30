import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

interface EmailResponse {
  succeeded: boolean;
  message: string;
}

export class EmailService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || "";
    this.apiUrl = "https://api.brevo.com/v3/smtp/email";
  }

  async sendEmailAsync(
    toEmail: string,
    subject: string,
    body: string,
  ): Promise<EmailResponse> {
    try {
      const requestBody = {
        sender: { name: "YemekTaxi", email: "info@yemektaxi.com" },
        to: [{ email: toEmail, name: "Kullanıcı" }],
        subject: subject,
        htmlContent: body,
      };

      await axios.post(this.apiUrl, requestBody, {
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      return {
        succeeded: true,
        message: "Email başarıyla gönderildi.",
      };
    } catch (error: any) {
      logger.error("Email gönderimi sırasında hata:", error);
      return {
        succeeded: false,
        message: `Email gönderimi sırasında hata: ${error.message}`,
      };
    }
  }

  async sendVerificationEmailAsync(
    toEmail: string,
    verificationCode: string,
    userId: string,
  ): Promise<EmailResponse> {
    try {
      // Check if verification email already exists within last 24 hours
      const emailVerificationExists = await prisma.emailVerification.findFirst({
        where: {
          email: toEmail,
          isDeleted: false,
          createdDate: {
            gt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
          status: "Active",
        },
      });

      if (emailVerificationExists) {
        return {
          succeeded: false,
          message: "Bu email adresi için zaten bir doğrulama kodu gönderildi.",
        };
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html lang='tr'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Email Doğrulama</title>
        </head>
        <body style='margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;'>
            <div style='padding: 40px 20px;'>
                <div style='max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden;'>
                    
                    <!-- Header -->
                    <div style='background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 40px 30px; text-align: center;'>
                        <div style='background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2);'>
                            <span style='font-size: 36px; color: #ff6b6b;'>🍕</span>
                        </div>
                        <h1 style='color: white; margin: 0; font-size: 28px; font-weight: 700;'>YemekTaxi</h1>
                        <p style='color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;'>Lezzet kapınızda!</p>
                    </div>
                    
                    <!-- Content -->
                    <div style='padding: 50px 30px;'>
                        <div style='text-align: center; margin-bottom: 40px;'>
                            <h2 style='color: #2c3e50; margin: 0 0 15px; font-size: 24px; font-weight: 600;'>Email Adresinizi Doğrulayın</h2>
                            <p style='color: #7f8c8d; margin: 0; font-size: 16px; line-height: 1.6;'>
                                Hesabınızı aktifleştirmek için aşağıdaki doğrulama kodunu kullanın.
                            </p>
                        </div>
                        
                        <!-- Code Box -->
                        <div style='background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px dashed #dee2e6; border-radius: 15px; padding: 30px; text-align: center; margin: 30px 0;'>
                            <p style='color: #6c757d; margin: 0 0 15px; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;'>Doğrulama Kodu</p>
                            <div style='background: white; border-radius: 10px; padding: 20px; display: inline-block; box-shadow: 0 5px 15px rgba(0,0,0,0.1);'>
                                <span style='font-family: "Courier New", Consolas, monospace; font-size: 32px; font-weight: 700; color: #2c3e50; letter-spacing: 8px;'>${verificationCode}</span>
                            </div>
                        </div>
                        
                    </div>
                    
                    <!-- Footer -->
                    <div style='background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6;'>
                        <p style='color: #6c757d; margin: 0 0 10px; font-size: 14px;'>
                            <strong>YemekTaxi</strong> - En sevdiğiniz yemekler kapınızda
                        </p>
                        <p style='color: #adb5bd; margin: 0; font-size: 12px;'>
                            Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayın.
                        </p>
                    </div>
                    
                </div>
            </div>
        </body>
        </html>`;

      // Send email
      const emailResult = await this.sendEmailAsync(
        toEmail,
        "YemekTaxi - Email Doğrulama Kodu",
        htmlContent,
      );

      if (!emailResult.succeeded) {
        return emailResult;
      }

      // Save verification code to database
      await prisma.emailVerification.create({
        data: {
          email: toEmail,
          token: verificationCode,
          expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          updatedBy: "system",
          isDeleted: false,
          status: "Active",
        },
      });

      logger.info(
        `Email verification code sent to ${toEmail}: ${verificationCode}`,
      );

      return {
        succeeded: true,
        message: "Email başarıyla gönderildi.",
      };
    } catch (error: any) {
      logger.error("Email verification error:", error);
      return {
        succeeded: false,
        message: `Email gönderimi sırasında hata: ${error.message}`,
      };
    }
  }

  async verifyEmailAsync(code: string, userId: string): Promise<EmailResponse> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          isDeleted: false,
        },
      });

      if (!user) {
        return {
          succeeded: false,
          message: "Kullanıcı bulunamadı.",
        };
      }
      // Find the verification record
      const emailVerification = await prisma.emailVerification.findFirst({
        where: {
          email: user.email,
          isDeleted: false,
          status: "Active",
          createdDate: {
            gt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      if (!emailVerification) {
        return {
          succeeded: false,
          message: "Geçersiz veya süresi dolmuş doğrulama kodu.",
        };
      }

      // Update verification status
      await prisma.emailVerification.update({
        where: {
          id: emailVerification.id,
        },
        data: {
          isDeleted: true,
        },
      });

      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          emailVerification: true,
        },
      });

      logger.info(`Email verification successful for user ${userId}: ${code}`);

      return {
        succeeded: true,
        message: "Email başarıyla doğrulandı.",
      };
    } catch (error: any) {
      logger.error("Email verification error:", error);
      return {
        succeeded: false,
        message: "Email doğrulama sırasında hata oluştu.",
      };
    }
  }

  async sendSignupMailAsync(toEmail: string): Promise<EmailResponse> {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang='tr'>
      <head>
          <meta charset='UTF-8'>
          <meta name='viewport' content='width=device-width, initial-scale=1.0'>
          <title>Kayıt İşlemi</title>
      </head>
      <body style='margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;'>
          <div style='padding: 40px 20px;'>
              <div style='max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden;'>
                  
                  <!-- Header -->
                  <div style='background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px 30px; text-align: center;'>
                      <div style='background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2);'>
                          <span style='font-size: 36px; color: #28a745;'>✅</span>
                      </div>
                      <h1 style='color: white; margin: 0; font-size: 28px; font-weight: 700;'>YemekTaxi</h1>
                      <p style='color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;'>Lezzet kapınızda!</p>
                  </div>
                  
                  <!-- Content -->
                  <div style='padding: 50px 30px;'>
                      <div style='text-align: center; margin-bottom: 40px;'>
                          <h2 style='color: #2c3e50; margin: 0 0 15px; font-size: 24px; font-weight: 600;'>Kayıt İşleminiz Alındı</h2>
                          <p style='color: #7f8c8d; margin: 0; font-size: 16px; line-height: 1.6;'>
                              YemekTaxi'ye kayıt olduğunuz için teşekkür ederiz!
                          </p>
                      </div>
                      
                      <!-- Info Box -->
                      <div style='background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border: 2px solid #2196f3; border-radius: 15px; padding: 30px; text-align: center; margin: 30px 0;'>
                          <div style='margin-bottom: 20px;'>
                              <span style='font-size: 48px; color: #2196f3;'>⏳</span>
                          </div>
                          <h3 style='color: #1976d2; margin: 0 0 15px; font-size: 20px; font-weight: 600;'>İnceleme Sürecinde</h3>
                          <p style='color: #424242; margin: 0; font-size: 16px; line-height: 1.6;'>
                              Kayıt işleminiz incelemeye alınmıştır. 
                              <br><strong>En kısa sürede size dönüş sağlanacaktır.</strong>
                          </p>
                      </div>
                      
                      <div style='background: #f8f9fa; border-radius: 10px; padding: 25px; margin: 30px 0;'>
                          <h4 style='color: #495057; margin: 0 0 15px; font-size: 16px; font-weight: 600;'>📋 Sonraki Adımlar:</h4>
                          <ul style='color: #6c757d; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;'>
                              <li>Kayıt bilgileriniz incelenmektedir</li>
                              <li>Onay sonrası hesabınız aktifleştirilecektir</li>
                              <li>Email adresinize bilgilendirme yapılacaktır</li>
                          </ul>
                      </div>
                      
                  </div>
                  
                  <!-- Footer -->
                  <div style='background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6;'>
                      <p style='color: #6c757d; margin: 0 0 10px; font-size: 14px;'>
                          <strong>YemekTaxi</strong> - En sevdiğiniz yemekler kapınızda
                      </p>
                      <p style='color: #adb5bd; margin: 0; font-size: 12px;'>
                          Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayın.
                      </p>
                  </div>
                  
              </div>
          </div>
      </body>
      </html>`;

    return await this.sendEmailAsync(
      toEmail,
      "YemekTaxi - Kayıt İşleminiz İncelemeye Alındı",
      htmlContent,
    );
  }
}
