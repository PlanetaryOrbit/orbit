FROM oven/bun:1-alpine

ARG NODE_OPTIONS="--max-old-space-size=1536"
ENV NODE_OPTIONS="${NODE_OPTIONS}"
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /usr/src/app

# Install dependencies
COPY package.json bun.lock ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile

# Generate Prisma client
RUN bunx prisma generate

# Copy application source
COPY . .

# Build Next.js app
RUN --mount=type=cache,target=/usr/src/app/.next/cache \
    bun run build

EXPOSE 3000

CMD ["bun", "run", "start"]
