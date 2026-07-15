# Limitations

Lexora is a screening and research platform. It is not a medical device and does not diagnose dyslexia.

## Clinical Limits

- Results must not replace evaluation by qualified clinicians, educators, or specialists.
- Model output should be read as a risk signal, not a definitive label.
- Dataset coverage, language, age range, hardware differences, lighting, reading ability, fatigue, and calibration quality can all affect results.

## Webcam Gaze Limits

- Webcam gaze estimation is less precise than research-grade eye tracking.
- Lighting, camera angle, face visibility, glasses, motion, and browser performance can reduce signal quality.
- Per-session calibration improves alignment but does not make webcam gaze equivalent to Tobii data.

## Tobii Limits

- Tobii mode requires compatible Tobii Pro hardware and the Tobii Research SDK.
- The local helper app runs on the user's machine and exposes only localhost endpoints.
- Hardware availability and SDK licensing are outside this repository.

## Model Limits

- Trained weights are tied to the datasets and feature pipeline used in `ml-work/`.
- Dataset shift is expected when moving across languages, ages, hardware, reading material, or collection settings.
- Domain adaptation reduces webcam/eye-tracker mismatch but does not remove it.
- Performance claims should only be made from reproducible evaluation reports, not informal testing.

## Data And Privacy Limits

- Raw gaze data can be sensitive behavioral data.
- Production deployments must review consent, retention, access control, and export policies.
- Do not redistribute third-party raw datasets unless their license permits it.

## Recommended Use

Use Lexora for portfolio review, research exploration, engineering reference, and controlled screening experiments. Use professional assessment for real educational or clinical decisions.
