FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY service-core/package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy TypeScript source
COPY service-core/tsconfig.json ./
COPY service-core/src ./src

# Build TypeScript
RUN npm run build

# Reinstall only production dependencies
RUN npm ci --omit=dev

# Copy admin panel static files
COPY client-admin/app/admin ./public/admin

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
