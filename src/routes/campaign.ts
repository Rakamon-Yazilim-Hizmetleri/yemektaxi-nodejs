import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new PrismaClient();

/**
 * Get all campaigns (with pagination and filters)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const restaurantId = req.query.restaurantId as string;
    const isActive = req.query.isActive === "true";

    const where = {
      isDeleted: false,
      ...(restaurantId && { restaurantId }),
      ...(req.query.isActive !== undefined && { isActive }),
    };

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          startDate: true,
          endDate: true,
          status: true,
          numberOfUses: true,
          usageLimit: true,
          confirmationStatus: true,
          createdDate: true,
          updatedDate: true,
          updatedBy: true,
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
      prisma.campaign.count({ where }),
    ]);

    res.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get campaigns error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get campaign by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id, isDeleted: false },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        foodCampaigns: {
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

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json({ campaign });
  } catch (error) {
    logger.error("Get campaign error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Create new campaign
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const campaignData = req.body;

    const campaign = await prisma.campaign.create({
      data: campaignData,
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        numberOfUses: true,
        usageLimit: true,
        status: true,
        confirmationStatus: true,
        createdDate: true,
      },
    });

    res.status(201).json({
      message: "Campaign created successfully",
      campaign,
    });
  } catch (error) {
    logger.error("Create campaign error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Update campaign
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const campaign = await prisma.campaign.update({
      where: { id, isDeleted: false },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        numberOfUses: true,
        usageLimit: true,
        status: true,
        confirmationStatus: true,
        updatedDate: true,
      },
    });

    res.json({
      message: "Campaign updated successfully",
      campaign,
    });
  } catch (error) {
    logger.error("Update campaign error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Soft delete campaign
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.campaign.update({
      where: { id, isDeleted: false },
      data: { isDeleted: true },
    });

    res.json({ message: "Campaign deleted successfully" });
  } catch (error) {
    logger.error("Delete campaign error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
