# ============================================
# Stage 1: Frontend bauen
# ============================================
FROM node:22-alpine AS build

WORKDIR /app

# Dependencies zuerst (Docker Layer-Cache)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Source kopieren und bauen
COPY frontend/ ./
RUN npm run build

# ============================================
# Stage 2: Statisches Hosting via Nginx
# ============================================
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
