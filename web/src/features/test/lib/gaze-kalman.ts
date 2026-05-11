/**
 * Adaptive 2D Kalman filter for real-time gaze position smoothing.
 *
 * State vector: [x, y, vx, vy] — position + velocity.
 * Process noise Q adapts based on gaze speed:
 *   - During fixations (low speed): low Q → filter trusts its own prediction → smooth
 *   - During saccades (high speed): high Q → filter trusts raw measurement → responsive
 *
 * Must be reset at the start of each reading task.
 * Must NOT be used during calibration collection or validation.
 *
 * TUNING GUIDE:
 * R (measurement noise):    raise if dot is still jittery → more smoothing
 *                           lower if dot feels laggy during reading → less smoothing
 *                           typical range: 0.004–0.020
 *
 * Q_fixation (process noise): raise if fixations feel "sticky" or lag behind text
 *                             lower if jitter persists during still fixations
 *                             typical range: 0.0001–0.0005
 *
 * Q_saccade (process noise):  raise if saccades feel sluggish or trail behind
 *                             lower if saccade detection is too aggressive
 *                             typical range: 0.02–0.10
 *
 * SACCADE_THRESHOLD:          raise if filter incorrectly enters saccade mode
 *                             lower if saccades are not tracked fast enough
 *                             0.003 ≈ 3% screen width per millisecond
 */

export class GazeKalman {
    // ── Tuning constants ───────────────────────────────────────────────────
    // All values in normalized screen coordinates (0–1 range).

    /** Measurement noise: how much we distrust the raw prediction output.
     *  Higher = smoother but laggier. Start at 0.008; raise if still jittery. */
    private readonly R = 0.008;

    /** Process noise during fixation (slow movement). Low = heavy smoothing. */
    private readonly Q_fixation = 0.0002;

    /** Process noise during saccade (fast movement). High = trust raw signal. */
    private readonly Q_saccade = 0.05;

    /** Speed threshold (normalized units/ms) above which a saccade is declared.
     *  0.003 ≈ 3% of screen width per millisecond ≈ ~180px/s on 1920px screen. */
    private readonly SACCADE_THRESHOLD = 0.003;

    // ── State ──────────────────────────────────────────────────────────────
    private x = 0;
    private y = 0; // position
    private vx = 0;
    private vy = 0; // velocity (units per ms)

    /** Uncertainty in position estimate */
    private Px = 1;
    private Py = 1;

    private initialized = false;
    private lastTimestamp = 0;

    /**
     * Reset all state. Call at the start of every reading task.
     * Ensures no state bleeds from calibration or a previous task.
     */
    reset(): void {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.Px = 1;
        this.Py = 1;
        this.initialized = false;
        this.lastTimestamp = 0;
    }

    /**
     * Feed one raw prediction and get back a smoothed position.
     * @param rawX       Raw predicted gaze X from calibrationModel.predict() (0–1)
     * @param rawY       Raw predicted gaze Y from calibrationModel.predict() (0–1)
     * @param timestamp  performance.now() or Date.now() in milliseconds
     * @returns          Smoothed { x, y } in same coordinate space
     */
    update(rawX: number, rawY: number, timestamp: number): { x: number; y: number } {
        // First call — initialize state from first measurement, no smoothing
        if (!this.initialized) {
            this.x = rawX;
            this.y = rawY;
            this.lastTimestamp = timestamp;
            this.initialized = true;
            return { x: rawX, y: rawY };
        }

        const dt = Math.max(1, timestamp - this.lastTimestamp); // ms, floor at 1ms
        this.lastTimestamp = timestamp;

        // ── Saccade detection ──────────────────────────────────────────────────
        // Compute speed from raw measurement vs previous filtered position.
        // (We use the previous position rather than a full predict because the
        //  velocity estimate may be stale at the start of a saccade.)
        const speed = Math.hypot(rawX - this.x, rawY - this.y) / dt; // units/ms
        const isSaccade = speed > this.SACCADE_THRESHOLD;

        // Adaptive Q: use high process noise during saccades (trust the raw signal)
        // and low process noise during fixations (smooth aggressively).
        // This Q is used consistently in BOTH the predict and update steps.
        const Q = isSaccade ? this.Q_saccade : this.Q_fixation;

        // ── Predict step ──────────────────────────────────────────────────────
        const predX = this.x + this.vx * dt; // dt in ms, vx in units/ms
        const predY = this.y + this.vy * dt;

        // Propagate uncertainty using the ADAPTIVE Q.
        // Using the same Q here and in the update step is mathematically correct:
        // Q represents how much the true state can change between steps, which
        // depends on whether a saccade is happening — not on whether we've
        // already measured it.
        const PxPred = this.Px + Q;
        const PyPred = this.Py + Q;

        // ── Update step ────────────────────────────────────────────────────────
        // Kalman gain: K = (P_pred) / (P_pred + R)
        // Note: Q is NOT added again here — it was already baked into P_pred above.
        const Kx = PxPred / (PxPred + this.R);
        const Ky = PyPred / (PyPred + this.R);

        this.x = predX + Kx * (rawX - predX);
        this.y = predY + Ky * (rawY - predY);

        // Update velocity estimate (exponential decay to prevent runaway)
        const VELOCITY_DECAY = 0.7;
        this.vx = ((this.x - predX) / dt) * VELOCITY_DECAY;
        this.vy = ((this.y - predY) / dt) * VELOCITY_DECAY;

        // Update uncertainty: P = (1 - K) * P_pred
        // Q was already baked into PxPred/PyPred during the predict step above,
        // so it must NOT be added again here.
        this.Px = (1 - Kx) * PxPred;
        this.Py = (1 - Ky) * PyPred;

        return { x: this.x, y: this.y };
    }
}
