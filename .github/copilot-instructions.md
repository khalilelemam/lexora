# Lexora – Copilot Instructions

## Project Overview

Lexora is a dyslexia screening platform. Three services in this monorepo:
- **ml-service/** (Python 3.12): Cloud FastAPI for ML inference
- **tobii-service/** (Python 3.10): Desktop eye-tracker app (GUI + API)
- **web/** (Next.js 16 + React 19): Web platform (TypeScript, Tailwind, shadcn/ui)

`ml-work/` is a notebook playground, not part of the deployed system.

## Architecture

- **ml-service** (port 8001): Cloud FastAPI for ML inference. App factory in `app/api.py`, services on `app.state` (no `Depends()` DI), accessed via `request.app.state.<service>`.
- **tobii-service** (port 28980): Local desktop app. GUI (`gui_window.py`) and API server run in **separate processes** via `multiprocessing.Process`. Tray icon in a daemon thread.
- **web**: Next.js App Router with `src/` directory. TypeScript, Tailwind CSS v4, shadcn/ui (New York style).

Each ML pipeline pairs `*FeatureProcessor` + `*PredictionService`. Services return plain `dict`; routers build Pydantic responses.

## Conventions

- **JSON API:** `snake_case` in Python, `camelCase` over the wire — all schemas use `alias_generator=to_camel` with `populate_by_name=True`.
- **OpenAPI examples** live in `schemas/examples.py`, not inline in schema classes.
- **`__init__.py` files are barrel exports** — every package re-exports public symbols in `__all__`.
- **Error handling:** Custom `ErrorResponse` schema with `{code, message, details?}` envelope. Pydantic → 422 with clean format (no internals exposed); `ValueError` from services → router catches → 400; unhandled `Exception` → global handler → 500.
- **Linting:** `ruff check` and `ruff format` (CI enforces on ml-service).
- **Line endings:** `.gitattributes` normalizes to LF in repo (`.py`, `.ts`, `.json`, `.yml`, etc.).

## Dev Commands

```powershell
# ml-service
cd ml-service; python server.py                              # http://localhost:8001/docs
pytest tests/ --ignore=tests/integration/                    # Unit tests (TF mocked)
$env:REAL_TF="1"; pytest tests/integration/ -v               # Integration (needs real models)

# tobii-service
cd tobii-service; python main.py                             # Dev server with reload
python gui_window.py                                         # Desktop app with GUI

# web
cd web; npm run dev                                          # http://localhost:3000
npm run build                                                # Production build
npm run lint                                                 # ESLint check
```

## Testing Gotchas

- `conftest.py` replaces `tensorflow`/`keras` with `MagicMock` before app imports. Set `REAL_TF=1` only for integration tests.
- Endpoint tests mock `request.app.state` to inject services — no ML overhead.
- Test data in `tests/fixtures/` (real ETDD70 CSVs) organized by outcome: `tp/`, `tn/`, `fp/`.

## CI/CD

- **ml-service:** `lexora-ml-v*` tags → lint → test → integration-test → Docker push to `ghcr.io/khalil-elemam/lexora-ml`.
- **tobii-service:** `lexora-v*` tags → PyInstaller build (Win/Mac/Linux) → GitHub Release.
- **web:** (CI/CD not yet configured)
- Model files (`.keras`, `.pkl`) are in **Git LFS**.

## Key Gotchas

- **Three separate stacks:** ml-service (Python 3.12), tobii-service (Python 3.10, Tobii SDK constraint), web (Node.js/Next.js).
- **Model files:** Use `.keras` format (not `.h5`). All tracked in Git LFS.
- **Prediction responses:** Include raw `features` data (per-fixation vectors) for MinIO/S3 storage and bubble-replay visualization.
- Webcam pipeline reuses `EYE_TRACKER_SEQUENCE_LENGTH` / `EYE_TRACKER_SEQUENCE_STEP` — intentional, same training params.
- Startup calls `config.validate_model_files()` and fails fast if `.keras`/`.pkl` models are missing.
- tobii-service PyInstaller builds: `None` stdout/stderr → `os.devnull`, app object passed directly to uvicorn (string import fails frozen), plain-text log config (no color formatter).
