import logging
from typing import Tuple
import warnings

import numpy as np

warnings.filterwarnings("ignore", category=UserWarning, module="keras")

import keras

from app.config import settings

logger = logging.getLogger(__name__)


class ModelService:
    def __init__(self):
        self.model = None

        if settings.SKIP_MODEL_LOADING:
            logger.warning("SKIP_MODEL_LOADING=True, using mock predictions")
        else:
            self._load_model()
            self._warmup_model()

    def _load_model(self) -> None:
        logger.info(f"Loading model from {settings.CLASSIFIER_MODEL_PATH}")
        self.model = keras.models.load_model(
            str(settings.CLASSIFIER_MODEL_PATH), compile=False
        )
        logger.info("Model loaded successfully")

    def _warmup_model(self) -> None:
        # First inference is slow due to graph compilation, so we warm up with dummy data
        dummy_input = {
            "input_syllables": np.random.randn(
                1, settings.MAX_SEQUENCES, settings.SEQUENCE_LENGTH, 5
            ).astype(np.float32),
            "input_meaningful": np.random.randn(
                1, settings.MAX_SEQUENCES, settings.SEQUENCE_LENGTH, 5
            ).astype(np.float32),
            "input_pseudo": np.random.randn(
                1, settings.MAX_SEQUENCES, settings.SEQUENCE_LENGTH, 5
            ).astype(np.float32),
        }
        self.model.predict(dummy_input, verbose=0)

    def predict(
        self,
        syllables_sequences: np.ndarray,
        meaningful_sequences: np.ndarray,
        pseudo_sequences: np.ndarray,
    ) -> Tuple[float, float, int]:
        if settings.SKIP_MODEL_LOADING:
            total_sequences = (
                len(syllables_sequences)
                + len(meaningful_sequences)
                + len(pseudo_sequences)
            )
            return 0.5, 0.75, total_sequences

        for name, seq in [
            ("syllables", syllables_sequences),
            ("meaningful", meaningful_sequences),
            ("pseudo", pseudo_sequences),
        ]:
            if seq.shape != (settings.MAX_SEQUENCES, settings.SEQUENCE_LENGTH, 5):
                raise ValueError(
                    f"{name} sequences have wrong shape. Expected "
                    f"({settings.MAX_SEQUENCES}, {settings.SEQUENCE_LENGTH}, 5), got {seq.shape}"
                )

        model_input = {
            "input_syllables": np.expand_dims(syllables_sequences, 0),
            "input_meaningful": np.expand_dims(meaningful_sequences, 0),
            "input_pseudo": np.expand_dims(pseudo_sequences, 0),
        }

        prediction = self.model.predict(model_input, verbose=0)
        probability = float(prediction[0][0])
        confidence = float(abs(probability - 0.5) * 2)

        return probability, confidence, settings.MAX_SEQUENCES * 3

    def get_risk_level(self, probability: float) -> str:
        if probability < settings.LOW_RISK_THRESHOLD:
            return "low"
        elif probability < settings.HIGH_RISK_THRESHOLD:
            return "medium"
        else:
            return "high"

    def is_loaded(self) -> bool:
        if settings.SKIP_MODEL_LOADING:
            return True
        return self.model is not None


# Singleton instance (loaded once at startup)
_model_service_instance = None


def get_model_service() -> ModelService:
    global _model_service_instance

    if _model_service_instance is None:
        _model_service_instance = ModelService()

    return _model_service_instance
