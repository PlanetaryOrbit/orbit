FROM oven/bun:1 AS builder

ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_OPTIONS="${NODE_OPTIONS}"
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /usr/src/app

COPY package.json bun.lock ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile

RUN bunx prisma generate

COPY . .

RUN --mount=type=cache,target=/usr/src/app/.next/cache \
    bun run build

EXPOSE 3000

CMD ["bun", "run", "start"]
