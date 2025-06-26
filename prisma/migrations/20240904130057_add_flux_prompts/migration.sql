-- CreateTable
CREATE TABLE "FluxPrompt" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FluxPrompt_pkey" PRIMARY KEY ("id")
);
