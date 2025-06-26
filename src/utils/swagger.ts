import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import path from "path";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "YemekTaxi API",
      version: "1.0.0",
      description:
        "A comprehensive food delivery API with automatic documentation",
      contact: {
        name: "API Support",
        email: "support@yemektaxi.com",
      },
    },
    servers: [
      {
        url: process.env.SITE_URL
          ? `${process.env.SITE_URL}:${process.env.SITE_PORT}`
          : `http://localhost:${process.env.SITE_PORT || 3000}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
            },
            message: {
              type: "string",
              description: "Detailed error description",
            },
          },
        },
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "User ID",
            },
            firstName: {
              type: "string",
              description: "User first name",
            },
            lastName: {
              type: "string",
              description: "User last name",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            yearOfBirth: {
              type: "integer",
              description: "User year of birth",
            },
            phoneNumber: {
              type: "string",
              description: "User phone number",
            },
            createdDate: {
              type: "string",
              format: "date-time",
              description: "User creation date",
            },
            lastLoginDate: {
              type: "string",
              format: "date-time",
              description: "User last login date",
            },
          },
        },
        Restaurant: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Restaurant ID",
            },
            name: {
              type: "string",
              description: "Restaurant name",
            },
            description: {
              type: "string",
              description: "Restaurant description",
            },
            address: {
              type: "string",
              description: "Restaurant address",
            },
            phoneNumber: {
              type: "string",
              description: "Restaurant phone number",
            },
            rating: {
              type: "number",
              format: "float",
              description: "Restaurant rating",
            },
          },
        },
        Food: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Food ID",
            },
            name: {
              type: "string",
              description: "Food name",
            },
            description: {
              type: "string",
              description: "Food description",
            },
            price: {
              type: "number",
              format: "float",
              description: "Food price",
            },
            imageUrl: {
              type: "string",
              description: "Food image URL",
            },
            isAvailable: {
              type: "boolean",
              description: "Food availability status",
            },
          },
        },
        Category: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Category ID",
            },
            name: {
              type: "string",
              description: "Category name",
            },
            description: {
              type: "string",
              description: "Category description",
            },
            imageUrl: {
              type: "string",
              description: "Category image URL",
            },
          },
        },
        Campaign: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Campaign ID",
            },
            title: {
              type: "string",
              description: "Campaign title",
            },
            description: {
              type: "string",
              description: "Campaign description",
            },
            discountPercentage: {
              type: "number",
              format: "float",
              description: "Campaign discount percentage",
            },
            startDate: {
              type: "string",
              format: "date-time",
              description: "Campaign start date",
            },
            endDate: {
              type: "string",
              format: "date-time",
              description: "Campaign end date",
            },
            isActive: {
              type: "boolean",
              description: "Campaign active status",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    path.join(__dirname, "../routes/*.ts"),
    path.join(__dirname, "../routes/*.js"),
    path.join(__dirname, "../**/*.ts"),
    path.join(__dirname, "../**/*.js"),
  ],
};

const specs = swaggerJsdoc(options);

const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: "list",
    filter: true,
    showRequestDuration: true,
  },
};

export const setupSwagger = (app: Express): void => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, swaggerUiOptions),
  );

  // JSON endpoint for the swagger specification
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });
};

export { specs };
