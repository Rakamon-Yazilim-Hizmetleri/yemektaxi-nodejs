# YemekTaxi API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication Routes

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile (requires auth)

## User Management Routes

- `GET /api/users` - Get all users (with pagination)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Soft delete user

## Restaurant Management Routes

- `GET /api/restaurants` - Get all restaurants (with pagination)
- `GET /api/restaurants/:id` - Get restaurant by ID (includes foods, categories, users)
- `POST /api/restaurants` - Create new restaurant
- `PUT /api/restaurants/:id` - Update restaurant
- `DELETE /api/restaurants/:id` - Soft delete restaurant

## Food Management Routes

- `GET /api/foods` - Get all foods (with pagination, filter by restaurantId)
- `GET /api/foods/:id` - Get food by ID (includes categories, campaigns)
- `POST /api/foods` - Create new food
- `PUT /api/foods/:id` - Update food
- `DELETE /api/foods/:id` - Soft delete food

## Category Management Routes

- `GET /api/categories` - Get all categories (with pagination, filter by restaurantId)
- `GET /api/categories/:id` - Get category by ID (includes foods)
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Soft delete category

## Campaign Management Routes

- `GET /api/campaigns` - Get all campaigns (with pagination, filter by restaurantId, isActive)
- `GET /api/campaigns/:id` - Get campaign by ID (includes foods)
- `POST /api/campaigns` - Create new campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Soft delete campaign

## Webhook Routes

- `GET /webhook/health` - Health check for webhook service
- `POST /webhook/test` - Test webhook endpoint

## General Routes

- `GET /health` - Health check for main API

## Response Format

All endpoints return JSON with appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

## Pagination

List endpoints support pagination with query parameters:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

Example: `GET /api/users?page=2&limit=20`

## Filters

Some endpoints support filtering:

- Foods: `restaurantId`
- Categories: `restaurantId`
- Campaigns: `restaurantId`, `isActive`

Example: `GET /api/foods?restaurantId=123&page=1&limit=10`
