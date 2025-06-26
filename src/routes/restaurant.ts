import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/restaurants:
 *   get:
 *     summary: Get all restaurants
 *     description: Retrieve a paginated list of all restaurants
 *     tags: [Restaurants]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of restaurants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 restaurants:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Restaurant'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     pages:
 *                       type: integer
 *                       example: 10
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          confirmationStatus: true,
          status: true,
          isOpen: true,
          createdDate: true,
        },
        skip,
        take: limit,
        orderBy: { createdDate: "desc" },
      }),
      prisma.restaurant.count({ where: { isDeleted: false } }),
    ]);

    res.json({
      restaurants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get restaurants error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/restaurants/{id}:
 *   get:
 *     summary: Get restaurant by ID
 *     description: Retrieve a specific restaurant with its details including users, foods, and categories
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Restaurant retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 restaurant:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Restaurant'
 *                     - type: object
 *                       properties:
 *                         users:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/User'
 *                         foods:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Food'
 *                         categories:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Category'
 *       404:
 *         description: Restaurant not found
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
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id, isDeleted: false },
      include: {
        users: {
          where: { isDeleted: false },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        foods: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            price: true,
            status: true,
          },
        },
        categories: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    res.json({ restaurant });
  } catch (error) {
    logger.error("Get restaurant error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Create new restaurant
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const restaurantData = req.body;

    const restaurant = await prisma.restaurant.create({
      data: restaurantData,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        confirmationStatus: true,
        status: true,
        createdDate: true,
      },
    });

    res.status(201).json({
      message: "Restaurant created successfully",
      restaurant,
    });
  } catch (error) {
    logger.error("Create restaurant error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Update restaurant
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const restaurant = await prisma.restaurant.update({
      where: { id, isDeleted: false },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        confirmationStatus: true,
        status: true,
        updatedDate: true,
      },
    });

    res.json({
      message: "Restaurant updated successfully",
      restaurant,
    });
  } catch (error) {
    logger.error("Update restaurant error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Soft delete restaurant
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.restaurant.update({
      where: { id, isDeleted: false },
      data: { isDeleted: true },
    });

    res.json({ message: "Restaurant deleted successfully" });
  } catch (error) {
    logger.error("Delete restaurant error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
