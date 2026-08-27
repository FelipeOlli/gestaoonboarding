#!/bin/sh
set -e

echo "Sincronizando schema do banco (drizzle-kit push)..."
node_modules/.bin/drizzle-kit push --force --config=drizzle.config.ts

echo "Iniciando servidor..."
exec node server.js
