# Lexora Documentation

This folder explains the current Lexora project: a live dyslexia screening platform with a Next.js web app, a Python ML inference service, optional Tobii eye-tracker support, and research artifacts used to train and evaluate the models.

Use the root [README](../README.md) for the project pitch, setup path, and repository map. Use this folder when you want the deeper engineering and research context behind the system.

## Start Here

| Goal | Read |
| --- | --- |
| Understand the system design | [Diagrams](diagrams/README.md) |
| Check dataset provenance and usage | [Dataset provenance](DATASETS.md) |
| Understand product and research limits | [Limitations](LIMITATIONS.md) |
| Run the web app | [Web README](../web/README.md) |
| Run or integrate with the ML service | [ML service README](../ml-service/README.md) and [ML API](../ml-service/API.md) |
| Run the Tobii desktop bridge | [Tobii service README](../tobii-service/README.md) and [Tobii API](../tobii-service/API.md) |
| Contribute safely | [Contributing](../CONTRIBUTING.md) and [Security](../SECURITY.md) |

## What Lives Here

- `DATASETS.md` documents the research datasets and project-created webcam calibration data referenced by the ML work.
- `LIMITATIONS.md` records the important product, model, and clinical boundaries. Lexora is a screening and research tool, not a diagnosis system.
- `diagrams/` contains rendered Eraser diagrams and the editable source used to maintain them.

## Historical Project Documents

Lexora began as a graduation project at the Faculty of Computing and Data Science. The old submission documents are not kept in this repository because they describe an earlier version of the product and would confuse readers trying to understand the current implementation.

They are preserved here for historical reference:

https://drive.google.com/drive/folders/17MBQ7sLCbuLmPgmWk7rpKUel1242uGa_

## Documentation Standards

- Keep docs aligned with working code and deployed behavior.
- Be explicit when a feature is experimental, historical, or planned.
- Keep editable diagram source beside rendered SVG output.
- Prefer short, reviewed docs over large stale folders.
- Do not copy external dataset files or licensed papers into the repo unless their license clearly allows redistribution.
