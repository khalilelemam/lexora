import logging
import pickle
import json
import tempfile
import zipfile
from pathlib import Path

import keras
import numpy as np
import tensorflow as tf

from app.config import settings
from app.schemas import RiskLevel

logger = logging.getLogger(__name__)


def _remove_none_quantization_config(value):
    """Remove Keras 3.11+ no-op config keys unsupported by older runtimes."""
    if isinstance(value, dict):
        return {
            key: _remove_none_quantization_config(item)
            for key, item in value.items()
            if not (key == "quantization_config" and item is None)
        }
    if isinstance(value, list):
        return [_remove_none_quantization_config(item) for item in value]
    return value


@keras.saving.register_keras_serializable(package="Custom")
class MaskedGlobalAvgPoolV2(keras.layers.Layer):
    """Mask-aware average pooling layer used by the webcam UDA classifier."""

    def call(self, inputs, mask=None):
        x, mask_tensor = inputs
        mask_f = tf.cast(mask_tensor, x.dtype)
        mask_f = tf.expand_dims(mask_f, axis=-1)
        masked_sum = tf.reduce_sum(x * mask_f, axis=1)
        valid_count = tf.reduce_sum(mask_f, axis=1)
        return masked_sum / tf.maximum(valid_count, 1e-6)

    def compute_output_shape(self, input_shape):
        x_shape = input_shape[0]
        return (x_shape[0], x_shape[-1])

    def compute_mask(self, inputs, mask=None):
        return None


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
        custom_objects = {
            "MaskedGlobalAvgPoolV2": MaskedGlobalAvgPoolV2,
            "Custom>MaskedGlobalAvgPoolV2": MaskedGlobalAvgPoolV2,
        }
        try:
            self.model = keras.models.load_model(
                str(settings.WEBCAM_MODEL_PATH),
                compile=False,
                custom_objects=custom_objects,
            )
        except TypeError as e:
            if "quantization_config" not in str(e):
                raise
            logger.warning(
                "Webcam model contains newer Keras quantization_config keys; "
                "loading through a temporary compatibility copy."
            )
            self.model = self._load_model_without_quantization_config(custom_objects)
        logger.info("Webcam model loaded successfully")

    def _load_model_without_quantization_config(self, custom_objects: dict):
        with tempfile.NamedTemporaryFile(suffix=".keras", delete=False) as temp_file:
            temp_path = Path(temp_file.name)

        try:
            with zipfile.ZipFile(settings.WEBCAM_MODEL_PATH, "r") as source_zip:
                with zipfile.ZipFile(temp_path, "w") as target_zip:
                    for item in source_zip.infolist():
                        data = source_zip.read(item.filename)
                        if item.filename == "config.json":
                            config = json.loads(data.decode("utf-8"))
                            data = json.dumps(
                                _remove_none_quantization_config(config)
                            ).encode("utf-8")
                        target_zip.writestr(item, data)

            return keras.models.load_model(
                str(temp_path), compile=False, custom_objects=custom_objects
            )
        finally:
            temp_path.unlink(missing_ok=True)

    def _load_scaler(self):
        with open(settings.WEBCAM_SCALER_PATH, "rb") as f:
            self.scaler = pickle.load(f)

    def _warmup_model(self):
        """First inference is slow due to graph compilation."""
        dummy_input = np.random.randn(
            1,
            settings.WEBCAM_MAX_SEQUENCES,
            settings.WEBCAM_SEQUENCE_LENGTH,
            settings.WEBCAM_N_FEATURES,
        ).astype(np.float32)
        dummy_mask = np.ones((1, settings.WEBCAM_MAX_SEQUENCES), dtype=np.float32)
        self.model.predict([dummy_input, dummy_mask], verbose=0)

    def predict(self, sequences: np.ndarray, mask: np.ndarray) -> dict:
        """
        Run webcam prediction.
        Input shapes:
            sequences: (1, 40, 20, 6)
            mask: (1, 40)

        Returns:
            dict with keys: dyslexia_probability, risk_level
        """
        expected_sequences_shape = (
            1,
            settings.WEBCAM_MAX_SEQUENCES,
            settings.WEBCAM_SEQUENCE_LENGTH,
            settings.WEBCAM_N_FEATURES,
        )
        expected_mask_shape = (1, settings.WEBCAM_MAX_SEQUENCES)

        if sequences.shape != expected_sequences_shape:
            raise ValueError(
                f"Expected webcam sequences shape {expected_sequences_shape}, got {sequences.shape}"
            )
        if mask.shape != expected_mask_shape:
            raise ValueError(
                f"Expected webcam mask shape {expected_mask_shape}, got {mask.shape}"
            )

        original_shape = sequences.shape
        n_features = original_shape[-1]

        scaled_sequences = np.zeros(original_shape, dtype=np.float32)
        real_slots = mask.reshape(-1).astype(bool)
        if real_slots.any():
            real_sequences = sequences.reshape(-1, *original_shape[2:])[real_slots]
            scaled = self.scaler.transform(real_sequences.reshape(-1, n_features))
            scaled_sequences.reshape(-1, *original_shape[2:])[real_slots] = (
                scaled.reshape(real_sequences.shape)
            )

        probability = float(
            self.model.predict(
                [scaled_sequences, mask.astype(np.float32)], verbose=0
            )[0][0]
        )

        return {
            "dyslexia_probability": probability,
            "risk_level": RiskLevel.from_probability(
                probability, settings.LOW_RISK_THRESHOLD, settings.HIGH_RISK_THRESHOLD
            ).value,
        }

    def is_loaded(self) -> bool:
        return self.model is not None and self.scaler is not None
