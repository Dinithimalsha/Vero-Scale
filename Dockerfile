# VeroScale Docker Configuration

# Build stage for backend
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
RUN npm ci --workspace=@veroscale/backend
COPY packages/backend ./packages/backend
COPY tsconfig.base.json ./
RUN npm run build --workspace=@veroscale/backend

# Build stage for frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/
RUN npm ci --workspace=@veroscale/frontend
COPY packages/frontend ./packages/frontend
COPY tsconfig.base.json ./
RUN npm run build --workspace=@veroscale/frontend

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
RUN npm ci --workspace=@veroscale/backend --omit=dev

# Copy built artifacts
COPY --from=backend-builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=backend-builder /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=frontend-builder /app/packages/frontend/dist ./packages/frontend/dist

# Copy Prisma client
COPY --from=backend-builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/node_modules/@prisma ./node_modules/@prisma

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "packages/backend/dist/index.js"]
