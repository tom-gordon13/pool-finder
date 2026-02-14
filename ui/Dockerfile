FROM node:20-slim

RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8081 19000 19001 19002

CMD ["/bin/sh", "-c", "npm install && npx expo start --web --non-interactive"]
