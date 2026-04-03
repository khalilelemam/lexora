/**
 * Debug configuration for gaze tracking diagnostics.
 *
 * When DEBUG_GAZE_OVERLAY is true:
 * - Red gaze dot overlay is shown on the reading screen
 * - Detailed diagnostic logs are printed to the console
 * - Post-calibration validation sequence runs automatically
 *
 * When false:
 * - Overlay is hidden
 * - Debug logs are suppressed
 * - Validation sequence is skipped
 */
export const DEBUG_GAZE_OVERLAY = true;
