import { v2 as cloudinary } from "cloudinary";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import multer from "multer";
import path from "path";

const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Types
export interface UploadImageDto {
  smallImageUrl: string;
  largeImageUrl: string;
}

export interface FileUploadResultDto {
  url: string;
  fileName: string;
}

export interface UploadResponse<T> {
  succeeded: boolean;
  message: string;
  data?: T;
}

export class UploadService {
  async uploadImageAsync(
    file: Express.Multer.File,
    restaurantId: string,
    userId: string,
  ): Promise<UploadResponse<UploadImageDto>> {
    try {
      if (!file) {
        return {
          succeeded: false,
          message: "Dosya bulunamadı.",
        };
      }

      // Get restaurant info
      const restaurant = await prisma.restaurant.findFirst({
        where: {
          id: restaurantId,
          isDeleted: false,
        },
      });

      if (!restaurant) {
        return {
          succeeded: false,
          message: "Restoran bulunamadı.",
        };
      }

      if (file.size <= 0) {
        return {
          succeeded: false,
          message: "Yüklenecek dosya bulunamadı.",
        };
      }

      const folderName = this.sanitizeFolderName(restaurant.name);

      // Upload configurations for different sizes
      const uploadConfigs = [
        { sizeName: "large_1000x750", width: 1000, height: 750 },
        { sizeName: "small_500x375", width: 500, height: 375 },
      ];

      const imageUrls: Partial<UploadImageDto> = {};

      // Upload each size
      for (const config of uploadConfigs) {
        const result = await this.uploadSingleImageAsync(
          file,
          folderName,
          config.sizeName,
          config.width,
          config.height,
        );

        if (result) {
          if (config.sizeName === "small_500x375") {
            imageUrls.smallImageUrl = result.secure_url;
          } else if (config.sizeName === "large_1000x750") {
            imageUrls.largeImageUrl = result.secure_url;
          }
        }
      }

      // Save to database
      await prisma.file.create({
        data: {
          fileName: file.originalname,
          filePath: `restaurants/${folderName}/images`,
          status: "Active",
          updatedBy: "system",
          restaurantId,
        },
      });

      return {
        succeeded: true,
        message: "Resim başarıyla yüklendi.",
        data: imageUrls as UploadImageDto,
      };
    } catch (error) {
      logger.error("Upload image error:", error);
      return {
        succeeded: false,
        message: "Resim yüklenirken hata oluştu.",
      };
    }
  }

  async uploadFilesAsync(
    files: Express.Multer.File[],
    restaurantId: string,
    userId: string,
  ): Promise<UploadResponse<FileUploadResultDto[]>> {
    try {
      if (!files || files.length === 0) {
        return {
          succeeded: false,
          message: "Dosya bulunamadı.",
        };
      }

      // Get restaurant info
      const restaurant = await prisma.restaurant.findFirst({
        where: {
          id: restaurantId,
          isDeleted: false,
        },
      });

      if (!restaurant) {
        return {
          succeeded: false,
          message: "Restoran bulunamadı.",
        };
      }

      const folderName = this.sanitizeFolderName(restaurant.name);
      const fileResults: FileUploadResultDto[] = [];

      for (const file of files) {
        if (file.size <= 0) continue;

        const result = await this.uploadSingleFileAsync(
          file,
          folderName,
          path.parse(file.originalname).name,
        );

        if (result) {
          fileResults.push({
            url: result.secure_url,
            fileName: file.originalname,
          });

          // Save to database
          await prisma.file.create({
            data: {
              fileName: file.originalname,
              filePath: `restaurants/${folderName}/files`,
              status: "Active",
              updatedBy: "system",
              restaurantId,
            },
          });
        }
      }

      return {
        succeeded: true,
        message: "Dosyalar başarıyla yüklendi.",
        data: fileResults,
      };
    } catch (error) {
      logger.error("Upload files error:", error);
      return {
        succeeded: false,
        message: "Dosyalar yüklenirken hata oluştu.",
      };
    }
  }

  private async uploadSingleImageAsync(
    file: Express.Multer.File,
    folderName: string,
    sizeName: string,
    width: number,
    height: number,
  ) {
    try {
      const uploadResult = await cloudinary.uploader.upload(
        file.path ||
          `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        {
          folder: `restaurants/${folderName}/${sizeName}/images`,
          format: "webp",
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          transformation: {
            width,
            height,
            crop: "fill",
          },
        },
      );

      return uploadResult;
    } catch (error) {
      logger.error(`Upload single image error (${sizeName}):`, error);
      return null;
    }
  }

  private async uploadSingleFileAsync(
    file: Express.Multer.File,
    folderName: string,
    fileName: string,
  ) {
    try {
      const uploadResult = await cloudinary.uploader.upload(
        file.path ||
          `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        {
          folder: `restaurants/${folderName}/files`,
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          resource_type: "raw",
        },
      );

      return uploadResult;
    } catch (error) {
      logger.error(`Upload single file error (${fileName}):`, error);
      return null;
    }
  }

  private sanitizeFolderName(name: string): string {
    if (!name) return "unnamed";

    // Remove invalid characters and replace spaces with underscores
    return name
      .replace(/[^a-zA-Z0-9\s-_]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase();
  }
}

// Multer configuration
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and common document types
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Geçersiz dosya türü. Sadece resim ve belge dosyaları kabul edilir.",
        ),
      );
    }
  },
});
