FROM oven/bun:1.4.2 AS builder

WORKDIR /usr/src/app

COPY package.json bun.lock ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN bun install --frozen-lockfile

RUN bun run prisma:emit

COPY . .

RUN bun run build


FROM node:22-bookworm-slim AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/.output ./.output
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
