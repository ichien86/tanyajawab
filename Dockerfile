# ==============================================================================
# Stage 1: Build Frontend (React + Tailwind + Vite)
# ==============================================================================
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Production Server Runner (Node.js Express + MongoDB)
# ==============================================================================
FROM node:18-alpine
WORKDIR /app

# Atur variabel lingkungan produksi
ENV NODE_ENV=production
ENV PORT=5001

# Salin package.json backend dan pasang dependensi produksi
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Salin kode backend
COPY backend/ ./backend/

# Salin aset statis hasil kompilasi frontend dari Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Pastikan direktori uploads dan data tersedia
RUN mkdir -p /app/backend/uploads /app/backend/data

# Expose port aplikasi
EXPOSE 5001

# Jalankan server
CMD ["node", "backend/src/server.js"]

