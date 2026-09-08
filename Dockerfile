# ==============================================================================
# Multi-Stage Dockerfile for NexusRAG Research Assistant
# Combines React Frontend & FastAPI Backend into a Single Production Container
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend Assets
# ------------------------------------------------------------------------------
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Python Backend + Static UI Serving
# ------------------------------------------------------------------------------
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy Backend application code
COPY backend/ ./backend/

# Copy Frontend production distribution from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create persistent storage directories
RUN mkdir -p /app/backend/data/qdrant \
             /app/backend/data/bm25 \
             /app/backend/data/uploads \
             /app/backend/data/cache

WORKDIR /app/backend

# Expose API and UI port
EXPOSE 8000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Start Uvicorn production server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
