FROM node:20-slim

# Prisma's query engine binary requires OpenSSL
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

EXPOSE 3001

CMD ["npx", "ts-node", "src/server.ts"]
