import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/foods:
 *   get:
 *     summary: Get all foods
 *     description: Retrieve a paginated list of all foods with optional filtering by restaurant
 *     tags: [Foods]
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
 *       - in: query
 *         name: restaurantId
 *         schema:
 *           type: string
 *         description: Filter foods by restaurant ID
 *     responses:
 *       200:
 *         description: List of foods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 foods:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Food'
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
 *                       example: 50
 *                     pages:
 *                       type: integer
 *                       example: 5
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
    const restaurantId = req.query.restaurantId as string;

    const where = {
      isDeleted: false,
      ...(restaurantId && { restaurantId }),
    };

    const [foods, total] = await Promise.all([
      prisma.food.findMany({
        where,
        select: {
          id: true,
          name: true,
          price: true,
          discountPrice: true,
          imageUrl: true,
          status: true,
          confirmationStatus: true,
          restaurant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdDate: "desc" },
      }),
      prisma.food.count({ where }),
    ]);

    res.json({
      foods,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get foods error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get food by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const food = await prisma.food.findUnique({
      where: { id, isDeleted: false },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        foodCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        foodCampaigns: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                discountPercent: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!food) {
      return res.status(404).json({ error: "Food not found" });
    }

    res.json({ food });
  } catch (error) {
    logger.error("Get food error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Create new food
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const foodData = req.body;

    const food = await prisma.food.create({
      data: foodData,
      select: {
        id: true,
        name: true,
        price: true,
        discountPrice: true,
        imageUrl: true,
        status: true,
        confirmationStatus: true,
        createdDate: true,
      },
    });

    res.status(201).json({
      message: "Food created successfully",
      food,
    });
  } catch (error) {
    logger.error("Create food error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Update food
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const food = await prisma.food.update({
      where: { id, isDeleted: false },
      data: updateData,
      select: {
        id: true,
        name: true,
        price: true,
        discountPrice: true,
        imageUrl: true,
        status: true,
        confirmationStatus: true,
        updatedDate: true,
      },
    });

    res.json({
      message: "Food updated successfully",
      food,
    });
  } catch (error) {
    logger.error("Update food error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Soft delete food
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.food.update({
      where: { id, isDeleted: false },
      data: { isDeleted: true },
    });

    res.json({ message: "Food deleted successfully" });
  } catch (error) {
    logger.error("Delete food error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
