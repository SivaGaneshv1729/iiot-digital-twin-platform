import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SmartFactory-Nexus API',
      version: '1.0.0',
      description: 'The core REST API for the SmartFactory Digital Twin Platform',
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development API Gateway',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Generate docs from JSDoc comments in routes
};

export const swaggerSpec = swaggerJsdoc(options);
