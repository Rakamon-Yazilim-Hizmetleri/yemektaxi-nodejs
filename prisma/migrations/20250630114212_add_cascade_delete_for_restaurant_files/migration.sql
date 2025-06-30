-- DropForeignKey
ALTER TABLE "Files" DROP CONSTRAINT "Files_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "RestaurantDocuments" DROP CONSTRAINT "RestaurantDocuments_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "RestaurantImages" DROP CONSTRAINT "RestaurantImages_restaurantId_fkey";

-- AddForeignKey
ALTER TABLE "Files" ADD CONSTRAINT "Files_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantImages" ADD CONSTRAINT "RestaurantImages_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantDocuments" ADD CONSTRAINT "RestaurantDocuments_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
