FROM node:24-alpine

ARG NODE_OPTIONS="--max-old-space-size=1536"
ENV NODE_OPTIONS="${NODE_OPTIONS}"
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /usr/src/app

RUN corepack enable
RUN corepack prepare pnpm@11.22.0 --activate

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

RUN pnpm exec prisma generate

COPY . .

RUN --mount=type=cache,target=/usr/src/app/.next/cache \
    pnpm run build

EXPOSE 3000

CMD ["pnpm", "run", "start"]
