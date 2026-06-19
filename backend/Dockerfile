# backend/Dockerfile
FROM python:3.12-slim AS base

# System deps: build tools for native wheels, libsndfile for audio/VAD.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# 1. Install deps first so this layer caches across code changes.
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# 2. Copy source + the prebuilt static RAG artifacts.
#    data/ MUST contain alchemy_codex.pdf and index_storage/ (generated locally
#    before you build — see note below). The inventory is NOT here: it's in Supabase.
COPY src/ ./src/
COPY data/ ./data/

# 3. Bake the model weights into the image at BUILD time.
#    `download-files` fetches the Silero VAD + LiveKit turn-detector weights.
#    Doing it here means: fast cold start (no first-call download stall) and
#    no runtime dependency on Hugging Face being reachable from Fargate.
RUN python src/agent.py download-files

# 4. Run as a non-root user.
RUN useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser

# Optional: the agent's built-in health server (see §8). Not required for traffic.
EXPOSE 8081

# Production worker entrypoint. `start` (NOT `dev`) = no hot reload, prod logging.
# App Runner overrides this CMD with the token-server command (see §6).
CMD ["python", "src/agent.py", "start"]