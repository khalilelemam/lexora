import logging
import pickle

import keras
import numpy as np

from app.config import settings
from app.schemas import RiskLevel

logger = logging.getLogger(__name__)


class WebcamPredictionService:
    """Single-task webcam prediction using UDA (Unsupervised Domain Adaptation) model."""

    def __init__(self):
        self.model = None
        self.scaler = None
        self._load_model()
        self._load_scaler()
        self._warmup_model()

    def _load_model(self):
        logger.info(f"Loading webcam model from {settings.WEBCAM_MODEL_PATH}")
        self.model = keras.models.load_model(
            str(settings.WEBCAM_MODEL_PATH), compile=False
        )
        logger.info("Webcam model loaded successfully")

    def _load_scaler(self):
        with open(settings.WEBCAM_SCALER_PATH, "rb") as f:
            self.scaler = pickle.load(f)

    def _warmup_model(self):
        """First inference is slow due to graph compilation."""
        dummy_input = np.random.randn(1, 82, 20, 5).astype(np.float32)
        self.model.predict(dummy_input, verbose=0)

    def predict(self, sequences: np.ndarray) -> dict:
        """
        Run webcam prediction.
        Input shape: (1, 82, 20, 5) - batch, sequences, timesteps, features

        Returns:
            dict with keys: dyslexia_probability, risk_level
        """
        original_shape = sequences.shape
        n_features = original_shape[-1]

        sequences_2d = sequences.reshape(-1, n_features)
        scaled = self.scaler.transform(sequences_2d)
        scaled_sequences = scaled.reshape(original_shape)

        probability = float(self.model.predict(scaled_sequences, verbose=0)[0][0])

        return {
            "dyslexia_probability": probability,
            "risk_level": RiskLevel.from_probability(
                probability, settings.LOW_RISK_THRESHOLD, settings.HIGH_RISK_THRESHOLD
            ).value,
        }

    def is_loaded(self) -> bool:
        return self.model is not None and self.scaler is not None
