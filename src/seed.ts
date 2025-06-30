import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // First, create a sample restaurant to use for roles
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@yemektaxi.com" },
    update: {},
    create: {
      firstName: "Admin",
      lastName: "User",
      email: "admin@yemektaxi.com",
      password: hashedPassword,
      yearOfBirth: 1990,
      phoneNumber: "+905551234567",
      confirmationStatus: "Approved",
      emailVerification: true,
      phoneVerification: true,
      isAuthUser: true,
      lastLoginDate: new Date(),
      status: "Active",
      updatedBy: "system",
    },
  });

  console.log("✅ Admin user created");

  // Create sample restaurant
  const sampleRestaurant = await prisma.restaurant.upsert({
    where: { id: "sample-restaurant-id" },
    update: {},
    create: {
      id: "sample-restaurant-id",
      ownerId: adminUser.id,
      name: "Sample Restaurant",
      phoneNumber: "+905559876543",
      mail: "info@samplerestaurant.com",
      confirmationStatus: "Approved",
      status: "Active",
      updatedBy: "system",
    },
  });

  console.log("✅ Sample restaurant created");

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { id: "admin-role-id" },
    update: {},
    create: {
      id: "admin-role-id",
      name: "ADMIN",
      description: "Administrator role with full access",
      restaurantId: sampleRestaurant.id,
      status: "Active",
      updatedBy: "system",
    },
  });

  const restaurantOwnerRole = await prisma.role.upsert({
    where: { id: "restaurant-owner-role-id" },
    update: {},
    create: {
      id: "restaurant-owner-role-id",
      name: "RESTAURANT_OWNER",
      description: "Restaurant owner role",
      restaurantId: sampleRestaurant.id,
      status: "Active",
      updatedBy: "system",
    },
  });

  const userRole = await prisma.role.upsert({
    where: { id: "user-role-id" },
    update: {},
    create: {
      id: "user-role-id",
      name: "USER",
      description: "Regular user role",
      restaurantId: sampleRestaurant.id,
      status: "Active",
      updatedBy: "system",
    },
  });

  console.log("✅ Roles created");

  // Create problem types
  const problemTypes = [
    "Technical Issue",
    "Order Issue",
    "Payment Issue",
    "Account Issue",
    "General Inquiry",
  ];

  for (const problemType of problemTypes) {
    await prisma.problemType.upsert({
      where: {
        id: `problem-type-${problemType.toLowerCase().replace(/\s+/g, "-")}`,
      },
      update: {},
      create: {
        name: problemType,
        status: "Active",
        updatedBy: "system",
      },
    });
  }

  console.log("✅ Problem types created");

  // Assign admin role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
      status: "Active",
      updatedBy: "system",
    },
  });

  // Create sample categories
  const categories = [
    { name: "Appetizers", description: "Delicious starters" },
    { name: "Main Courses", description: "Main dishes" },
    { name: "Desserts", description: "Sweet endings" },
    { name: "Beverages", description: "Drinks and beverages" },
  ];

  const createdCategories: Array<{
    id: string;
    name: string;
    description: string | null;
  }> = [];

  for (const category of categories) {
    const categoryId = `category-${category.name
      .toLowerCase()
      .replace(/\s+/g, "-")}`;

    const createdCategory = await prisma.category.upsert({
      where: { id: categoryId },
      update: {},
      create: {
        id: categoryId,
        name: category.name,
        description: category.description,
        imageUrl: "https://example.com/default-category.jpg",
        restaurantId: sampleRestaurant.id,
        confirmationStatus: "Approved",
        status: "Active",
        updatedBy: "system",
      },
    });

    createdCategories.push(createdCategory);
  }

  console.log("✅ Categories created");

  // Create sample foods
  const foods = [
    {
      name: "Caesar Salad",
      description: "Fresh romaine lettuce with Caesar dressing",
      imageUrl: "https://example.com/caesar-salad.jpg",
      price: 25.99,
      categoryIndex: 0, // Appetizers
    },
    {
      name: "Grilled Chicken",
      description: "Tender grilled chicken breast",
      imageUrl: "https://example.com/grilled-chicken.jpg",
      price: 45.99,
      categoryIndex: 1, // Main Courses
    },
    {
      name: "Chocolate Cake",
      description: "Rich chocolate cake with frosting",
      imageUrl: "https://example.com/chocolate-cake.jpg",
      price: 18.99,
      categoryIndex: 2, // Desserts
    },
    {
      name: "Fresh Orange Juice",
      description: "Freshly squeezed orange juice",
      imageUrl: "https://example.com/orange-juice.jpg",
      price: 8.99,
      categoryIndex: 3, // Beverages
    },
  ];

  const createdFoods: Array<{ id: string; name: string }> = [];

  for (const food of foods) {
    const { categoryIndex, ...foodData } = food;
    const foodId = `food-${food.name.toLowerCase().replace(/\s+/g, "-")}`;

    const createdFood = await prisma.food.upsert({
      where: { id: foodId },
      update: {},
      create: {
        id: foodId,
        name: food.name,
        description: food.description,
        imageUrl: food.imageUrl,
        restaurantId: sampleRestaurant.id,
        price: food.price,
        discountPrice: 0,
        confirmationStatus: "Approved",
        status: "Active",
        updatedBy: "system",
      },
    });

    // Create food-category relationship
    if (createdCategories[categoryIndex]) {
      await prisma.foodCategory.upsert({
        where: {
          categoryId_foodId: {
            categoryId: createdCategories[categoryIndex].id,
            foodId: createdFood.id,
          },
        },
        update: {},
        create: {
          categoryId: createdCategories[categoryIndex].id,
          foodId: createdFood.id,
          status: "Active",
          updatedBy: "system",
        },
      });
    }

    createdFoods.push(createdFood);
  }

  console.log("✅ Foods created");

  // Create sample campaign
  const sampleCampaign = await prisma.campaign.upsert({
    where: { id: "sample-campaign" },
    update: {},
    create: {
      id: "sample-campaign",
      name: "Summer Special",
      description: "Special summer discount on selected items",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      numberOfUses: 100,
      usageLimit: 100,
      minOrderAmount: 50.0,
      ratio: 20.0,
      usageType: "percentage",
      restaurantId: sampleRestaurant.id,
      confirmationStatus: "Approved",
      status: "Active",
      updatedBy: "system",
    },
  });

  // Link first food to campaign
  if (createdFoods.length > 0) {
    await prisma.foodCampaign.upsert({
      where: {
        foodId_campaignId: {
          foodId: createdFoods[0].id,
          campaignId: sampleCampaign.id,
        },
      },
      update: {},
      create: {
        foodId: createdFoods[0].id,
        campaignId: sampleCampaign.id,
        status: "Active",
        updatedBy: "system",
      },
    });
  }

  console.log("✅ Campaign created");
  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
