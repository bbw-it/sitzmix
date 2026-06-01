#!/usr/bin/env bash
set -euo pipefail

# SitzMix Deployment-Setup
# Aufruf auf dem Server nach dem Kopieren des Projekts:  ./setup.sh
# Idempotent: erneuter Aufruf baut neu und aktualisiert die laufende Instanz.

PORT="${SITZMIX_PORT:-3001}"

echo "==> SitzMix Setup"

# Docker vorhanden?
if ! command -v docker >/dev/null 2>&1; then
  echo "FEHLER: Docker ist nicht installiert. Bitte installieren: https://docs.docker.com/engine/install/" >&2
  exit 1
fi

# docker compose (v2) vorhanden?
if ! docker compose version >/dev/null 2>&1; then
  echo "FEHLER: 'docker compose' (v2) nicht verfügbar. Bitte Docker Compose Plugin installieren." >&2
  exit 1
fi

echo "==> Baue Image und starte Container (Port ${PORT})"
SITZMIX_PORT="${PORT}" docker compose up -d --build

echo "==> Status"
docker compose ps

echo ""
echo "Fertig. SitzMix läuft auf Port ${PORT}."
echo "Lokal erreichbar unter: http://localhost:${PORT}"
echo "Für sitzmix.ch: Reverse-Proxy (z.B. nginx/Caddy/Traefik) auf Port ${PORT} richten und TLS terminieren."
