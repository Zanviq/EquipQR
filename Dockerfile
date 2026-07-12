FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN export DATABASE_URL="$(printf '%s://%s:%s@%s:%s/%s' postgresql build build 127.0.0.1 5432 build)" && npm run prisma:generate && npm run build

FROM deps AS migrator
WORKDIR /app
COPY src ./src
COPY scripts ./scripts
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./
RUN export DATABASE_URL="$(printf '%s://%s:%s@%s:%s/%s' postgresql build build 127.0.0.1 5432 build)" && npm run prisma:generate
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN useradd --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
