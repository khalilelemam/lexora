/**
 * Number of features produced by the polynomial ridge feature builders.
 *
 * Current feature set (from original ix/iy/pitch block):
 *   1, ix, iy, pitch, ix^2, iy^2, ix*iy, ix^3, iy^3, ix^2*iy, ix*iy^2 = 11
 *
 * Added head-pose features that have non-zero variance during head-still calibration:
 *   yaw, yaw*ix, pitch*iy = 3
 *
 * X total: 14 features.
 * Y total: 12 features, excluding horizontal-only yaw features.
 */
export const NUM_FEATURES_X = 14;
export const NUM_FEATURES_Y = 12;

function assertFeatureCount(label: string, actual: number, expected: number) {
  if (actual !== expected) {
    throw new Error(`${label} must output ${expected} features, got ${actual}`);
  }
}

/**
 * Feature builder for the X-axis (horizontal) polynomial ridge model.
 *
 * 14 features total:
 *   [0]    1.0            (bias / intercept)
 *   [1]    ix             raw horizontal iris position
 *   [2]    iy             raw vertical iris position
 *   [3]    pitch          head pitch
 *   [4]    ix^2           quadratic iris X
 *   [5]    iy^2           quadratic iris Y
 *   [6]    ix*iy          iris cross-term
 *   [7]    ix^3           cubic iris X
 *   [8]    iy^3           cubic iris Y
 *   [9]    ix^2*iy        iris X^2Y cross
 *   [10]   ix*iy^2        iris XY^2 cross
 *   [11]   yaw            head yaw horizontal correction
 *   [12]   yaw * ix       head turn x horizontal iris gain
 *   [13]   pitch * iy     head nod x vertical iris minor X cross-term
 */
export function expandFeaturesX(ix: number, iy: number, yaw: number, pitch: number): number[] {
  const features = [
    1.0,
    ix,
    iy,
    pitch,
    ix * ix,
    iy * iy,
    ix * iy,
    ix * ix * ix,
    iy * iy * iy,
    ix * ix * iy,
    ix * iy * iy,
    yaw,
    yaw * ix,
    pitch * iy,
  ];

  assertFeatureCount('expandFeaturesX()', features.length, NUM_FEATURES_X);
  return features;
}

/**
 * Feature builder for the Y-axis (vertical) polynomial ridge model.
 *
 * 12 features total. Horizontal-only head features (yaw, yaw*ix) are
 * intentionally excluded to avoid spurious vertical predictions from
 * horizontal head turns.
 */
export function expandFeaturesY(ix: number, iy: number, pitch: number): number[] {
  const features = [
    1.0,
    ix,
    iy,
    pitch,
    ix * ix,
    iy * iy,
    ix * iy,
    ix * ix * ix,
    iy * iy * iy,
    ix * ix * iy,
    ix * iy * iy,
    pitch * iy,
  ];

  assertFeatureCount('expandFeaturesY()', features.length, NUM_FEATURES_Y);
  return features;
}
