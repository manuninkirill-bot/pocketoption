FROM node:20-alpine

# Install Python for microservice
RUN apk add --no-cache python3 py3-pip

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including dev for build)
RUN npm install

# Copy application files
COPY . .

# Build the application
# Force rebuild - cache invalidation 1764315387
RUN npm run build

# Remove dev dependencies for smaller image
RUN npm prune --production

# Expose port
EXPOSE 8080

# Start application
CMD ["npm", "run", "start"]
