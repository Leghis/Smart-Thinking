FROM node:lts-alpine

# Create and set working directory
WORKDIR /app

# FIRST copy all files to ensure scripts directory is available
COPY . .

# THEN install dependencies
RUN npm install

# Build the project
RUN npm run build

# Default command to run the MCP server
CMD ["node", "build/index.js"]