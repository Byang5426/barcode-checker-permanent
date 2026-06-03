# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-slim AS deps

RUN npm install -g pnpm@10.4.1
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY patches/ patches/

# Install all dependencies (dev + prod) for build
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build frontend + server bundle
# ============================================
FROM deps AS build

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

# Copy source files needed for build
COPY tsconfig.json vite.config.ts vite.config.docker.ts drizzle.config.ts ./
COPY client/ client/
COPY shared/ shared/
COPY drizzle/ drizzle/
COPY server/ server/

# Build frontend with the Docker-specific vite config
RUN npx vite build --config vite.config.docker.ts

# Build server using esbuild via node (avoids pnpm symlink issues in Docker)
RUN node -e "\
const { build } = require('esbuild');\
build({\
  entryPoints: ['server/_core/index.ts'],\
  platform: 'node',\
  packages: 'external',\
  bundle: true,\
  format: 'esm',\
  outdir: 'dist',\
  logLevel: 'info'\
}).catch(() => process.exit(1));"

# ============================================
# Stage 3: Production runtime
# ============================================
FROM node:20-slim AS production

WORKDIR /app

# Copy full node_modules from deps (includes drizzle-kit for runtime migrations)
COPY --from=deps /app/node_modules ./node_modules

# Copy built artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Copy drizzle files needed for migrations at runtime
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts

# Copy the entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "docker-entrypoint.sh"]
