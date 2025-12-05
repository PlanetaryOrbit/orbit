# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

# Copy only dependency files for better caching
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install dependencies (this layer will be cached unless dependencies change)
RUN pnpm install --frozen-lockfile

# Generate Prisma client (cached unless schema changes)
RUN pnpm exec prisma generate

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

# Copy dependencies from deps stage
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=deps /usr/src/app/package.json ./package.json

# Copy source code
COPY . .

# Build the application (only runs when source code changes)
RUN pnpm run build

# Stage 3: Runner (minimal production image)
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy only necessary files for production
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/prisma ./prisma

# Expose port 3000
EXPOSE 3000

# Start the app
CMD ["pnpm", "run", "start"]