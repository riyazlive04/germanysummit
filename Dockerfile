# syntax=docker/dockerfile:1
# Multi-stage build → small, self-contained Next.js standalone server.
# Both build and run stages are Alpine so the Prisma engine (musl) matches.

# ── deps ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── builder ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# `npm run build` runs `prisma generate && next build`.
# A dummy DATABASE_URL keeps Prisma client generation happy at build time;
# the real one is injected at runtime.
ENV DATABASE_URL="file:./build.db"
RUN npm run build

# ── runner ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone output bundles the server + traced node_modules (incl. Prisma,
# pdf-parse, next/og). Static assets and public/ are copied alongside.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Schema is needed for `prisma migrate deploy` at release time.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

# Run DB migrations separately (see DEPLOY.md), then start the server.
CMD ["node", "server.js"]
