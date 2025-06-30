import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import { UploadService, upload } from "../services/uploadService";
import jwt from "jsonwebtoken";

const router = Router();
const prisma = new PrismaClient();
const uploadService = new UploadService();

// Helper function to get user from token
const getUserFromToken = (
  req: Request,
): { userId: string; restaurantId?: string } | null => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    // Extract token and handle potential double "Bearer " prefix
    let token = authHeader.substring(7);

    // If token still starts with "Bearer ", remove it again
    if (token.startsWith("Bearer ")) {
      token = token.substring(7);
    }

    // Trim any whitespace
    token = token.trim();

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    return {
      userId: decoded.id,
      restaurantId: decoded.restaurantId,
    };
  } catch (error) {
    return null;
  }
};

const createResponse = (success: boolean, message: string, data?: any) => {
  return {
    success,
    message,
    item: data,
  };
};

/**
 * @swagger
 * /api/Upload/UploadImage:
 *   post:
 *     summary: Upload restaurant image
 *     description: Upload an image file and create multiple sizes (small and large)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload
 *               restaurantId:
 *                 type: string
 *                 format: uuid
 *                 description: Restaurant ID (optional if included in JWT)
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Resim başarıyla yüklendi."
 *                 data:
 *                   type: object
 *                   properties:
 *                     smallImageUrl:
 *                       type: string
 *                       example: "https://res.cloudinary.com/..."
 *                     largeImageUrl:
 *                       type: string
 *                       example: "https://res.cloudinary.com/..."
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/UploadImage",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);
      if (!user) {
        return res.status(401).json(createResponse(false, "Yetkisiz erişim."));
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json(createResponse(false, "Dosya gereklidir."));
      }

      // Get restaurant ID from request body or user token
      const restaurantId = req.body.restaurantId || user.restaurantId;
      if (!restaurantId) {
        return res
          .status(400)
          .json(createResponse(false, "Restoran ID gereklidir."));
      }

      const result = await uploadService.uploadImageAsync(
        file,
        restaurantId,
        user.userId,
      );

      if (result.succeeded) {
        return res
          .status(200)
          .json(createResponse(true, result.message, result.data));
      } else {
        return res.status(400).json(createResponse(false, result.message));
      }
    } catch (error) {
      logger.error("Upload image error:", error);
      return res.status(500).json(createResponse(false, "Sunucu hatası."));
    }
  },
);

/**
 * @swagger
 * /api/Upload/UploadFiles:
 *   post:
 *     summary: Upload restaurant files
 *     description: Upload multiple files (documents, images, etc.)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Files to upload
 *               restaurantId:
 *                 type: string
 *                 format: uuid
 *                 description: Restaurant ID (optional if included in JWT)
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Dosyalar başarıyla yüklendi."
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                         example: "https://res.cloudinary.com/..."
 *                       fileName:
 *                         type: string
 *                         example: "document.pdf"
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/UploadFiles",
  upload.array("files", 10),
  async (req: Request, res: Response) => {
    try {
      const user = getUserFromToken(req);
      if (!user) {
        return res.status(401).json(createResponse(false, "Yetkisiz erişim."));
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res
          .status(400)
          .json(createResponse(false, "En az bir dosya gereklidir."));
      }

      // Get restaurant ID from request body or user token
      const restaurantId = req.body.restaurantId || user.restaurantId;
      if (!restaurantId) {
        return res
          .status(400)
          .json(createResponse(false, "Restoran ID gereklidir."));
      }

      const result = await uploadService.uploadFilesAsync(
        files,
        restaurantId,
        user.userId,
      );

      if (result.succeeded) {
        return res
          .status(200)
          .json(createResponse(true, result.message, result.data));
      } else {
        return res.status(400).json(createResponse(false, result.message));
      }
    } catch (error) {
      logger.error("Upload files error:", error);
      return res.status(500).json(createResponse(false, "Sunucu hatası."));
    }
  },
);

/**
 * @swagger
 * /api/Upload/GetRestaurantFiles:
 *   get:
 *     summary: Get restaurant files
 *     description: Get all uploaded files for a restaurant
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: restaurantId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Restaurant ID (optional if included in JWT)
 *       - in: query
 *         name: fileType
 *         schema:
 *           type: string
 *           enum: [image, document, all]
 *         description: Filter by file type
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Dosyalar başarıyla getirildi."
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       fileName:
 *                         type: string
 *                       fileUrl:
 *                         type: string
 *                       fileType:
 *                         type: string
 *                       createdDate:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get("/GetRestaurantFiles", async (req: Request, res: Response) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json(createResponse(false, "Yetkisiz erişim."));
    }

    // Get restaurant ID from query or user token
    const restaurantId =
      (req.query.restaurantId as string) || user.restaurantId;
    if (!restaurantId) {
      return res
        .status(400)
        .json(createResponse(false, "Restoran ID gereklidir."));
    }

    const fileType = req.query.fileType as string;

    const whereClause: any = {
      restaurantId,
      isDeleted: false,
    };

    if (fileType && fileType !== "all") {
      whereClause.fileType = fileType;
    }

    const files = await prisma.restaurantDocuments.findMany({
      where: whereClause,
      select: {
        documentUrl: true,
        id: true,
        restaurantId: true,
        createdDate: true,
        updatedDate: true,
        status: true,
        isDeleted: true,
        updatedBy: true,
      },
    });

    return res
      .status(200)
      .json(createResponse(true, "Dosyalar başarıyla getirildi.", files));
  } catch (error) {
    logger.error("Get restaurant files error:", error);
    return res.status(500).json(createResponse(false, "Sunucu hatası."));
  }
});

export default router;
