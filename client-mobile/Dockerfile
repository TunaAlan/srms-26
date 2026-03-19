FROM node:20-alpine

WORKDIR /app

# Install Expo CLI globally
RUN npm install -g expo-cli@latest

# Copy dependency files first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

EXPOSE 8081 19000 19001 19002

# İkinci yönteme göre düzeltilmiş başlatma komutu
CMD ["npx", "expo", "start", "-c", "--host", "lan"]