/**
 * Geometry helpers shared by calibration training and runtime prediction.
 */

/**
 * Rotates iris coordinates to remove camera-space roll distortion.
 * Positive roll is clockwise; we rotate by -roll to normalize.
 */
export function applyRollCorrection(
  ix: number,
  iy: number,
  roll: number,
): { ix_rot: number; iy_rot: number } {
  const cx = ix - 0.5;
  const cy = iy - 0.5;
  const cosR = Math.cos(-roll);
  const sinR = Math.sin(-roll);

  return {
    ix_rot: cx * cosR - cy * sinR + 0.5,
    iy_rot: cx * sinR + cy * cosR + 0.5,
  };
}

/**
 * Compute inverse depth used by feature scaling.
 */
export function computeInvHeadZ(headZ: number): number {
  return Math.min(2.2, Math.max(0.5, 1.0 / (headZ + 0.01)));
}

if (process.env.NODE_ENV !== 'production') {
  const eps = 1e-2;
  console.assert(Math.abs(computeInvHeadZ(0.4) - 2.2) < eps, 'invHeadZ clamp at 0.40m failed');
  console.assert(Math.abs(computeInvHeadZ(0.65) - 1.52) < 0.05, 'invHeadZ at 0.65m mismatch');
  console.assert(Math.abs(computeInvHeadZ(1.2) - 0.82) < 0.05, 'invHeadZ at 1.20m mismatch');
}
