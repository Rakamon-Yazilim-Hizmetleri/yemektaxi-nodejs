import { Router } from "express";
import authRoutes from "./auth";
import userRoutes from "./user";
import restaurantRoutes from "./restaurant";
import foodRoutes from "./food";
import categoryRoutes from "./category";
import campaignRoutes from "./campaign";
import uploadRoutes from "./upload";

const router = Router();

// API routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/restaurants", restaurantRoutes);
router.use("/foods", foodRoutes);
router.use("/categories", categoryRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/upload", uploadRoutes);

export default router;
