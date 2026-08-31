FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose port
EXPOSE 4000

# Run the compiled javascript
CMD ["node", "dist/index.js"]
