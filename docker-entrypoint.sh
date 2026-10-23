#!/bin/sh
set -e

echo "🚀 Iniciando Atiende..."

# Ejecutar migraciones automáticas sobre la base de datos de producción
if [ "$NODE_ENV" = "production" ] && [ -n "$DATABASE_URL" ]; then
  echo "📦 Sincronizando esquema de base de datos..."
  npx prisma db push --skip-generate || true

  if [ "$SEED_DEMO" = "true" ]; then
    echo "🌱 Verificando carga de datos de demostración de Clínica Dental Lumen..."
    npm run db:seed || true
  fi
fi

# Ejecutar comando pasado al contenedor (por defecto server.js o worker)
exec "$@"
