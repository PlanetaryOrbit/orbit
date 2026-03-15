FROM node:20-alpine
# Install pnpm and git
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache git
# Create app directory
WORKDIR /usr/src/app
COPY .git .git

ARG COMMIT_HASH=dev
ENV COMMIT_HASH=$COMMIT_HASH
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
RUN echo "COMMIT_HASH=$(git rev-parse --short HEAD)" >> /etc/environment
RUN COMMIT_HASH=$(git rev-parse --short HEAD) && \
    export COMMIT_HASH && \
    pnpm run build
# Expose port 3000
EXPOSE 3000
# Start the app
CMD ["pnpm", "run", "start"]