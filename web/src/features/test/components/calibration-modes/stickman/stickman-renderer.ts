/**
 * Stickman drawing primitives — canvas-only, no React dependency.
 *
 * Extracted from stickman-canvas.tsx to keep rendering logic
 * separate from game-loop state management.
 */

export type StickmanPose = 'idle' | 'sprint' | 'jump' | 'fall' | 'walk' | 'proud';

/**
 * Draw a stickman figure at the given position with the specified pose.
 * All coordinates are in canvas-local space (already scaled/translated).
 */
export function drawStickman(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  pose: StickmanPose,
  facingRight: boolean,
  isBoss: boolean,
): void {
  const scale = isBoss ? 0.9 : 0.4;

  ctx.save();
  ctx.translate(x, y);
  if (!facingRight) ctx.scale(-1, 1);
  ctx.scale(scale, scale);

  ctx.strokeStyle = isBoss ? '#dc2626' : '#0f172a';
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isBoss) {
    ctx.shadowColor = 'rgba(220, 38, 38, 0.8)';
    ctx.shadowBlur = 15;
  }

  const t = time * 0.05;
  let hipY = 0;
  let spineAngle = 0;
  const headY = -35;
  let arm1: number[] = [];
  let arm2: number[] = [];
  let leg1: number[] = [];
  let leg2: number[] = [];

  if (pose === 'sprint') {
    spineAngle = 0.6;
    hipY = Math.sin(t * 2) * 4;
    arm1 = [0, -25, 3.4, 3.5];
    arm2 = [0, -25, 3.7, 3.8];
    const legSwing = Math.cos(t * 1.5);
    leg1 = [0, hipY, Math.PI / 2 + legSwing * 1.2, Math.PI / 2 + legSwing * 1.2 + 0.5];
    leg2 = [0, hipY, Math.PI / 2 - legSwing * 1.2, Math.PI / 2 - legSwing * 1.2 + 0.5];
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

  // Spine
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(0, hipY - 30);
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.arc(0, hipY + headY, 12, 0, Math.PI * 2);
  if (isBoss) {
    ctx.fill();
  } else {
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.stroke();
  }

  // Limbs
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

  ctx.strokeStyle = isBoss ? '#dc2626' : '#0f172a';
  drawLimb(arm1);
  drawLimb(arm2);
  drawLimb(leg1);
  drawLimb(leg2);

  ctx.restore();
}

/**
 * Draw a single bone fragment (used during shatter animation).
 */
export function drawBone(
  ctx: CanvasRenderingContext2D,
  bone: { type: 'head' | 'spine' | 'limb'; x: number; y: number; angle: number; life: number },
  scale: number,
  isBoss: boolean,
): void {
  ctx.save();
  ctx.translate(bone.x, bone.y);
  ctx.rotate(bone.angle);
  ctx.globalAlpha = Math.max(0, bone.life / 1000);

  if (bone.type === 'head') {
    ctx.beginPath();
    ctx.arc(0, 0, 12 * scale, 0, Math.PI * 2);
    if (isBoss) {
      ctx.fill();
    } else {
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.stroke();
    }
  } else if (bone.type === 'spine') {
    ctx.beginPath();
    ctx.moveTo(0, -15 * scale);
    ctx.lineTo(0, 15 * scale);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-12 * scale, -12 * scale);
    ctx.lineTo(0, 0);
    ctx.lineTo(12 * scale, -6 * scale);
    ctx.stroke();
  }

  ctx.restore();
}
