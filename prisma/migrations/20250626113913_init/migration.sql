/*
  Warnings:

  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Credit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CreditHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Explore` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FluxPrompt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Predict` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Style` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Credit" DROP CONSTRAINT "Credit_userId_fkey";

-- DropForeignKey
ALTER TABLE "Explore" DROP CONSTRAINT "Explore_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Explore" DROP CONSTRAINT "Explore_styleId_fkey";

-- DropForeignKey
ALTER TABLE "Predict" DROP CONSTRAINT "Predict_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Predict" DROP CONSTRAINT "Predict_styleId_fkey";

-- DropForeignKey
ALTER TABLE "Predict" DROP CONSTRAINT "Predict_userId_fkey";

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Credit";

-- DropTable
DROP TABLE "CreditHistory";

-- DropTable
DROP TABLE "Explore";

-- DropTable
DROP TABLE "FluxPrompt";

-- DropTable
DROP TABLE "Predict";

-- DropTable
DROP TABLE "Style";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "Role";

-- DropEnum
DROP TYPE "StatusEnum";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "created_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMPTZ NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "title" TEXT,
    "restaurant_id" UUID,
    "email_verification" BOOLEAN NOT NULL DEFAULT false,
    "phone_verification" BOOLEAN NOT NULL DEFAULT false,
    "check_identity" BOOLEAN NOT NULL DEFAULT false,
    "refresh_token" TEXT,
    "refresh_token_expiry_time" TIMESTAMPTZ,
    "year_of_birth" INTEGER NOT NULL,
    "phone_number" TEXT,
    "identity_number" TEXT,
    "address" TEXT,
    "image_url" TEXT,
    "last_login_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_new_user" BOOLEAN NOT NULL DEFAULT true,
    "is_auth_user" BOOLEAN NOT NULL DEFAULT false,
    "confirmation_status" TEXT NOT NULL DEFAULT 'Pending',
    "device_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" UUID NOT NULL,
    "created_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMPTZ NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "tax_number" TEXT,
    "tax_office" TEXT,
    "mail" TEXT NOT NULL,
    "mersis_number" TEXT,
    "registration_number" TEXT,
    "customer_service_phone_number" TEXT,
    "confirmation_status" TEXT NOT NULL DEFAULT 'Pending',
    "logo" TEXT,
    "image_url" TEXT,
    "main_restaurant_id" UUID,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'Active',

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foods" (
    "id" UUID NOT NULL,
    "created_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMPTZ NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "priority" TEXT,
    "active_time" TEXT,
    "products_to_be_extracted" TEXT,
    "preparation_time" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "discount_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confirmation_status" TEXT NOT NULL DEFAULT 'Pending',
    "reject_message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',

    CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "created_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMPTZ NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "restaurant_id" UUID NOT NULL,
    "priority" TEXT,
    "confirmation_status" TEXT NOT NULL DEFAULT 'Pending',
    "reject_message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_categories" (
    "id" UUID NOT NULL,
    "created_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMPTZ NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "restaurant_id" UUID NOT NULL,
    "priority" TEXT,
    "confirmation_status" TEXT NOT NULL DEFAULT 'Pending',
    "reject_message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',

    CONSTRAINT "sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "created_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMPTZ NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "restaurant_id" UUID NOT NULL,
    "discount_percent" DOUBLE PRECISION NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "min_order_amount" DOUBLE PRECISION,
    "max_discount_amount" DOUBLE PRECISION,
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "confirmation_status" TEXT NOT NULL DEFAULT 'Pending',
    "reject_message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "options" (
    "id" UUID NOT NULL,
    "created_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMPTZ NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "restaurant_id" UUID NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "discount_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priority" TEXT,
    "active_time" TEXT,
    "preparation_time" TEXT,
    "confirmation_status" TEXT NOT NULL DEFAULT 'Pending',
    "reject_message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',

    CONSTRAINT "options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_categories" (
    "id" UUID NOT NULL,
    "food_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "food_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_campaigns" (
    "id" UUID NOT NULL,
    "food_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,

    CONSTRAINT "food_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "created_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMPTZ NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_types" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "problem_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "created_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMPTZ NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID NOT NULL,
    "problem_type_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "priority" TEXT NOT NULL DEFAULT 'Medium',

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "created_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "description" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "food_categories_food_id_category_id_key" ON "food_categories"("food_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "food_campaigns_food_id_campaign_id_key" ON "food_campaigns"("food_id", "campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "problem_types_name_key" ON "problem_types"("name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foods" ADD CONSTRAINT "foods_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_categories" ADD CONSTRAINT "sub_categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_categories" ADD CONSTRAINT "food_categories_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_categories" ADD CONSTRAINT "food_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_campaigns" ADD CONSTRAINT "food_campaigns_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_campaigns" ADD CONSTRAINT "food_campaigns_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_problem_type_id_fkey" FOREIGN KEY ("problem_type_id") REFERENCES "problem_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
