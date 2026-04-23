import numpy as np


class OneEuroFilter:
    """One Euro low-pass filter for a single signal dimension.

    The filter adapts its effective cutoff to motion speed:
    - Slow movement -> stronger smoothing (lower jitter)
    - Fast movement -> weaker smoothing (lower lag)

    This is useful for webcam gaze streams where per-frame noise is high,
    but we still need responsiveness during saccades.
    """

    def __init__(
        self, mincutoff: float = 1.0, beta: float = 0.007, dcutoff: float = 1.0
    ):
        self.mincutoff = mincutoff
        self.beta = beta
        self.dcutoff = dcutoff
        self.x_prev = None
        self.dx_prev = None
        self.t_prev = None

    def _smoothing_factor(self, elapsed_s: float, cutoff: float) -> float:
        """Compute exponential smoothing factor for a timestep and cutoff."""
        r = 2 * np.pi * cutoff * elapsed_s
        return r / (r + 1) if r > 0 else 0

    def filter(self, x: float, timestamp_ms: int) -> float:
        """Filter one sample.

        Args:
            x: Current signal value.
            timestamp_ms: Sample time in milliseconds.

        Returns:
            Smoothed signal value for the same timestamp.
        """
        if self.x_prev is None:
            self.x_prev = x
            self.dx_prev = 0.0
            self.t_prev = timestamp_ms
            return x

        elapsed_s = (timestamp_ms - self.t_prev) / 1000.0
        if elapsed_s <= 0:
            return self.x_prev

        dx = (x - self.x_prev) / elapsed_s
        alpha_d = self._smoothing_factor(elapsed_s, self.dcutoff)
        dx_filtered = alpha_d * dx + (1 - alpha_d) * self.dx_prev

        cutoff = self.mincutoff + self.beta * abs(dx_filtered)
        alpha = self._smoothing_factor(elapsed_s, cutoff)
        x_filtered = alpha * x + (1 - alpha) * self.x_prev

        self.x_prev = x_filtered
        self.dx_prev = dx_filtered
        self.t_prev = timestamp_ms
        return x_filtered
