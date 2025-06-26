import fs from "fs";
import path from "path";

interface RouteDefinition {
  method: string;
  path: string;
  summary: string;
  description: string;
  tags: string[];
  requestBody?: any;
  responses: any;
  security?: any[];
}

export const generateSwaggerComment = (route: RouteDefinition): string => {
  const {
    method,
    path,
    summary,
    description,
    tags,
    requestBody,
    responses,
    security,
  } = route;

  let swaggerComment = `/**
 * @swagger
 * ${path}:
 *   ${method}:
 *     summary: ${summary}
 *     description: ${description}
 *     tags: [${tags.map((tag) => `"${tag}"`).join(", ")}]`;

  if (security) {
    swaggerComment += `
 *     security:
 *       - bearerAuth: []`;
  }

  if (requestBody) {
    swaggerComment += `
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             ${JSON.stringify(requestBody, null, 13).replace(
   /\n/g,
   "\n *             ",
 )}`;
  }

  swaggerComment += `
 *     responses:`;

  Object.entries(responses).forEach(([statusCode, response]: [string, any]) => {
    swaggerComment += `
 *       ${statusCode}:
 *         description: ${response.description}
 *         content:
 *           application/json:
 *             schema:
 *               ${response.schema}`;
  });

  swaggerComment += `
 */`;

  return swaggerComment;
};

// Common response schemas
export const commonResponses = {
  "200": {
    description: "Success",
    schema: "type: object",
  },
  "201": {
    description: "Created successfully",
    schema: "type: object",
  },
  "400": {
    description: "Bad request",
    schema: '$ref: "#/components/schemas/Error"',
  },
  "401": {
    description: "Unauthorized",
    schema: '$ref: "#/components/schemas/Error"',
  },
  "404": {
    description: "Not found",
    schema: '$ref: "#/components/schemas/Error"',
  },
  "500": {
    description: "Internal server error",
    schema: '$ref: "#/components/schemas/Error"',
  },
};

// Common request body schemas
export const commonRequestBodies = {
  pagination: {
    type: "object",
    properties: {
      page: {
        type: "integer",
        description: "Page number",
        example: 1,
      },
      limit: {
        type: "integer",
        description: "Items per page",
        example: 10,
      },
    },
  },
};

export const scanRoutesForDocumentation = (routesDir: string): void => {
  const files = fs.readdirSync(routesDir);

  files.forEach((file) => {
    if (file.endsWith(".ts") && file !== "index.ts") {
      const filePath = path.join(routesDir, file);
      const content = fs.readFileSync(filePath, "utf-8");

      // Find route definitions (this is a simple pattern matcher)
      const routeMatches = content.match(
        /router\.(get|post|put|delete|patch)\(["'`]([^"'`]+)["'`]/g,
      );

      if (routeMatches) {
        console.log(`\n=== Routes found in ${file} ===`);
        routeMatches.forEach((match) => {
          const [, method, routePath] =
            match.match(
              /router\.(get|post|put|delete|patch)\(["'`]([^"'`]+)["'`]/,
            ) || [];
          console.log(`${method?.toUpperCase()} ${routePath}`);
        });
      }
    }
  });
};
