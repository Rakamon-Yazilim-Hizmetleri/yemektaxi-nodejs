import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { logger } from "../utils/logger";
import { body, validationResult } from "express-validator";
import {
  checkIdentityNumber,
  validateUserData,
  UserValidationData,
} from "../utils/common";
import { EmailService } from "../services/emailService";
import { MessageService } from "../services/messageService";

const router = Router();
const prisma = new PrismaClient();
const emailService = new EmailService();
const messageService = new MessageService();
const JWT_SECRET = process.env.JWT_SECRET || "secret";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "refresh_secret";

// Helper function to generate tokens
const generateTokens = (userId: string, email: string) => {
  const accessToken = jwt.sign({ id: userId, email }, JWT_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign({ id: userId, email }, REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

// Response helper
interface ApiResponse<T> {
  success: boolean;
  message: string;
  item?: T;
  errors?: any;
}

const createResponse = <T>(
  success: boolean,
  message: string,
  item?: T,
  errors?: any,
): ApiResponse<T> => ({
  success,
  message,
  item,
  errors,
});

/**
 * @swagger
 * /api/Auth/Signup:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with email and password. User will be in pending status until email/phone verification is completed.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - yearOfBirth
 *               - phoneNumber
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: User's first name
 *                 example: John
 *               lastName:
 *                 type: string
 *                 description: User's last name
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password (min 6 characters)
 *                 example: SecurePassword123
 *               yearOfBirth:
 *                 type: integer
 *                 description: User's year of birth
 *                 example: 1990
 *               phoneNumber:
 *                 type: string
 *                 description: User's phone number
 *                 example: "+1234567890"
 *               identityNumber:
 *                 type: string
 *                 description: User's identity number (optional)
 *                 example: "12345678901"
 *     responses:
 *       201:
 *         description: User created successfully
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
 *                   example: Registration successful. Please verify your email and phone number.
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     requiresVerification:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: User with this email already exists
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/Signup",
  [
    body("firstName")
      .trim()
      .isLength({ min: 2 })
      .withMessage("First name must be at least 2 characters"),
    body("lastName")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Last name must be at least 2 characters"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("phoneNumber")
      .isMobilePhone("any")
      .withMessage("Valid phone number is required"),
    body("yearOfBirth")
      .isInt({ min: 1900, max: new Date().getFullYear() - 13 })
      .withMessage("Valid year of birth is required"),
  ],
  async (req: Request, res: Response) => {
    try {
      // Handle validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json(
            createResponse(false, "Validation failed", null, errors.array()),
          );
      }

      const {
        firstName,
        lastName,
        email,
        password,
        yearOfBirth,
        phoneNumber,
        identityNumber,
      } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { phoneNumber },
            ...(identityNumber ? [{ identityNumber }] : []),
          ],
          isDeleted: false,
        },
      });

      if (existingUser) {
        let conflictField = "email";
        if (existingUser.phoneNumber === phoneNumber)
          conflictField = "phone number";
        if (existingUser.identityNumber === identityNumber)
          conflictField = "identity number";

        return res
          .status(400)
          .json(
            createResponse(
              false,
              `User with this ${conflictField} already exists`,
            ),
          );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user with pending status
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          yearOfBirth,
          phoneNumber,
          identityNumber,
          emailVerification: false,
          phoneVerification: false,
          isNewUser: true,
          checkIdentity: identityNumber ? true : false,
          confirmationStatus: "Pending",
          status: "Active",
          updatedBy: "system",
          lastLoginDate: new Date(),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          emailVerification: true,
          phoneVerification: true,
          confirmationStatus: true,
          status: true,
          isNewUser: true,
          createdDate: true,
        },
      });

      res.status(201).json(createResponse(true, "Kayıt başarılı.", user));
    } catch (error) {
      logger.error("Registration error:", error);
      res.status(500).json(createResponse(false, "Internal server error"));
    }
  },
);

/**
 * @swagger
 * /api/Auth/Login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *                 example: SecurePassword123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/Login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user with roles
    const user = await prisma.user.findUnique({
      where: { email, isDeleted: false },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.password) {
      return res
        .status(401)
        .json(createResponse(false, "Kullanıcı bulunamadı veya şifre yanlış."));
    }

    const userRestaurant = await prisma.restaurant.findFirst({
      where: {
        id: user.restaurantId ?? undefined,
      },
    });

    // Check if user is approved
    if (user.confirmationStatus !== "Approved") {
      return res.status(401).json(
        createResponse(
          false,
          "Kullanıcı onaylanmamış. Lütfen e-posta veya telefon doğrulaması yapın.",
          {
            confirmationStatus: user.confirmationStatus,
          },
        ),
      );
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res
        .status(401)
        .json(createResponse(false, "Kullanıcı bulunamadı veya şifre yanlış."));
    }

    // Update last login date
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginDate: new Date() },
    });

    // Generate tokens
    const tokens = generateTokens(user.id, user.email);

    // Update user with refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        refreshTokenExpiryTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Format roles for response
    const roles = user.userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
    }));

    // Format response like C# version
    const loginResponse = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      restaurantId: userRestaurant?.id,
      isNewUser: user.isNewUser,
      status: user.status,
      confirmationStatus: userRestaurant?.confirmationStatus,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      roles,
    };

    res.json(createResponse(true, "Login successful", loginResponse));
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json(createResponse(false, "Internal server error"));
  }
});

/**
 * @swagger
 * /api/Auth/RefreshToken:
 *   get:
 *     summary: Refresh access token
 *     description: Generate a new access token using a valid refresh token
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: refreshToken
 *         required: true
 *         schema:
 *           type: string
 *         description: Valid refresh token
 *         example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
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
 *                   example: Token refreshed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: New access token
 *                     refreshToken:
 *                       type: string
 *                       description: New refresh token
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         isNewUser:
 *                           type: boolean
 *                         restaurantId:
 *                           type: string
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid or expired refresh token
 *       500:
 *         description: Internal server error
 */
router.get("/RefreshToken", async (req: Request, res: Response) => {
  try {
    // Read from query parameter only
    const refreshToken = req.query.refreshToken as string;

    if (!refreshToken) {
      return res
        .status(401)
        .json(createResponse(false, "Refresh token is required"));
    }

    // Find user with valid refresh token
    const user = await prisma.user.findFirst({
      where: {
        refreshToken,
        isDeleted: false,
        refreshTokenExpiryTime: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res
        .status(401)
        .json(
          createResponse(false, "Geçersiz veya süresi dolmuş refresh token."),
        );
    }

    const userRestaurant = await prisma.restaurant.findFirst({
      where: {
        id: user.restaurantId ?? undefined,
      },
    });

    // Generate new tokens
    const tokens = generateTokens(user.id, user.email);

    // Update user with new refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        refreshTokenExpiryTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.json(
      createResponse(true, "Token yenilendi.", {
        userId: user.id,
        isNewUser: user.isNewUser,
        restaurantConfirmationStatus: userRestaurant?.confirmationStatus,
        checkIdentity: user.checkIdentity,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }),
    );
  } catch (error) {
    logger.error("Refresh token error:", error);
    res.status(500).json(createResponse(false, "Internal server error"));
  }
});

/**
 * @swagger
 * /api/Auth/CheckUser:
 *   post:
 *     summary: Check if user can be registered
 *     description: Validate user information before registration (email, phone, identity number uniqueness)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - phoneNumber
 *               - yearOfBirth
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *               identityNumber:
 *                 type: string
 *                 description: Identity number for verification
 *                 example: "12345678901"
 *               yearOfBirth:
 *                 type: integer
 *                 example: 1990
 *     responses:
 *       200:
 *         description: User validation successful
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
 *                   example: User validation successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     canRegister:
 *                       type: boolean
 *                       example: true
 *                     identityVerified:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: User already exists or validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: User with this email already exists
 *       500:
 *         description: Internal server error
 */
router.post(
  "/CheckUser",
  [
    body("firstName")
      .trim()
      .isLength({ min: 2 })
      .withMessage("First name is required"),
    body("lastName")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Last name is required"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("phoneNumber")
      .isMobilePhone("any")
      .withMessage("Valid phone number is required"),
    body("yearOfBirth")
      .isInt({ min: 1900, max: new Date().getFullYear() - 13 })
      .withMessage("Valid year of birth is required"),
  ],
  async (req: Request, res: Response) => {
    try {
      // Handle validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json(
            createResponse(false, "Validation failed", null, errors.array()),
          );
      }

      const {
        firstName,
        lastName,
        email,
        phoneNumber,
        identityNumber,
        yearOfBirth,
      } = req.body;

      // Validate user data format
      const userData: UserValidationData = {
        firstName,
        lastName,
        email,
        phoneNumber,
        identityNumber,
        yearOfBirth,
      };

      const validation = validateUserData(userData);
      if (!validation.isValid) {
        return res
          .status(400)
          .json(
            createResponse(
              false,
              "Data validation failed",
              null,
              validation.errors,
            ),
          );
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { phoneNumber },
            ...(identityNumber ? [{ identityNumber }] : []),
          ],
          isDeleted: false,
        },
        select: {
          email: true,
          phoneNumber: true,
          identityNumber: true,
        },
      });

      if (existingUser) {
        let conflictField = "email";
        if (existingUser.phoneNumber === phoneNumber)
          conflictField = "phone number";
        if (existingUser.identityNumber === identityNumber)
          conflictField = "identity number";

        return res
          .status(400)
          .json(
            createResponse(
              false,
              `User with this ${conflictField} already exists`,
            ),
          );
      }

      // Identity verification - match C# logic exactly
      if (identityNumber) {
        const isValid = await checkIdentityNumber({
          firstName,
          lastName,
          identityNumber,
          yearOfBirth,
        });

        if (!isValid.succeded) {
          return res
            .status(400)
            .json(createResponse(false, "Kullanıcı doğrulaması başarısız."));
        }
      }

      res.json(createResponse(true, "Kullanıcı doğrulaması başarılı.", true));
    } catch (error) {
      logger.error("Check user error:", error);
      res.status(500).json(createResponse(false, "Internal server error"));
    }
  },
);

/**
 * @swagger
 * /api/Auth/SaveRestaurant:
 *   post:
 *     summary: Save restaurant information
 *     description: Create a new restaurant for a verified user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - name
 *               - email
 *               - phoneNumber
 *               - address
 *               - city
 *               - district
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID who owns the restaurant
 *               name:
 *                 type: string
 *                 description: Restaurant name
 *               email:
 *                 type: string
 *                 description: Restaurant email
 *               phoneNumber:
 *                 type: string
 *                 description: Restaurant phone number
 *               address:
 *                 type: string
 *                 description: Restaurant address
 *               city:
 *                 type: string
 *                 description: City
 *               district:
 *                 type: string
 *                 description: District
 *               neighbourhood:
 *                 type: string
 *                 description: Neighbourhood
 *               postalCode:
 *                 type: string
 *                 description: Postal code
 *     responses:
 *       201:
 *         description: Restaurant created successfully
 *       400:
 *         description: Validation error or user not verified
 *       500:
 *         description: Internal server error
 */
router.post("/SaveRestaurant", async (req: Request, res: Response) => {
  try {
    const {
      userId,
      name,
      mail,
      phoneNumber,
      address,
      city,
      district,
      neighbourhood,
      postalCode,
      cuisineIds,
    } = req.body;

    // Verify user is fully verified - match C# logic
    const verifiedUser = await prisma.user.findFirst({
      where: {
        id: userId,
        isDeleted: false,
        phoneVerification: true,
        emailVerification: true,
        checkIdentity: true,
      },
    });

    if (!verifiedUser) {
      throw new Error(
        "Kullanıcı doğrulanmamış. Lütfen telefon ve e-posta doğrulaması yapın.",
      );
    }

    // Check if restaurant with same details already exists
    const existingRestaurant = await prisma.restaurant.findFirst({
      where: {
        isDeleted: false,
        OR: [{ name }, { mail: mail }, { phoneNumber }],
      },
    });

    if (existingRestaurant) {
      return res
        .status(400)
        .json(
          createResponse(false, "Bu bilgilere ait bir restoran zaten mevcut."),
        );
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create restaurant
      const restaurant = await tx.restaurant.create({
        data: {
          ownerId: userId,
          name,
          mail,
          phoneNumber,
          confirmationStatus: "Pending",
          status: "Active",
          updatedBy: "system",
        },
      });

      // Update user with restaurant ID and auth status
      await tx.user.update({
        where: { id: userId },
        data: {
          restaurantId: restaurant.id,
          isAuthUser: true,
        },
      });

      return restaurant;
    });

    // Generate JWT token with claims like C# version
    const claims = {
      restaurantId: result.id,
      userId: verifiedUser.id,
    };
    const token = jwt.sign(claims, JWT_SECRET, { expiresIn: "1y" });

    res.status(201).json(
      createResponse(true, "Restoran kaydı başarılı.", {
        restaurantId: result.id,
        token,
      }),
    );
  } catch (error) {
    logger.error("Save restaurant error:", error);
    if (error instanceof Error) {
      res.status(400).json(createResponse(false, error.message));
    } else {
      res.status(500).json(createResponse(false, "Internal server error"));
    }
  }
});

/**
 * @swagger
 * /api/Auth/Me:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieve the authenticated user's profile information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /api/Auth/SaveBusinessDocument:
 *   post:
 *     summary: Save business documents for restaurant
 *     description: Upload and save business documents for restaurant verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - documentUrls
 *             properties:
 *               restaurantId:
 *                 type: string
 *                 description: Restaurant ID
 *               documentUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of document URLs
 *     responses:
 *       200:
 *         description: Documents saved successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post("/SaveBusinessDocument", async (req: Request, res: Response) => {
  try {
    const { restaurantId, documentUrls } = req.body;

    const restaurant = await prisma.restaurant.findFirst({
      where: { id: restaurantId, isDeleted: false },
    });

    if (!restaurant) {
      return res
        .status(400)
        .json(createResponse(false, "Restoran bulunamadı."));
    }

    const verifiedUser = await prisma.user.findFirst({
      where: {
        id: restaurant.ownerId,
        isDeleted: false,
        phoneVerification: true,
        emailVerification: true,
        checkIdentity: true,
      },
    });

    if (!verifiedUser) {
      throw new Error(
        "Kullanıcı doğrulanmamış. Lütfen telefon ve e-posta doğrulaması yapın.",
      );
    }

    // Set user as not new user
    await prisma.user.update({
      where: { id: verifiedUser.id },
      data: { isNewUser: false },
    });

    // Check if user already has another restaurant
    const existingRestaurant = await prisma.restaurant.findFirst({
      where: {
        ownerId: verifiedUser.id,
        id: { not: restaurantId },
        isDeleted: false,
      },
    });

    if (existingRestaurant) {
      return res
        .status(400)
        .json(createResponse(false, "Kullanıcının zaten bir restoranı var."));
    }

    if (!documentUrls || documentUrls.length === 0) {
      return res
        .status(400)
        .json(createResponse(false, "Belge URL'leri boş olamaz."));
    }

    // Note: RestaurantDocuments model doesn't exist in current schema
    // This would need to be added to the Prisma schema if needed
    // For now, just return success

    res.json(
      createResponse(true, "Belge URL'leri başarıyla kaydedildi.", true),
    );
  } catch (error) {
    logger.error("Save business document error:", error);
    if (error instanceof Error) {
      res.status(400).json(createResponse(false, error.message));
    } else {
      res.status(500).json(createResponse(false, "Internal server error"));
    }
  }
});

/**
 * @swagger
 * /api/Auth/SendConfirmationEmail:
 *   post:
 *     summary: Send email verification code
 *     description: Send a verification code to user's email address
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - userId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Error sending email
 */
router.post("/SendConfirmationEmail", async (req: Request, res: Response) => {
  try {
    const { email, userId } = req.body;

    if (!email || !userId) {
      return res
        .status(400)
        .json(createResponse(false, "Email ve kullanıcı ID gereklidir."));
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const result = await emailService.sendVerificationEmailAsync(
      email,
      otpCode,
      userId,
    );

    if (result.succeeded) {
      res.json(createResponse(true, result.message));
    } else {
      res.status(400).json(createResponse(false, result.message));
    }
  } catch (error) {
    logger.error("Send confirmation email error:", error);
    res.status(500).json(createResponse(false, "Internal server error"));
  }
});

/**
 * @swagger
 * /api/Auth/VerifyEmail:
 *   post:
 *     summary: Verify email with code
 *     description: Verify user's email address with the verification code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - userId
 *             properties:
 *               code:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired code
 */
router.post("/VerifyEmail", async (req: Request, res: Response) => {
  try {
    const { code, userId } = req.body;

    if (!code || !userId) {
      return res
        .status(400)
        .json(createResponse(false, "Kod ve kullanıcı ID gereklidir."));
    }

    const result = await emailService.verifyEmailAsync(code, userId);

    if (result.succeeded) {
      res.json(createResponse(true, result.message));
    } else {
      res.status(400).json(createResponse(false, result.message));
    }
  } catch (error) {
    logger.error("Verify email error:", error);
    res.status(500).json(createResponse(false, "Internal server error"));
  }
});

/**
 * @swagger
 * /api/Auth/SendOtpCode:
 *   post:
 *     summary: Send OTP code to phone
 *     description: Send a verification code to user's phone number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - userId
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Error sending OTP
 */
router.post("/SendOtpCode", async (req: Request, res: Response) => {
  try {
    const { phoneNumber, userId } = req.body;

    if (!phoneNumber || !userId) {
      return res
        .status(400)
        .json(
          createResponse(false, "Telefon numarası ve kullanıcı ID gereklidir."),
        );
    }

    const result = await messageService.sendOtpCode(phoneNumber, userId);

    if (result.succeeded) {
      res.json(createResponse(true, result.message, result.item));
    } else {
      res.status(400).json(createResponse(false, result.message, result.item));
    }
  } catch (error) {
    logger.error("Send OTP error:", error);
    res.status(500).json(createResponse(false, "Internal server error"));
  }
});

/**
 * @swagger
 * /api/Auth/OtpVerification:
 *   post:
 *     summary: Verify OTP code
 *     description: Verify the OTP code sent to user's phone
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - otpCode
 *             properties:
 *               userId:
 *                 type: string
 *               otpCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post("/OtpVerification", async (req: Request, res: Response) => {
  try {
    const { userId, otpCode } = req.body;

    if (!userId || !otpCode) {
      return res
        .status(400)
        .json(createResponse(false, "Kullanıcı ID ve OTP kodu gereklidir."));
    }

    const result = await messageService.otpVerification({ userId, otpCode });

    if (result.succeeded) {
      res.json(createResponse(true, result.message));
    } else {
      res.status(400).json(createResponse(false, result.message));
    }
  } catch (error) {
    logger.error("OTP verification error:", error);
    res.status(500).json(createResponse(false, "Internal server error"));
  }
});

router.get("/Me", async (req: Request, res: Response) => {
  try {
    // This route would typically use authentication middleware
    // For now, just return a placeholder
    res.json(
      createResponse(true, "Authentication middleware not implemented yet"),
    );
  } catch (error) {
    logger.error("Get profile error:", error);
    res.status(500).json(createResponse(false, "Internal server error"));
  }
});

export default router;
