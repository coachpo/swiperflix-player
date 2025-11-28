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
# Build-time injected public envs (used by Next.js at bundle time)
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ARG NEXT_PUBLIC_API_BEARER_TOKEN
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_API_BEARER_TOKEN=${NEXT_PUBLIC_API_BEARER_TOKEN}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM base AS runner
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ARG NEXT_PUBLIC_API_BEARER_TOKEN
ENV NODE_ENV=production \
  PORT=3000 \
  HOSTNAME=0.0.0.0 \
  NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
  NEXT_PUBLIC_API_BEARER_TOKEN=${NEXT_PUBLIC_API_BEARER_TOKEN}

# Run as non-root for better security hardening
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs
USER nextjs

# Copy only the standalone output and static assets produced by Next.js
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
