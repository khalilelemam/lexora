# PLOS — Dyslexia Risk Prediction Model

## Overview

Machine learning model to predict the risk of dyslexia based on a gamified online test.

**Paper:** Rello et al., _"Predicting risk of dyslexia with an online gamified test"_, PLOS ONE 15(12), 2020.
[DOI: 10.1371/journal.pone.0241687](https://doi.org/10.1371/journal.pone.0241687)

---

## 📁 Folder Structure

```
plos/
├── README.md              ← You are here
├── requirements.txt       ← Python dependencies
├── plos-model.joblib      ← Trained model (ready for production)
├── plos_model.ipynb       ← Full training notebook (reproducible)
├── Data/
│   ├── Dyt-desktop.csv    ← Desktop dataset (3,644 participants)
│   └── Dyt-tablet.csv     ← Tablet dataset (1,395 participants)
└── reference/
    └── paper.pdf          ← Original research paper
```

---

## 🚀 Quick Start — Using the Model

### Installation

```bash
pip install -r requirements.txt
```

### Loading & Running Predictions

```python
import joblib
import numpy as np

# Load the model package
pkg = joblib.load('plos-model.joblib')
model     = pkg['model']           # sklearn RandomForestClassifier
threshold = pkg['threshold']       # Optimal decision threshold
features  = pkg['feature_names']   # List of 196 feature names

# Prepare input (must be a 2D array with 196 features)
# Features: Gender, Nativelang, Otherlang, Age, Clicks1, Hits1, ..., Missrate32
sample = np.zeros((1, 196))  # Replace with real data

# Get prediction
probability = model.predict_proba(sample)[:, 1][0]
has_risk = probability >= threshold

print(f"Dyslexia probability: {probability:.2%}")
print(f"Risk detected: {has_risk}")
```

---

## 📊 Model Details

| Property               | Value                                                                |
| ---------------------- | -------------------------------------------------------------------- |
| **Algorithm**          | Random Forest                                                        |
| **Trees**              | 200                                                                  |
| **Max Depth**          | Unlimited                                                            |
| **Class Weight**       | Balanced                                                             |
| **Input Features**     | 196 (4 demographic + 192 performance)                                |
| **Output**             | Probability [0, 1]                                                   |
| **Decision Threshold** | ~0.205 in current export (always read from model package at runtime) |
| **Accuracy**           | ~79%                                                                 |
| **Recall (Dyslexia)**  | ~80%                                                                 |
| **ROC AUC**            | 0.869                                                                |

---

## 📋 Feature Schema

The model expects **196 numeric features** in the following order:

### Demographic Features (4)

| #   | Feature      | Type | Encoding         |
| --- | ------------ | ---- | ---------------- |
| 1   | `Gender`     | int  | Male=1, Female=0 |
| 2   | `Nativelang` | int  | Yes=1, No=0      |
| 3   | `Otherlang`  | int  | Yes=1, No=0      |
| 4   | `Age`        | int  | 7–17             |

### Performance Features (192)

For each of the **32 questions** (Q1–Q32), there are **6 measures**:

| Measure       | Description                      |
| ------------- | -------------------------------- |
| `Clicks{N}`   | Total number of clicks           |
| `Hits{N}`     | Number of correct answers        |
| `Misses{N}`   | Number of incorrect answers      |
| `Score{N}`    | Sum of hits for the question set |
| `Accuracy{N}` | Hits / Clicks                    |
| `Missrate{N}` | Misses / Clicks                  |

**Column order:** `Clicks1, Hits1, Misses1, Score1, Accuracy1, Missrate1, Clicks2, ...`

The full list of feature names is available in the model package:

```python
pkg = joblib.load('plos-model.joblib')
print(pkg['feature_names'])
```

---

## 🔧 Web Integration Notes

### API Response Format (suggested)

```json
{
  "probability": 0.312,
  "threshold": 0.205,
  "risk_detected": true,
  "risk_level": "high",
  "label": "Dyslexia Risk"
}
```

### Risk Level Mapping (suggested)

```python
def get_risk_level(probability, threshold):
    if probability >= threshold * 2:
        return "high"
    elif probability >= threshold:
        return "moderate"
    else:
        return "low"
```

### Missing Data Handling

- If a participant skips a question, fill the 6 corresponding features with `0`.
- All features must be numeric; encode categoricals before passing to the model.

---

## 📓 Reproducing the Model

Open and run `plos_model.ipynb` to reproduce all results:

```bash
jupyter notebook plos_model.ipynb
```

The notebook includes:

1. Data loading & exploratory analysis
2. 10-fold cross-validation (Table 4 replication)
3. Tablet robustness test (Table 8 replication)
4. Feature importance analysis (Tables 6 & 7)
5. Model export

---

## 📦 Model Package Contents

The `plos-model.joblib` file contains a Python dictionary with:

```python
{
    'model':              # sklearn RandomForestClassifier (trained)
    'threshold':          # float — optimal decision threshold
    'feature_names':      # list[str] — ordered feature names (196)
    'target_name':        # str — 'Dyslexia'
    'n_features':         # int — 196
    'n_training_samples': # int — 3644
    'class_labels':       # dict — {0: 'Non-Dyslexia', 1: 'Dyslexia'}
    'encoding':           # dict — categorical encoding maps
    'model_params':       # dict — full sklearn hyperparameters
}
```
