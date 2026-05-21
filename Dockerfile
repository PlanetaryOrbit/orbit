FROM node:22-alpine

ARG NODE_OPTIONS="--max-old-space-size=1536"
ENV NODE_OPTIONS="${NODE_OPTIONS}"
ENV NEXT_TELEMETRY_DISABLED=1

# Install pnpm (version pinned by packageManager in package.json)
RUN corepack enable

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json pnpm-lock.yaml ./
# Copy Prisma schema
COPY prisma ./prisma/

# Install dependencies (pnpm store cached across builds)
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Generate Prisma client for the specific platform
RUN pnpm exec prisma generate

# Bundle app source
COPY . .

# Build the app (Next.js cache persisted across builds)
RUN --mount=type=cache,target=/usr/src/app/.next/cache \
    pnpm run build

# Expose port 3000
EXPOSE 3000

# Start the app
CMD ["pnpm", "run", "start"]
