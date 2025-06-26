import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new PrismaClient();

/**
 * Get all users (with pagination)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          createdDate: true,
          lastLoginDate: true,
        },
        skip,
        take: limit,
        orderBy: { createdDate: "desc" }
      }),
      prisma.user.count({ where: { isDeleted: false } })
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error("Get users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get user by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        title: true,
        yearOfBirth: true,
        phoneNumber: true,
        address: true,
        imageUrl: true,
        status: true,
        confirmationStatus: true,
        createdDate: true,
        updatedDate: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    logger.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Update user
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated via this route
    delete updateData.password;
    delete updateData.email;
    delete updateData.id;

    const user = await prisma.user.update({
      where: { id, isDeleted: false },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        title: true,
        yearOfBirth: true,
        phoneNumber: true,
        address: true,
        imageUrl: true,
        status: true,
        updatedDate: true,
      }
    });

    res.json({
      message: "User updated successfully",
      user
    });
  } catch (error) {
    logger.error("Update user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Soft delete user
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.user.update({
      where: { id, isDeleted: false },
      data: { isDeleted: true }
    });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    logger.error("Delete user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router; 