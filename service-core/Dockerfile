FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy TypeScript source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Reinstall only production dependencies
RUN npm ci --omit=dev

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
