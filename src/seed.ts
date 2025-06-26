import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
      description: "Administrator role with full access",
    },
  });

  const restaurantOwnerRole = await prisma.role.upsert({
    where: { name: "RESTAURANT_OWNER" },
    update: {},
    create: {
      name: "RESTAURANT_OWNER",
      description: "Restaurant owner role",
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: "USER" },
    update: {},
    create: {
      name: "USER",
      description: "Regular user role",
    },
  });

  console.log("✅ Roles created");

  // Create problem types
  const problemTypes = [
    {
      name: "Technical Issue",
      description: "Technical problems with the platform",
    },
    { name: "Order Issue", description: "Issues related to food orders" },
    { name: "Payment Issue", description: "Payment related problems" },
    { name: "Account Issue", description: "Account access and profile issues" },
    { name: "General Inquiry", description: "General questions and inquiries" },
  ];

  for (const problemType of problemTypes) {
    await prisma.problemType.upsert({
      where: { name: problemType.name },
      update: {},
      create: problemType,
    });
  }

  console.log("✅ Problem types created");

  // Create admin user
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
    },
  });

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
    },
  });

  console.log("✅ Admin user created");

  // Create sample restaurant
  const existingRestaurant = await prisma.restaurant.findFirst({
    where: { email: "info@samplerestaurant.com" },
  });

  let sampleRestaurant;
  if (existingRestaurant) {
    sampleRestaurant = existingRestaurant;
  } else {
    sampleRestaurant = await prisma.restaurant.create({
      data: {
        ownerId: adminUser.id,
        name: "Sample Restaurant",
        phoneNumber: "+905559876543",
        email: "info@samplerestaurant.com",
        confirmationStatus: "Approved",
        isOpen: true,
      },
    });
  }

  console.log("✅ Sample restaurant created");

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
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: category.name,
        restaurantId: sampleRestaurant.id,
      },
    });

    let createdCategory;
    if (existingCategory) {
      createdCategory = existingCategory;
    } else {
      createdCategory = await prisma.category.create({
        data: {
          ...category,
          restaurantId: sampleRestaurant.id,
          confirmationStatus: "Approved",
        },
      });
    }
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

    const existingFood = await prisma.food.findFirst({
      where: {
        name: food.name,
        restaurantId: sampleRestaurant.id,
      },
    });

    let createdFood;
    if (existingFood) {
      createdFood = existingFood;
    } else {
      createdFood = await prisma.food.create({
        data: {
          ...foodData,
          restaurantId: sampleRestaurant.id,
          confirmationStatus: "Approved",
        },
      });

      // Link food to category
      await prisma.foodCategory.create({
        data: {
          foodId: createdFood.id,
          categoryId: createdCategories[categoryIndex].id,
        },
      });
    }

    createdFoods.push(createdFood);
  }

  console.log("✅ Foods created");

  // Create sample campaign
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30); // 30 days from now

  const existingCampaign = await prisma.campaign.findFirst({
    where: { name: "Summer Special", restaurantId: sampleRestaurant.id },
  });

  let campaign;
  if (existingCampaign) {
    campaign = existingCampaign;
  } else {
    campaign = await prisma.campaign.create({
      data: {
        name: "Summer Special",
        description: "20% off on all main courses",
        restaurantId: sampleRestaurant.id,
        discountPercent: 20.0,
        startDate,
        endDate,
        isActive: true,
        confirmationStatus: "Approved",
      },
    });

    // Link campaign to main course food
    const mainCourseFood = createdFoods.find(
      (_, index) => foods[index].categoryIndex === 1,
    );
    if (mainCourseFood) {
      await prisma.foodCampaign.create({
        data: {
          foodId: mainCourseFood.id,
          campaignId: campaign.id,
        },
      });
    }
  }

  console.log("✅ Campaign created");

  console.log("🎉 Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
