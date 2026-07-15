<div align="center">
  <img src="web/public/images/lexora-logo.svg" alt="Lexora" width="92" />

  # Lexora

  **Dyslexia screening through calibrated gaze tracking, ML inference, and a production web experience.**

  <a href="https://lexora.page"><img alt="Live app" src="https://img.shields.io/badge/live-lexora.page-0ea5e9?style=flat-square"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-22c55e?style=flat-square"></a>
  <a href="web/package.json"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-111827?style=flat-square&logo=nextdotjs"></a>
  <a href="ml-service/pyproject.toml"><img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.109-059669?style=flat-square&logo=fastapi"></a>
  <a href="ml-service/pyproject.toml"><img alt="TensorFlow" src="https://img.shields.io/badge/TensorFlow-2.20-f97316?style=flat-square&logo=tensorflow"></a>
  <a href="web/prisma/schema.prisma"><img alt="Prisma" src="https://img.shields.io/badge/Prisma-7.8-334155?style=flat-square&logo=prisma"></a>
</div>

Lexora is an end-to-end dyslexia screening platform built from three moving pieces: a browser test experience, a Python ML inference service, and an optional local Tobii eye-tracker bridge. It began as a graduation project at the Faculty of Computing and Data Science, then grew into a production-grade monorepo with real deployment workflows, model artifacts, persistence, export tooling, and documented research provenance.

The app is live at [lexora.page](https://lexora.page).

> Lexora is a screening and research tool, not a medical diagnosis system. Results should be treated as decision support and reviewed by qualified specialists.

## Why This Project Matters

Lexora is more than a demo UI around a model. It tackles the hard parts that usually get skipped:

- **Browser gaze calibration:** per-session mapping from webcam iris landmarks to screen coordinates.
- **Two capture paths:** accessible webcam mode and higher-fidelity Tobii mode.
- **Model serving boundary:** FastAPI service with typed request/response contracts and test coverage.
- **Persistence:** Postgres metadata plus raw/derived gaze artifacts in Azure Blob Storage or Azurite.
- **Operational shape:** Vercel web deploys, Azure Container Apps for ML, GHCR images, and desktop app release builds.
- **Research trail:** notebooks and dataset notes for OneStop, ETDD70, WebQAmGaze, and the project webcam calibration dataset.

## Product Flow

<p align="center">
  <img src="docs/diagrams/lexora-use-cases.svg" alt="Lexora use cases" width="900">
</p>

Users can run either a webcam-based screening or a Tobii-based screening. Both flows guide the user through setup, calibration, reading, review, prediction, and result display. Authenticated attempts can be saved and exported by admins.

## Architecture

<p align="center">
  <img src="docs/diagrams/architecture/01-system-architecture.svg" alt="Lexora system architecture" width="900">
</p>

Lexora is built around a deliberate separation of concerns:

- **Browser first:** the screening experience, calibration UI, dashboards, and admin workflows live in the Next.js app.
- **ML behind a service boundary:** model inference is isolated in FastAPI so the web app does not need TensorFlow runtime dependencies.
- **Device integration stays local:** Tobii hardware access runs through a desktop helper because browser apps cannot talk directly to the Tobii SDK.
- **Large gaze artifacts stay out of Postgres:** relational tables store users, attempts, predictions, and metadata; raw/derived gaze payloads go to Azure Blob Storage or Azurite.
- **Deployment is split by runtime:** Vercel serves the web app, Azure Container Apps serves the ML API, and GitHub Releases ship the desktop bridge.

Focused architecture diagrams:

| View | What It Explains |
| --- | --- |
| [System architecture](docs/diagrams/architecture/01-system-architecture.svg) | Top-level client, cloud, ML, storage, and external-service boundaries |
| [Client and device architecture](docs/diagrams/architecture/02-client-device-architecture.svg) | Webcam flow, Tobii desktop bridge, local status API, and live gaze stream |
| [Backend architecture](docs/diagrams/architecture/03-backend-architecture.svg) | Auth, API routes, prediction requests, attempt persistence, and exports |
| [ML service architecture](docs/diagrams/architecture/04-ml-service-architecture.svg) | Request validation, feature processors, model loading, and inference services |
| [Deployment and CI/CD architecture](docs/diagrams/architecture/05-deployment-cicd-architecture.svg) | Vercel, Azure Container Apps, GHCR images, GitHub Actions, and desktop releases |

## Pipelines

| Pipeline | Diagram |
| --- | --- |
| Calibration | [calibration-pipeline.svg](docs/diagrams/pipelines/calibration-pipeline.svg) |
| Webcam gaze acquisition | [webcam-gaze-acquisition-pipeline.svg](docs/diagrams/pipelines/webcam-gaze-acquisition-pipeline.svg) |
| Tobii gaze acquisition | [tobii-gaze-acquisition-pipeline.svg](docs/diagrams/pipelines/tobii-gaze-acquisition-pipeline.svg) |
| ML prediction | [ml-prediction-pipeline.svg](docs/diagrams/pipelines/ml-prediction-pipeline.svg) |

Database overview:

<p align="center">
  <img src="docs/diagrams/lexora-erd.svg" alt="Lexora ERD" width="900">
</p>

## Tech Stack

| Area | Stack |
| --- | --- |
| Web app | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| Auth | Better Auth, Google OAuth, Resend magic links |
| Database | PostgreSQL, Prisma 7, Neon or local Docker Postgres |
| Storage | Azure Blob Storage in production, Azurite locally |
| ML service | Python 3.12, FastAPI, TensorFlow 2.20, Keras, scikit-learn |
| Desktop bridge | Python 3.10, FastAPI, CustomTkinter, Tobii Research SDK |
| Research workspace | Jupyter/Kaggle notebooks under `ml-work/` |
| Delivery | GitHub Actions, Vercel, Azure Container Apps, GHCR, PyInstaller releases |

## Repository Map

| Path | Purpose |
| --- | --- |
| [web](web/README.md) | Web app, calibration UI, API routes, Prisma schema, admin/history workflows |
| [ml-service](ml-service/README.md) | FastAPI prediction service, schemas, feature processors, test suite |
| [tobii-service](tobii-service/README.md) | Local desktop bridge for Tobii Pro eye trackers |
| [ml-work](ml-work/) | Training notebooks, experiment docs, model artifacts |
| [docs](docs/README.md) | Current docs, diagrams, dataset provenance, limitations |

Historical graduation-project deliverables are kept outside the repo because they describe an earlier planned product:

https://drive.google.com/drive/folders/17MBQ7sLCbuLmPgmWk7rpKUel1242uGa_

## Run Locally

Prerequisites:

- Node.js 24
- Python 3.12 for `ml-service`
- Python 3.10 for `tobii-service`
- Docker Desktop
- Git LFS

```powershell
git lfs install
git lfs pull
```

Start ML service:

```powershell
cd ml-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
python server.py
```

Start web app:

```powershell
cd web
npm install
Copy-Item .env.example .env.local
docker compose up -d
npx prisma migrate dev
npm run dev
```

Useful local env values:

```text
DATABASE_URL=postgresql://lexora:lexora_dev@localhost:5433/lexora
ML_SERVICE_URL=http://localhost:8001
AZURE_BLOB_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true
AZURE_BLOB_STORAGE_CONTAINER=test-attempts
```

Optional Tobii bridge:

```powershell
cd tobii-service
py -3.10 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

Tobii bridge endpoints:

- `GET http://localhost:28980/tobii/status`
- `ws://localhost:28980/tobii/gaze`

## Research And Data

Training and adaptation work lives in [ml-work](ml-work/). Dataset provenance and licensing notes are in [docs/DATASETS.md](docs/DATASETS.md).

Related writeups:

- [Domain adaptation and webcam model work](https://medium.com/@muhammedomran/d8190e8365be)
- [Per-session browser gaze calibration](https://medium.com/@muhammedomran/how-we-built-a-per-session-gaze-calibration-engine-for-a-browser-based-dyslexia-screening-tool-3c76bc692083)

## Documentation

- [Docs index](docs/README.md)
- [Diagrams](docs/diagrams/README.md)
- [Dataset provenance](docs/DATASETS.md)
- [Limitations](docs/LIMITATIONS.md)
- [ML API](ml-service/API.md)
- [Tobii API](tobii-service/API.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## License

Source code is licensed under Apache 2.0. Documentation is licensed under CC BY 4.0. Trained model weights use separate non-commercial terms described in [NOTICE](NOTICE).
