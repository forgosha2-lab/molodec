# Use Node.js 18 alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy all files
COPY . .

# Build the frontend
RUN npm run build

# Expose port
EXPOSE 3003

# Start the application
CMD ["npm", "run", "start:prod"]