import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { logger } from "../utils/logger";
import { body, validationResult } from "express-validator";
import crypto from "crypto";

const router = Router();
const prisma = new PrismaClient();
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
  data?: T;
  errors?: any;
}

const createResponse = <T>(
  success: boolean,
  message: string,
  data?: T,
  errors?: any,
): ApiResponse<T> => ({
  success,
  message,
  data,
  errors,
});

/**
 * @swagger
 * /api/Auth/Register:
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
  "/Register",
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
          checkIdentity: identityNumber ? false : true, // If identity provided, needs verification
          confirmationStatus: "Pending", // User needs verification
          status: "Active", // Initial status
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

      // TODO: Send email verification
      logger.info(`Email verification needed for ${email}`);

      // TODO: Send SMS verification
      logger.info(`Phone verification needed for ${phoneNumber}`);

      res.status(201).json(
        createResponse(
          true,
          "Registration successful. Please verify your email and phone number.",
          {
            user,
            requiresVerification: true,
            nextSteps: [
              "Check your email for verification link",
              "Check your phone for verification code",
            ],
          },
        ),
      );
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

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
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

    res.json(
      createResponse(true, "Login successful", {
        user: userWithoutPassword,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        requiresVerification:
          !user.emailVerification || !user.phoneVerification,
      }),
    );
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json(createResponse(false, "Internal server error"));
  }
});

/**
 * @swagger
 * /api/Auth/RefreshToken:
 *   post:
 *     summary: Refresh access token
 *     description: Generate a new access token using a valid refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
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
router.post("/RefreshToken", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

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
      include: {
        restaurant: {
          select: {
            id: true,
            confirmationStatus: true,
          },
        },
      },
    });

    if (!user) {
      return res
        .status(401)
        .json(createResponse(false, "Invalid or expired refresh token"));
    }

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
      createResponse(true, "Token refreshed successfully", {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          isNewUser: user.isNewUser,
          restaurantId: user.restaurantId,
          restaurantConfirmationStatus: user.restaurant?.confirmationStatus,
          checkIdentity: user.checkIdentity,
        },
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

      // If identity number is provided, you could add identity verification here
      // For now, we'll just validate the format
      let identityVerified = true;
      if (identityNumber) {
        // TODO: Implement Turkish identity number verification service
        // Similar to the C# CheckIdentityNumber method
        identityVerified =
          identityNumber.length === 11 && /^\d+$/.test(identityNumber);
      }

      res.json(
        createResponse(true, "User validation successful", {
          canRegister: true,
          identityVerified,
          message: identityVerified
            ? "All checks passed. User can proceed with registration."
            : "Identity verification failed. Please check your identity number.",
        }),
      );
    } catch (error) {
      logger.error("Check user error:", error);
      res.status(500).json(createResponse(false, "Internal server error"));
    }
  },
);

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
