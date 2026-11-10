#!/bin/sh
set -e

echo "🚀 Iniciando TropiGO AI..."

# Migraciones de produccion. Se ejecutan una sola vez (servicio web).
# El worker las omite con RUN_MIGRATIONS=false.
if [ "$RUN_MIGRATIONS" = "true" ] && [ -n "$DATABASE_URL" ]; then
  echo "📦 Aplicando migraciones de Prisma..."
  npx prisma migrate deploy

  if [ "$SEED_DEMO" = "true" ]; then
    echo "🌱 Cargando datos iniciales de TropiGO..."
    npm run db:seed || true
  fi
fi

# Ejecutar el comando del contenedor (web o worker)
exec "$@"
