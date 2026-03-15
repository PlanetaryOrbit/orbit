FROM node:20-alpine
# Install pnpm and git
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache git

# App directory
WORKDIR /usr/src/app
COPY .git .git

# Copy package manager files first (better caching)
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN pnpm exec prisma generate

# Copy rest of the project
COPY . .

RUN if [ -d ".git" ]; then git rev-parse --short HEAD; fi

# Build app
RUN pnpm run build

# Expose port
EXPOSE 3000

# Start
CMD ["pnpm", "run", "start"]