-- CreateTable
CREATE TABLE "Explore" (
    "id" TEXT NOT NULL,
    "url" TEXT,
    "prompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,

    CONSTRAINT "Explore_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Explore" ADD CONSTRAINT "Explore_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Explore" ADD CONSTRAINT "Explore_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
