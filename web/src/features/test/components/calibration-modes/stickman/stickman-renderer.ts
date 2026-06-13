/**
 * Stickman (Ninja) drawing primitives — canvas-only, no React dependency.
 *
 * Visual design:
 * - Charcoal body (#1e293b) on warm cream (#FDF8F0)
 * - Ninja headband (red bandana trailing behind)
 * - Mask line across face
 * - Slightly thicker limbs for better visibility at small scale
 * - 7 poses: idle, sprint, walk, skid, jump, fall, proud
 *
 * The `skid` pose is used when the ninja brakes after a dash —
 * leaning back with one leg forward (from sticky.jsx reference).
 */

export type StickmanPose = 'idle' | 'sprint' | 'jump' | 'fall' | 'walk' | 'proud' | 'skid';

/**
 * Draw a ninja stickman figure at the given position with the specified pose.
 * All coordinates are in canvas-local space (already scaled/translated).
 */
export function drawStickman(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  pose: StickmanPose,
  facingRight: boolean,
): void {
  const scale = 0.5;

  ctx.save();
  ctx.translate(x, y);
  if (!facingRight) ctx.scale(-1, 1);
  ctx.scale(scale, scale);

  const bodyColor = '#1e293b';
  ctx.strokeStyle = bodyColor;
  ctx.fillStyle = bodyColor;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const t = time * 0.05;
  let hipY = 0;
  let spineAngle = 0;
  const headOffsetY = -35;
  let arm1: number[] = [];
  let arm2: number[] = [];
  let leg1: number[] = [];
  let leg2: number[] = [];

  // ─── Pose definitions ───────────────────────────────────
  if (pose === 'sprint') {
    spineAngle = 0.55;
    hipY = Math.sin(t * 2) * 4;
    arm1 = [0, -25, 3.4, 3.5];
    arm2 = [0, -25, 3.7, 3.8];
    const legSwing = Math.cos(t * 1.5);
    leg1 = [0, hipY, Math.PI / 2 + legSwing * 1.2, Math.PI / 2 + legSwing * 1.2 + 0.5];
    leg2 = [0, hipY, Math.PI / 2 - legSwing * 1.2, Math.PI / 2 - legSwing * 1.2 + 0.5];
  } else if (pose === 'skid') {
    // Braking pose — leaning back, one leg forward, arms out for balance
    spineAngle = -0.3;
    hipY = 5;
    arm1 = [0, -25, 3.5, 3.0];
    arm2 = [0, -25, -0.5, 0.0];
    leg1 = [0, hipY, 2.0, 1.5];
    leg2 = [0, hipY, 0.5, 0.5];
  } else if (pose === 'jump') {
    spineAngle = 0.4;
    hipY = -15;
    arm1 = [0, -25, 3.0, 3.2];
    arm2 = [0, -25, 3.4, 3.6];
    leg1 = [0, hipY, 2.8, 3.2];
    leg2 = [0, hipY, 2.2, 2.6];
  } else if (pose === 'fall') {
    spineAngle = -0.1;
    hipY = -5;
    const flail = Math.sin(t);
    arm1 = [0, -25, -0.5 + flail * 0.5, -1.0];
    arm2 = [0, -25, 3.5 - flail * 0.5, 4.0];
    leg1 = [0, hipY, 2.0, 1.5];
    leg2 = [0, hipY, 1.0, 1.5];
  } else if (pose === 'walk') {
    spineAngle = 0.05;
    hipY = Math.sin(t * 0.5) * 3;
    const swing = Math.sin(t * 0.4);
    arm1 = [0, -25, Math.PI / 2 + swing * 0.5, Math.PI / 2 + swing * 0.5];
    arm2 = [0, -25, Math.PI / 2 - swing * 0.5, Math.PI / 2 - swing * 0.5];
    leg1 = [0, hipY, Math.PI / 2 + swing * 0.6, Math.PI / 2 + swing * 0.6 + 0.2];
    leg2 = [0, hipY, Math.PI / 2 - swing * 0.6, Math.PI / 2 - swing * 0.6 + 0.2];
  } else if (pose === 'idle') {
    spineAngle = 0;
    hipY = Math.sin(time * 0.005) * 2;
    arm1 = [0, -25, 1.4, 1.5];
    arm2 = [0, -25, 1.7, 1.6];
    leg1 = [0, hipY, 1.5, 1.5];
    leg2 = [0, hipY, 1.6, 1.5];
  } else if (pose === 'proud') {
    spineAngle = 0;
    hipY = 0;
    arm1 = [0, -25, 0.5, 2.5];
    arm2 = [0, -25, 2.6, 0.6];
    leg1 = [0, hipY, 1.2, 1.5];
    leg2 = [0, hipY, 1.9, 1.5];
  }

  ctx.rotate(spineAngle);

  // ─── Spine ──────────────────────────────────────────────
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(0, hipY - 30);
  ctx.stroke();

  // ─── Head (white fill + dark stroke) ────────────────────
  const headCenterY = hipY + headOffsetY;
  ctx.beginPath();
  ctx.arc(0, headCenterY, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = bodyColor;
  ctx.stroke();

  // ─── Ninja mask line (horizontal stripe across eyes) ────
  ctx.save();
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-13, headCenterY + 1);
  ctx.lineTo(13, headCenterY + 1);
  ctx.stroke();
  // Small eye dots
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-5, headCenterY, 1.5, 0, Math.PI * 2);
  ctx.arc(5, headCenterY, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ─── Headband tails (red bandana trailing behind) ───────
  ctx.save();
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  // Two trailing ribbons flowing backward
  const windPhase = time * 0.008;
  const ribbonBaseX = -10; // Back of head
  const ribbonBaseY = headCenterY - 3;

  // Ribbon 1
  ctx.beginPath();
  ctx.moveTo(ribbonBaseX, ribbonBaseY);
  ctx.quadraticCurveTo(
    ribbonBaseX - 12 + Math.sin(windPhase) * 4,
    ribbonBaseY + 4 + Math.cos(windPhase * 1.3) * 3,
    ribbonBaseX - 22 + Math.sin(windPhase * 0.8) * 6,
    ribbonBaseY + 2 + Math.sin(windPhase * 1.5) * 5,
  );
  ctx.stroke();

  // Ribbon 2 (slightly offset)
  ctx.beginPath();
  ctx.moveTo(ribbonBaseX, ribbonBaseY + 3);
  ctx.quadraticCurveTo(
    ribbonBaseX - 10 + Math.cos(windPhase * 1.2) * 3,
    ribbonBaseY + 8 + Math.sin(windPhase * 0.9) * 4,
    ribbonBaseX - 18 + Math.cos(windPhase * 0.7) * 5,
    ribbonBaseY + 10 + Math.cos(windPhase * 1.1) * 4,
  );
  ctx.stroke();
  ctx.restore();

  // ─── Limbs ──────────────────────────────────────────────
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 7;
  const drawLimb = (arr: number[]) => {
    if (!arr.length) return;
    const [sx, sy, a1, a2] = arr;
    const len = 16;
    const mx = sx + Math.cos(a1) * len;
    const my = sy + Math.sin(a1) * len;
    const ex = mx + Math.cos(a2) * len;
    const ey = my + Math.sin(a2) * len;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(mx, my);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  };

  drawLimb(arm1);
  drawLimb(arm2);
  drawLimb(leg1);
  drawLimb(leg2);

  ctx.restore();
}
