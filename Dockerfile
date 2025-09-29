FROM node:lts-alpine

# Create and set working directory
WORKDIR /app

# Copy dependency files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the source
COPY . .

# Build the project
RUN npm run build

# Default command to run the MCP server
CMD ["node", "build/index.js"]
