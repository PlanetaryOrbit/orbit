FROM node:20-alpine

ARG NODE_OPTIONS
ENV NODE_OPTIONS=$NODE_OPTIONS

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json pnpm-lock.yaml ./
# Copy Prisma schema
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client for the specific platform
RUN pnpm exec prisma generate

# Bundle app source
COPY . .

# Build the app
RUN pnpm run build

# Expose port 3000
EXPOSE 3000

# Start the app
CMD ["pnpm", "run", "start"]