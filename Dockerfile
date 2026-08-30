FROM oven/bun:1 AS builder

ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_OPTIONS="${NODE_OPTIONS}"

WORKDIR /usr/src/app

COPY package.json bun.lock ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile
RUN bunx prisma generate

COPY . .

RUN --mount=type=cache,target=/usr/src/app/.nuxt \
    bun run build

FROM oven/bun:1 AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --from=builder /usr/src/app/.output ./.output
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

CMD ["bun", ".output/server/index.mjs"]