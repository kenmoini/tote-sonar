FROM node:20-alpine AS base

# Install dependencies for better-sqlite3 and sharp
RUN apk add --no-cache python3 make g++ vips-dev

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

RUN apk add --no-cache vips-dev

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=base /app/public ./public
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static

# Create data directories
RUN mkdir -p /app/data/uploads /app/data/thumbnails && \
    chown -R nextjs:nodejs /app/data

# Volume for persistent data
VOLUME ["/app/data"]

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATA_DIR="/app/data"

CMD ["node", "server.js"]
