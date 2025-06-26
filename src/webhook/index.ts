import { Router } from "express";

const router = Router();

// Health check for webhooks
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Webhook service is running",
    timestamp: new Date().toISOString(),
  });
});

// Placeholder for future webhooks
router.post("/test", (req, res) => {
  console.log("Test webhook received:", req.body);
  res.status(200).json({ message: "Test webhook received successfully" });
});

export default router;
