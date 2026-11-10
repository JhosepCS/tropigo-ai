# syntax=docker/dockerfile:1
# =================================================================
# TROPIGO AI - IMAGEN DE PRODUCCION (WEB + WORKER WHATSAPP)
# =================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 1. Dependencias (incluye devDependencies: el worker corre con tsx)
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# 2. Compilacion de Next.js
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# 3. Imagen final unica: sirve para web y para worker
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh \
  && mkdir -p /app/data/whatsapp_session \
  && chown -R nextjs:nodejs /app/data /app/.next

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]

# Por defecto arranca el servidor web.
# El worker se arranca con: npx tsx src/worker/index.ts
CMD ["npm", "start"]
