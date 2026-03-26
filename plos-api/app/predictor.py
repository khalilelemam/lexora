from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class PredictionResult:
    probability: float
    threshold: float
    prediction: str
    confidence: float


class DyslexiaPredictor:
    """Loads the exported model package and runs feature-validated inference."""

    def __init__(self, model_path: str):
        self.model = None
        self.threshold: float = 0.24
        self.feature_names: list[str] = []
        self.model_version = "1.0"
        self._load_model(model_path)

    def _load_model(self, model_path: str) -> None:
        resolved = Path(model_path).expanduser().resolve()
        if not resolved.exists():
            raise FileNotFoundError(f"Model file not found: {resolved}")

        package = joblib.load(resolved)
        self.model = package["model"]
        self.threshold = float(package.get("threshold", 0.24))
        self.feature_names = list(package["feature_names"])
        self.model_version = str(package.get("version", "1.0"))

        logger.info(
            "Model loaded from %s (features=%s, threshold=%.3f)",
            resolved,
            len(self.feature_names),
            self.threshold,
        )

    def is_ready(self) -> bool:
        return self.model is not None and len(self.feature_names) > 0

    def validate_payload(self, payload: dict[str, Any]) -> tuple[bool, str]:
        missing = [name for name in self.feature_names if name not in payload]
        if missing:
            sample = ", ".join(missing[:6])
            return False, f"Missing required feature(s): {sample}"

        age = payload.get("Age")
        if age is None or not (7 <= int(age) <= 17):
            return False, "Age must be between 7 and 17"

        for field in ("Gender", "Nativelang", "Otherlang"):
            value = payload.get(field)
            if value not in (0, 1):
                return False, f"{field} must be 0 or 1"

        return True, ""

    def predict(self, payload: dict[str, Any]) -> PredictionResult:
        if not self.is_ready():
            raise RuntimeError("Predictor is not ready")

        vector = np.array(
            [float(payload.get(feature, 0.0)) for feature in self.feature_names],
            dtype=float,
        )
        frame = pd.DataFrame([vector], columns=self.feature_names)
        probability = float(self.model.predict_proba(frame)[0, 1])
        prediction = "Dyslexia Risk" if probability >= self.threshold else "No Risk"

        # Confidence as distance from uncertainty (0.5), scaled to [0, 1].
        confidence = min(1.0, abs(probability - 0.5) * 2)

        return PredictionResult(
            probability=probability,
            threshold=self.threshold,
            prediction=prediction,
            confidence=confidence,
        )
