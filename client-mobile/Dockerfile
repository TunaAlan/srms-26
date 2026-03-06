FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

EXPOSE 8081

CMD ["npx", "expo", "start", "--web", "--port", "8081", "--host", "lan"]
