import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new PrismaClient();

/**
 * Get all categories (with pagination and filters)
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

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
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
      prisma.category.count({ where }),
    ]);

    res.json({
      categories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get categories error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get category by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
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
            food: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({ category });
  } catch (error) {
    logger.error("Get category error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Create new category
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const categoryData = req.body;

    const category = await prisma.category.create({
      data: categoryData,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        status: true,
        confirmationStatus: true,
        createdDate: true,
      },
    });

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    logger.error("Create category error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Update category
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const category = await prisma.category.update({
      where: { id, isDeleted: false },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        status: true,
        confirmationStatus: true,
        updatedDate: true,
      },
    });

    res.json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    logger.error("Update category error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Soft delete category
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.category.update({
      where: { id, isDeleted: false },
      data: { isDeleted: true },
    });

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    logger.error("Delete category error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
