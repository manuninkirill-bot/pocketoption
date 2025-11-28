FROM node:20-alpine

# Install Python for microservice
RUN apk add --no-cache python3 py3-pip

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 8080

# Start application
CMD ["npm", "run", "start"]
