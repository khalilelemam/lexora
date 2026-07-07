# Lexora

**Web-based dyslexia screening through eye tracking.**

Lexora guides a user through a calibrated reading task, records their eye movements — with either a standard webcam or a Tobii Pro eye tracker — and uses machine-learning models to estimate dyslexia risk from their gaze patterns.

🌐 **Live at [lexora.page](https://lexora.page)**

## How It Works

1. **Calibration** — A point grid maps the user's gaze to screen coordinates (age-adapted visual modes for children).
2. **Reading Task** — Text is displayed in a controlled reading zone while gaze data is collected in real time.
3. **Review** — A gaze-trail replay lets the user verify data quality before submitting.
4. **ML Analysis** — Gaze data is sent to the ML service for fixation detection, feature extraction, and risk prediction.
5. **Results** — Risk level (low / medium / high) with probability score, recommendations, and an annotated gaze replay.

Two tracking modes are supported:

- **Webcam Mode** — MediaPipe FaceLandmarker tracks iris position in the browser. No special hardware needed.
- **Tobii Mode** — A local desktop helper streams research-grade gaze data from a Tobii Pro eye tracker over WebSocket.

## Architecture

```
┌────────────────────┐   HTTP/REST   ┌─────────────────────────┐
│  web  (Next.js)    │──────────────►│  ml-service  (FastAPI)  │
│  UI + API + Auth   │               │  TensorFlow models      │
│  Vercel            │               │  Azure Container Apps   │
└─────────┬──────────┘               └─────────────────────────┘
          │
          │ Prisma                   ┌─────────────────────────┐
          ▼                          │  tobii-service (local)  │
┌────────────────────┐   WebSocket   │  Desktop tray app that  │
│ PostgreSQL (Neon)  │◄─── browser   │  bridges Tobii Pro      │
│ Azure Blob Storage │    connects   │  hardware to the web    │
└────────────────────┘    directly   └─────────────────────────┘
```

## Repository Structure

| Directory | What It Is |
| --------- | ---------- |
| [`web/`](web/README.md) | Next.js application (frontend + API routes). TypeScript, React 19, Tailwind, Better Auth, Prisma. Handles the full screening flow and persistence. |
| [`ml-service/`](ml-service/README.md) | Python FastAPI service that predicts dyslexia risk from gaze data using TensorFlow models. Deployed to Azure Container Apps. |
| [`tobii-service/`](tobii-service/README.md) | Local desktop helper (Python + customtkinter) that exposes a Tobii Pro eye tracker to the browser via a local WebSocket on port 28980. |
| [`ml-work/`](ml-work/README.md) | Jupyter notebooks, training pipelines, and research docs used to produce the models served by `ml-service`. |
| [`docs/`](docs) | Requirements documents, UML diagrams, and database schema diagrams. |

## Quick Start

Full step-by-step instructions live in [setup.md](setup.md). The short version:

```bash
# 1. Web app (requires Node.js + Docker)
cd web
npm install
cp .env.example .env.local   # fill in values — see web/README.md
docker compose up -d          # local PostgreSQL + Azurite blob storage
npx prisma migrate dev
npm run dev                   # http://localhost:3000

# 2. ML service (requires Python 3.12+) — separate terminal
cd ml-service
python -m venv .venv && .venv/Scripts/Activate.ps1   # or source .venv/bin/activate
pip install -e ".[dev]"
python server.py              # http://localhost:8001

# 3. Tobii helper (optional, only for Tobii hardware; requires Python 3.10)
cd tobii-service
python -m venv .venv && .venv/Scripts/Activate.ps1
pip install -r requirements.txt
python main.py
```

Open [http://localhost:3000](http://localhost:3000) in a Chromium-based browser (Chrome/Edge recommended for WebGL + MediaPipe support).

## Tech Stack

- **Frontend / Backend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Better Auth (Google OAuth + magic links via Resend)
- **Data:** PostgreSQL (Neon in production, Docker locally) via Prisma; Azure Blob Storage (Azurite locally) for raw/derived gaze artifacts
- **ML:** FastAPI, TensorFlow / Keras, scikit-learn
- **Eye Tracking:** MediaPipe tasks-vision (webcam) and Tobii Pro SDK (`tobii_research`)
- **CI/CD:** GitHub Actions — [`web-vercel-deploy.yml`](.github/workflows/web-vercel-deploy.yml) (Vercel), [`ml-service.yml`](.github/workflows/ml-service.yml) (Azure Container Apps), [`build-release.yml`](.github/workflows/build-release.yml) (Tobii desktop builds)

## Deployment

- **Web** deploys to Vercel; production config is sourced from the GitHub environment `web-production`. See [web/README.md](web/README.md#production-config-and-deploy).
- **ML service** ships as a Docker image on GHCR (`ghcr.io/khalil-elemam/lexora-ml`) and deploys to Azure Container Apps on `lexora-ml-v*` tags. See [ml-service/README.md](ml-service/README.md#azure-deployment-container-apps).
- **Tobii service** is packaged with PyInstaller for Windows/macOS/Linux and published on the [Releases page](https://github.com/khalilelemam/lexora/releases).

## License

Proprietary. This repository is part of the Lexora project.
