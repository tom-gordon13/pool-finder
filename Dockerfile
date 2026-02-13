# Use Node.js LTS version
FROM node:20-slim

# Install system dependencies required for Expo
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose ports for Expo Dev Server and Metro bundler
EXPOSE 8081 19000 19001 19002

# Start Expo in web mode, bound to all interfaces so the host can reach it
CMD ["/bin/sh", "-c", "npm install && npx expo start --web --non-interactive"]
