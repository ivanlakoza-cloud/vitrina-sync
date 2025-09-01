# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
  if [ -f package-lock.json ]; then npm ci --include=dev; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  else npm i --include=dev; fi

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# В next.config.* должно быть: output: 'standalone'
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node","server.js"]
