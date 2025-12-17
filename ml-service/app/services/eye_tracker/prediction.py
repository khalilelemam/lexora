import logging
import warnings

import numpy as np

warnings.filterwarnings("ignore", category=UserWarning, module="keras")

import keras

from app.config import settings
from app.schemas import RiskLevel

logger = logging.getLogger(__name__)


class EyeTrackerPredictionService:
    """Three-task eye tracker prediction using dyslexia profile model."""

    def __init__(self):
        self.model = None
        self._load_model()
        self._warmup_model()

    def _load_model(self) -> None:
        logger.info(f"Loading model from {settings.EYE_TRACKER_MODEL_PATH}")
        self.model = keras.models.load_model(
            str(settings.EYE_TRACKER_MODEL_PATH), compile=False
        )
        logger.info("Model loaded successfully")

    def _warmup_model(self) -> None:
        dummy_input = {
            "input_syllables": np.random.randn(
                1,
                settings.EYE_TRACKER_MAX_SEQUENCES,
                settings.EYE_TRACKER_SEQUENCE_LENGTH,
                5,
            ).astype(np.float32),
            "input_meaningful": np.random.randn(
                1,
                settings.EYE_TRACKER_MAX_SEQUENCES,
                settings.EYE_TRACKER_SEQUENCE_LENGTH,
                5,
            ).astype(np.float32),
            "input_pseudo": np.random.randn(
                1,
                settings.EYE_TRACKER_MAX_SEQUENCES,
                settings.EYE_TRACKER_SEQUENCE_LENGTH,
                5,
            ).astype(np.float32),
        }
        self.model.predict(dummy_input, verbose=0)

    def predict(
        self,
        syllables_sequences: np.ndarray,
        meaningful_sequences: np.ndarray,
        pseudo_sequences: np.ndarray,
    ) -> dict:
        """
        Run three-task prediction.

        Returns:
            dict with keys: dyslexia_probability, confidence, risk_level, sequences_analyzed
        """
        for name, seq in [
            ("syllables", syllables_sequences),
            ("meaningful", meaningful_sequences),
            ("pseudo", pseudo_sequences),
        ]:
            if seq.shape != (
                settings.EYE_TRACKER_MAX_SEQUENCES,
                settings.EYE_TRACKER_SEQUENCE_LENGTH,
                5,
            ):
                raise ValueError(
                    f"{name} sequences have wrong shape. Expected "
                    f"({settings.EYE_TRACKER_MAX_SEQUENCES}, {settings.EYE_TRACKER_SEQUENCE_LENGTH}, 5), got {seq.shape}"
                )

        model_input = {
            "input_syllables": np.expand_dims(syllables_sequences, 0),
            "input_meaningful": np.expand_dims(meaningful_sequences, 0),
            "input_pseudo": np.expand_dims(pseudo_sequences, 0),
        }

        prediction = self.model.predict(model_input, verbose=0)
        probability = float(prediction[0][0])
        confidence = float(abs(probability - 0.5) * 2)

        return {
            "dyslexia_probability": probability,
            "confidence": confidence,
            "risk_level": RiskLevel.from_probability(
                probability, settings.LOW_RISK_THRESHOLD, settings.HIGH_RISK_THRESHOLD
            ).value,
            "sequences_analyzed": settings.EYE_TRACKER_MAX_SEQUENCES * 3,
        }

    def is_loaded(self) -> bool:
        return self.model is not None
