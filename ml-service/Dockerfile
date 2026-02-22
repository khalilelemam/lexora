# Multi-stage build for smaller final image
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment and install Python dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# Final stage
FROM python:3.12-slim

WORKDIR /app

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Runtime system dependency required by TensorFlow
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Run as non-root user
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

# Application files
COPY --chown=appuser:appuser app/ ./app/
COPY --chown=appuser:appuser models/ ./models/
COPY --chown=appuser:appuser server.py .

# Runtime environment
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 HOST=0.0.0.0 PORT=8001

EXPOSE 8001

# Simple healthcheck against local /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/health').read()" || exit 1

CMD ["python", "server.py"]
