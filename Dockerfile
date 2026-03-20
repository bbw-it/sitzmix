# ============================================
# Stage 1: Frontend bauen
# ============================================
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend

# Dependencies zuerst (Docker Layer-Cache)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

# Frontend-Source kopieren und bauen
COPY frontend/ ./
RUN npm run build

# ============================================
# Stage 2: Backend + gebautes Frontend
# ============================================
FROM node:22-alpine

WORKDIR /app

# Backend-Dependencies installieren
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev

# Backend-Source kopieren
COPY backend/ ./

# Gebautes Frontend in backend/public kopieren
COPY --from=frontend-build /app/frontend/dist ./public

# Uploads-Verzeichnis erstellen + Seed-Bilder kopieren
RUN mkdir -p /app/uploads
COPY database/seed/ /app/uploads/

# Port
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

# Start
CMD ["node", "server.js"]
