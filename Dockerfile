FROM node:lts-alpine

# Create and set working directory
WORKDIR /app

# Copy dependency files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (npm install because the lockfile is not committed)
RUN npm install

# Copy the rest of the source
COPY . .

# Build the project
RUN npm run build && npm prune --omit=dev

# Default command to run the MCP server over stdio
CMD ["node", "build/cli.js"]
