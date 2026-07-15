# Dataset Provenance

Lexora's models and notebooks use several gaze datasets. This file records what each dataset was used for and what license was known at the time of review.

Last reviewed: 2026-07-14.

## OneStop Eye Movements

- Source: https://lacclab.github.io/OneStop-Eye-Movements/
- OSF: https://osf.io/2prdq/
- Used for: foundation gaze encoder pretraining in `ml-work/*/notebooks/0_one_stop_encoder*.ipynb`.
- Access path in notebooks: `pymovements.Dataset("OneStop")`.
- License: eye-tracking data and anonymized questionnaire responses are CC BY 4.0. Underlying OneStopQA text materials use CC BY-SA 4.0.

## ETDD70

- Source: https://zenodo.org/records/13332134
- Used for: dyslexia/non-dyslexia supervised training and integration test fixtures.
- Access path in notebooks: `pymovements.Dataset("ETDD70")`.
- License: CC BY 4.0, per Zenodo.

## WebQAmGaze

- Source: https://github.com/tfnribeiro/WebQAmGaze
- Paper: https://arxiv.org/abs/2303.17876
- Used for: early webcam-domain adaptation experiments in `ml-work/webcam/notebooks/2_webqam_gaze_uda.ipynb`.
- License: CC BY 4.0, per project README.

## Project Webcam Calibration Dataset

- Source: https://www.kaggle.com/datasets/muhammedomran/mediapipe-with-reses
- Used for: webcam-domain adaptation after WebQAmGaze was not enough for Lexora's calibration setup.
- License: verify on Kaggle before redistributing derived data or trained artifacts. The dataset is referenced for provenance, but raw dataset contents are not copied into this repository.

## Tooling

- `pymovements`: used in notebooks to download and process public eye-movement datasets.
- MediaPipe Face Landmarker: used in the browser webcam pipeline.

## Project Writeups

- Domain adaptation / webcam model writeup: https://medium.com/@muhammedomran/d8190e8365be
- Browser gaze calibration writeup: https://medium.com/@muhammedomran/how-we-built-a-per-session-gaze-calibration-engine-for-a-browser-based-dyslexia-screening-tool-3c76bc692083

## Maintainer Notes

- Do not commit raw third-party datasets unless their license explicitly permits redistribution.
- Keep generated model weights separate from raw dataset licenses. Model weights may have stricter project terms than the public datasets used to train them.
- When adding a dataset, record source URL, access method, license, and which notebook or service uses it.
