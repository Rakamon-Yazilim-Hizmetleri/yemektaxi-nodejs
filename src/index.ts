import * as dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { logger } from "./utils/logger";
import webhookRoutes from "./webhook/index";
import { setupSwagger } from "./utils/swagger";

const app = express();
const prisma = new PrismaClient();

// Sentry initialization
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app }),
  ],
  tracesSampleRate: 1.0,
});

// Sentry middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Body parsing middleware
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// CORS middleware
app.use(cors());

// Import API routes
import apiRoutes from "./routes/index";

// Setup Swagger documentation
setupSwagger(app);

// Routes
app.use("/api", apiRoutes);
app.use("/webhook", webhookRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Debug endpoint for Sentry
app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

// Global error handler
app.use(function onError(err: any, req: any, res: any, next: any) {
  Sentry.captureException(err);
  logger.error("Error: ", err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// Sentry error handler middleware
app.use(Sentry.Handlers.errorHandler());

// Start server
const PORT = process.env.SITE_PORT || 3000;

app.listen(PORT, () => {
  logger.info(`
    🚀  Server is running!
    🔉  Listening on port ${PORT}
    📭  API available at ${
      process.env.SITE_URL || "http://localhost"
    }:${PORT} 💾  Database connected with Prisma
    🔗  Swagger available at ${
      process.env.SITE_URL || "http://localhost"
    }:${PORT}/api-docs
  `);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});

export { app, prisma };
