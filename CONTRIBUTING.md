# Contributing to Lexora

Thanks for your interest in contributing to Lexora. This document covers the practical workflow, conventions, and per-service development commands you need to land a change.

## Code of conduct

By participating, you agree to abide by the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to `khalil.elemam@lexora.page`.

## Repository layout

Lexora is a monorepo with three independently deployable services and one notebook workspace:

| Path | Stack | Python / Node |
|------|-------|---------------|
| `web/` | Next.js 16, React 19, Tailwind v4, Prisma 7.8 | Node 24 |
| `ml-service/` | FastAPI, TensorFlow 2.20 | Python 3.12 |
| `tobii-service/` | CustomTkinter, FastAPI, Tobii SDK | Python 3.10 |
| `ml-work/` | Jupyter notebooks (training only, not deployed) | Python 3.12 |

See [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for the full architecture conventions reference.

## Development setup

Each service has its own setup. See the root [`README.md`](README.md#quick-start) for the unified quick start. The short version:

```bash
git clone https://github.com/khalilelemam/lexora.git
cd lexora
git lfs install && git lfs pull   # fetch .keras / .pkl model files
```

Then follow the per-service instructions in [`web/README.md`](web/README.md), [`ml-service/README.md`](ml-service/README.md), and [`tobii-service/README.md`](tobii-service/README.md).

## Branch and commit flow

1. **Fork and clone** the repository.
2. **Create a branch** from `main`:
   - `feat/<scope>-<short-description>` for new features (e.g. `feat/web-calibration-star-mode`)
   - `fix/<scope>-<short-description>` for bug fixes
   - `docs/<short-description>` for documentation only
   - `chore/<short-description>` for tooling, deps, CI
3. **Make changes in small, reviewable commits.** Each commit should compile and pass tests.
4. **Open a pull request** against `main`. Link any related issue in the PR description.

### Commit message style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body optional>

<footer optional>
```

- **type:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`
- **scope:** `web`, `ml-service`, `tobii-service`, `ml-work`, `docs`, `ci` (omit if cross-cutting)
- **subject:** imperative, lowercase, no period, ≤ 72 chars

Examples:

```
feat(web): add star calibration mode for ages 7-9
fix(ml-service): reject webcam requests with < 20 gaze points before processing
docs(tobii-service): correct WebSocket URL in integration example
chore(ci): pin ruff to 0.14.0 in ml-service workflow
```

## Per-service development commands

### web/

```bash
cd web
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run lint         # ESLint
npx prettier --check .       # formatting check used by CI
npx prisma migrate dev        # apply schema changes locally
npx prisma generate           # regenerate Prisma client
npm run blobs:export          # export Azurite blobs to ./tmp/
```

### ml-service/

```bash
cd ml-service
source .venv/bin/activate
python server.py                          # http://localhost:8001/docs

pytest tests/ --ignore=tests/integration/ # unit tests (TF mocked, fast)
REAL_TF=1 pytest tests/integration/ -v    # integration tests (needs real .keras)

ruff check .                              # lint
ruff format .                             # format
```

### tobii-service/

```bash
cd tobii-service
source .venv/bin/activate
python main.py          # GUI + API server (separate processes via multiprocessing)
python gui_window.py    # GUI only (no API)
```

## Conventions

### API design

- **JSON casing:** `snake_case` in Python, `camelCase` over the wire. All Pydantic schemas use `alias_generator=to_camel` with `populate_by_name=True`.
- **OpenAPI examples** live in `ml-service/app/schemas/examples.py`, not inline in schema classes.
- **Error envelope:** `{code: string, message: string, details?: any}`. Pydantic validation → 422; `ValueError` raised by services → 400; unhandled `Exception` → 500 (no internals exposed).
- **`__init__.py` files** are barrel exports — every package re-exports public symbols in `__all__`.

### ML pipelines

Each pipeline pairs a `*FeatureProcessor` with a `*PredictionService`:

- `EyeTrackerFeatureProcessor` + `EyeTrackerPredictionService` — 3-task neural network (syllables, meaningful, pseudo)
- `WebcamFeatureProcessor` + `WebcamPredictionService` — UDA classifier with domain adaptation

Services return plain `dict`. Routers build Pydantic responses. Do not return Pydantic models from services — this keeps the service layer testable without FastAPI.

### Database

- **ORM:** Prisma 7.8 with PostgreSQL (Neon in production, Docker locally).
- **Schema source of truth:** `web/prisma/schema.prisma`.
- **Migrations:** `web/prisma/migrations/`. Always create a migration for schema changes — `npx prisma migrate dev --name <description>`.
- **Current models:** `User`, `Account`, `Session`, `TestAttempt`, `Verification` (5 models, 5 enums).

### Code style

- **Python:** `ruff check` and `ruff format` (CI-enforced on `ml-service`).
- **TypeScript:** ESLint + Prettier (`eslint-config-next` + `prettier-plugin-tailwindcss`).
- **Line endings:** `.gitattributes` normalizes to LF in the repo. Do not commit CRLF.
- **Model files:** use `.keras` format, not `.h5`. All model files are tracked in Git LFS.

## Pull request checklist

Before opening a PR, verify:

- [ ] Branch is up to date with `main`
- [ ] Commit messages follow Conventional Commits
- [ ] `npm run lint` passes (for `web/` changes)
- [ ] `ruff check .` passes (for `ml-service/` changes)
- [ ] Unit tests pass: `pytest tests/ --ignore=tests/integration/` (for `ml-service/`)
- [ ] `npm run build` succeeds (for `web/` changes)
- [ ] If you changed the Prisma schema, you created a migration
- [ ] If you changed an API contract, you updated the corresponding `API.md`
- [ ] If you changed documented behavior, you updated the docs in the same PR
- [ ] If you changed datasets/model provenance, you updated `docs/DATASETS.md` and `NOTICE`
- [ ] No secrets, credentials, or `.env` files are committed
- [ ] If you added a new dependency, it's justified in the PR description

## CI/CD

CI runs automatically for these paths/events:

- **`ml-service`:** lint, unit tests, and integration tests on pushes/PRs that touch `ml-service`; Docker build/push and Azure deploy on `lexora-ml-v*` tags.
- **`web`:** Prettier and ESLint checks on PRs that touch `web`; Vercel deploy on `lexora-web-v*` tags or manual dispatch.
- **`tobii-service`:** PyInstaller builds and GitHub Release artifacts on `lexora-v*` tags.

Releases are tag-triggered:

| Tag pattern | Triggers |
|-------------|----------|
| `lexora-ml-v*` | ML service Docker build + Azure Container Apps deploy |
| `lexora-v*` | Tobii service PyInstaller builds (Win/macOS/Linux) + GitHub Release |

## Reporting bugs and requesting features

- **Bugs:** open a [GitHub Issue](https://github.com/khalilelemam/lexora/issues) with the bug template. Include: service (`web` / `ml-service` / `tobii-service`), browser/OS, steps to reproduce, expected vs. actual behavior, and relevant logs.
- **Features:** open a GitHub Discussion first to align on scope before opening a PR.
- **Security vulnerabilities:** see [`SECURITY.md`](SECURITY.md). Do not open a public issue.

## Questions

Open a [GitHub Discussion](https://github.com/khalilelemam/lexora/discussions) for usage questions, architecture questions, or anything that isn't a bug report.
