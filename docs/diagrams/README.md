# Diagrams

Diagrams are rendered as SVG from Eraser sources. Keep both in the repository:

- SVG is what GitHub readers see.
- Source is what maintainers edit and review.

This avoids the usual trap where diagrams look good once, then become impossible to update.

## Architecture

| Diagram | Source |
| --- | --- |
| [01-system-architecture.svg](architecture/01-system-architecture.svg) | [source](source/architecture/01-system-architecture.eraserdiagram) |
| [02-client-device-architecture.svg](architecture/02-client-device-architecture.svg) | [source](source/architecture/02-client-device-architecture.eraserdiagram) |
| [03-backend-architecture.svg](architecture/03-backend-architecture.svg) | [source](source/architecture/03-backend-architecture.eraserdiagram) |
| [04-ml-service-architecture.svg](architecture/04-ml-service-architecture.svg) | [source](source/architecture/04-ml-service-architecture.eraserdiagram) |
| [05-deployment-cicd-architecture.svg](architecture/05-deployment-cicd-architecture.svg) | [source](source/architecture/05-deployment-cicd-architecture.eraserdiagram) |

## Pipelines

| Diagram | Source |
| --- | --- |
| [calibration-pipeline.svg](pipelines/calibration-pipeline.svg) | [source](source/pipelines/calibration-pipeline.eraserdiagram) |
| [webcam-gaze-acquisition-pipeline.svg](pipelines/webcam-gaze-acquisition-pipeline.svg) | [source](source/pipelines/webcam-gaze-acquisition-pipeline.eraserdiagram) |
| [tobii-gaze-acquisition-pipeline.svg](pipelines/tobii-gaze-acquisition-pipeline.svg) | [source](source/pipelines/tobii-gaze-acquisition-pipeline.eraserdiagram) |
| [ml-prediction-pipeline.svg](pipelines/ml-prediction-pipeline.svg) | [source](source/pipelines/ml-prediction-pipeline.eraserdiagram) |

## Product And Data

| Diagram | Source |
| --- | --- |
| [lexora-use-cases.svg](lexora-use-cases.svg) | [source](source/use-cases/lexora-use-cases.json) |
| [lexora-erd.svg](lexora-erd.svg) | [source](source/schema/lexora-erd.eraserdiagram) |

## Update Workflow

1. Edit source under `docs/diagrams/source/`.
2. Render updated SVG in Eraser.
3. Replace SVG in the matching folder.
4. Review SVG visually before committing.
5. Commit source and SVG together.
