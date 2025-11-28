FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat \
  && corepack enable \
  && rm -rf /var/cache/apk/*
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production \
  PORT=3000 \
  HOSTNAME=0.0.0.0

# Run as non-root for better security hardening
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs
USER nextjs

# Copy only the standalone output and static assets produced by Next.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
