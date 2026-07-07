# ML Work — Model Training & Research

Jupyter notebooks, trained model artifacts, and research documentation behind the dyslexia-screening models served by [`ml-service`](../ml-service/README.md).

This folder is **experimentation and training only** — nothing here runs in production. The final artifacts produced here are copied into `ml-service/models/` for serving.

## Structure

```
ml-work/
├── eye-tracker/          # High-precision eye tracker pipeline
│   ├── notebooks/
│   │   ├── 0_one_stop_encoder.ipynb          # Pretrains a gaze sequence encoder
│   │   └── 1_the_reading_profile_model.ipynb # Trains the dyslexia profile classifier
│   ├── models/
│   │   ├── gaze_encoder_pretrained.keras     # Pretrained encoder (intermediate artifact)
│   │   ├── dyslexia_profile_model.keras      # Final classifier  → served by ml-service
│   │   └── scaler.pkl                        # Feature scaler    → served by ml-service
│   └── docs/                                 # Model guide + technical specification (PDF)
│
└── webcam/               # Webcam gaze pipeline (domain adaptation)
    ├── notebooks/
    │   ├── 0_one_stop_encoder_webcam.ipynb          # Encoder pretraining (webcam domain)
    │   ├── 1_the_reading_profile_model_webcam.ipynb # Profile model (webcam domain)
    │   └── 2_webqam_gaze_uda.ipynb                  # Unsupervised Domain Adaptation (UDA)
    ├── models/
    │   ├── gaze_encoder_pretrained.keras
    │   ├── dyslexia_profile_model.keras
    │   └── uda-model/
    │       ├── dyslexia_uda_classifier.keras        # Final classifier  → served by ml-service
    │       ├── dyslexia_uda_encoder.keras           # UDA encoder (intermediate artifact)
    │       └── target_domain_scaler.pkl             # Feature scaler    → served by ml-service
    └── docs/                                        # UDA classifier guide (PDF)
```

## The Two Pipelines

### Eye Tracker

Trains on high-precision eye tracker recordings from three reading tasks (syllables, meaningful text, pseudo-words). The notebooks run in order:

1. **`0_one_stop_encoder.ipynb`** — pretrains a sequence encoder on gaze data.
2. **`1_the_reading_profile_model.ipynb`** — builds the reading-profile classifier on top of the pretrained encoder, producing `dyslexia_profile_model.keras` and `scaler.pkl`.

### Webcam

Webcam gaze data is noisier and distributed differently than eye tracker data, so this pipeline adds an **Unsupervised Domain Adaptation (UDA)** step to transfer what the eye tracker model learned to the webcam domain:

1. **`0_one_stop_encoder_webcam.ipynb`** — encoder pretraining on the webcam domain.
2. **`1_the_reading_profile_model_webcam.ipynb`** — reading-profile model for the webcam domain.
3. **`2_webqam_gaze_uda.ipynb`** — UDA training, producing the final `dyslexia_uda_classifier.keras` and `target_domain_scaler.pkl`.

## Relationship to `ml-service`

The service expects these artifacts (see [ml-service/README.md](../ml-service/README.md#model-files)):

| Trained here | Deployed to |
| ------------ | ----------- |
| `eye-tracker/models/dyslexia_profile_model.keras` | `ml-service/models/eye-tracker/dyslexia_profile_model.keras` |
| `eye-tracker/models/scaler.pkl` | `ml-service/models/eye-tracker/scaler.pkl` |
| `webcam/models/uda-model/dyslexia_uda_classifier.keras` | `ml-service/models/webcam/dyslexia_uda_classifier.keras` |
| `webcam/models/uda-model/target_domain_scaler.pkl` | `ml-service/models/webcam/target_domain_scaler.pkl` |

When retraining produces a new model, copy the artifacts into `ml-service/models/` and run the ml-service integration tests (`REAL_TF=1 pytest tests/integration/ -v`) before releasing.

## Documentation

Each pipeline ships a PDF guide in its `docs/` folder covering model architecture, training methodology, and deployment notes:

- `eye-tracker/docs/guide-for-reading-profile-model.pdf`
- `eye-tracker/docs/technical-specification-and-deployment-guide.pdf`
- `webcam/docs/guide-webqam-gaze-uda-dyslexia-classifier.pdf`
