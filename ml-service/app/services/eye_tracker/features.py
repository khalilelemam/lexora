from dataclasses import dataclass, field
from typing import List

import numpy as np
import pickle
from sklearn.preprocessing import StandardScaler

from app.config import settings
from app.schemas import GazePoint


@dataclass
class TaskProcessingResult:
    sequences: np.ndarray
    total_gaze_points: int
    valid_fixations: int
    mean_fixation_duration_ms: float
    features_data: list[dict] = field(default_factory=list)


class EyeTrackerFeatureProcessor:
    def __init__(self):
        self.scaler: StandardScaler = self._load_scaler()

    def _load_scaler(self) -> StandardScaler:
        with open(settings.EYE_TRACKER_SCALER_PATH, "rb") as f:
            return pickle.load(f)

    def process_gaze_points(
        self, gaze_points: List[GazePoint], screen_width: int, screen_height: int
    ) -> TaskProcessingResult:
        """Convert raw gaze points to model-ready sequences of shape (100, 20, 5)."""
        if len(gaze_points) < settings.EYE_TRACKER_SEQUENCE_LENGTH:
            raise ValueError(
                f"Insufficient gaze points. Need at least {settings.EYE_TRACKER_SEQUENCE_LENGTH}, got {len(gaze_points)}"
            )

        screen_diagonal = np.sqrt(screen_width**2 + screen_height**2)

        x_coords = np.array([p.fixation_x for p in gaze_points])
        y_coords = np.array([p.fixation_y for p in gaze_points])
        timestamps = np.array([p.timestamp for p in gaze_points])

        # Convert microseconds to milliseconds
        durations_ms = np.diff(timestamps) / 1000.0
        median_duration = np.median(durations_ms) if len(durations_ms) > 0 else 200.0
        # First point has no previous, use median as placeholder
        durations_ms = np.concatenate([[median_duration], durations_ms])

        saccade_amplitudes = self._calculate_saccade_amplitudes(
            x_coords, y_coords, screen_width, screen_height
        )
        saccade_velocities = self._calculate_saccade_velocities(
            saccade_amplitudes, durations_ms
        )

        # Calculate normalized saccade amplitude (relative to screen diagonal)
        x_px = x_coords * screen_width
        y_px = y_coords * screen_height
        amp_px = np.concatenate([[0], np.sqrt(np.diff(x_px) ** 2 + np.diff(y_px) ** 2)])
        amp_norm = amp_px / screen_diagonal

        # Stack into 5-feature vectors: [duration, x, y, amplitude, velocity]
        features = np.column_stack(
            [
                durations_ms,
                x_coords,
                y_coords,
                amp_norm,
                saccade_velocities,
            ]
        )

        # Filter out physiologically implausible fixations
        valid_mask = (durations_ms >= settings.EYE_TRACKER_MIN_FIXATION_MS) & (
            durations_ms <= settings.EYE_TRACKER_MAX_FIXATION_MS
        )
        features_filtered = features[valid_mask]

        if len(features_filtered) < settings.EYE_TRACKER_SEQUENCE_LENGTH:
            raise ValueError(
                f"After filtering, only {len(features_filtered)} valid fixations remain. "
                f"Need at least {settings.EYE_TRACKER_SEQUENCE_LENGTH}."
            )

        valid_durations = durations_ms[valid_mask]
        valid_timestamps = timestamps[valid_mask]

        # Raw features before scaling (for storage and visualization)
        features_data = [
            {
                "timestamp": int(valid_timestamps[i] / 1000),
                "duration_ms": float(row[0]),
                "fixation_x": float(row[1]),
                "fixation_y": float(row[2]),
                "saccade_amplitude": float(row[3]),
                "saccade_velocity": float(row[4]),
            }
            for i, row in enumerate(features_filtered)
        ]

        features_scaled = self.scaler.transform(features_filtered)
        sequences = self._create_sequences(features_scaled)
        padded_sequences = self._pad_sequences(sequences)

        return TaskProcessingResult(
            sequences=padded_sequences,
            total_gaze_points=len(gaze_points),
            valid_fixations=int(valid_mask.sum()),
            mean_fixation_duration_ms=float(valid_durations.mean()),
            features_data=features_data,
        )

    def _calculate_saccade_amplitudes(
        self,
        x_coords: np.ndarray,
        y_coords: np.ndarray,
        screen_width: int,
        screen_height: int,
    ) -> np.ndarray:
        x_px = x_coords * screen_width
        y_px = y_coords * screen_height

        dx = np.diff(x_px)
        dy = np.diff(y_px)
        amplitudes = np.sqrt(dx**2 + dy**2)

        return np.concatenate([[0], amplitudes])

    def _calculate_saccade_velocities(
        self, amplitudes: np.ndarray, durations_ms: np.ndarray
    ) -> np.ndarray:
        velocities = np.zeros_like(amplitudes)
        non_zero = durations_ms > 0
        velocities[non_zero] = amplitudes[non_zero] / durations_ms[non_zero]
        return velocities

    def _create_sequences(self, features: np.ndarray) -> np.ndarray:
        sequences = []

        for i in range(
            0,
            len(features) - settings.EYE_TRACKER_SEQUENCE_LENGTH + 1,
            settings.EYE_TRACKER_SEQUENCE_STEP,
        ):
            sequence = features[i : i + settings.EYE_TRACKER_SEQUENCE_LENGTH]
            sequences.append(sequence)

        return np.array(sequences)

    def _pad_sequences(self, sequences: np.ndarray) -> np.ndarray:
        n_sequences = len(sequences)

        if n_sequences > settings.EYE_TRACKER_MAX_SEQUENCES:
            return sequences[: settings.EYE_TRACKER_MAX_SEQUENCES]

        padded = np.zeros(
            (
                settings.EYE_TRACKER_MAX_SEQUENCES,
                settings.EYE_TRACKER_SEQUENCE_LENGTH,
                5,
            ),
            dtype=np.float32,
        )
        padded[:n_sequences] = sequences

        return padded
