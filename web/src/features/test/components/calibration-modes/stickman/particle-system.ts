/**
 * Particle system types and factory functions for the stickman
 * calibration canvas. Pure logic — no React dependency.
 */

/* ── Types ───────────────────────────────────────────────── */

export interface Particle {
  type: 'spark' | 'dust' | 'slash';
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  angle?: number;
  length?: number;
  life: number;
  maxLife: number;
}

export interface Bone {
  type: 'head' | 'spine' | 'limb';
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angVel: number;
  life: number;
}

export interface SpeedLine {
  x: number;
  y: number;
  angle: number;
  length: number;
  life: number;
}

/* ── Factories ───────────────────────────────────────────── */

/** Create the full explosion particle burst when a stickman shatters. */
export function createExplosion(x: number, y: number): { particles: Particle[]; bones: Bone[] } {
  const burst = 30;
  const boneTypes: Array<'head' | 'spine' | 'limb'> = [
    'head', 'spine', 'limb', 'limb', 'limb', 'limb',
  ];

  const bones: Bone[] = boneTypes.map((type) => ({
    type,
    x,
    y,
    vx: (Math.random() - 0.5) * burst,
    vy: -Math.random() * burst - 8,
    angle: 0,
    angVel: (Math.random() - 0.5) * 1.5,
    life: 2500,
  }));

  const particles: Particle[] = [];

  // Radial slash burst
  for (let i = 0; i < 30; i++) {
    particles.push({
      type: 'slash',
      x, y,
      angle: Math.random() * Math.PI * 2,
      length: Math.random() * 120 + 50,
      life: 450,
      maxLife: 450,
    });
  }

  // Spark shower
  for (let i = 0; i < 25; i++) {
    particles.push({
      type: 'spark',
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20 - 5,
      life: 600,
      maxLife: 600,
    });
  }

  // Dust cloud
  for (let i = 0; i < 15; i++) {
    particles.push({
      type: 'dust',
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      life: 800,
      maxLife: 800,
    });
  }

  return { particles, bones };
}

/** Create hit spark particles (visual gaze feedback during movement). */
export function createHitSparks(x: number, y: number, count = 2): Particle[] {
  return Array.from({ length: count }, () => ({
    type: 'spark' as const,
    x: x + (Math.random() - 0.5) * 30,
    y: y + (Math.random() - 0.5) * 30,
    vx: (Math.random() - 0.5) * 15,
    vy: (Math.random() - 0.5) * 15,
    life: 200,
    maxLife: 200,
  }));
}

/** Create obstacle destruction particles. */
export function createObstacleDebris(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 15; i++) {
    particles.push({
      type: 'slash',
      x, y: y - 10,
      angle: Math.random() * Math.PI * 2,
      length: Math.random() * 40 + 10,
      life: 200,
      maxLife: 200,
    });
    particles.push({
      type: 'dust',
      x, y,
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.5) * 15,
      life: 200,
      maxLife: 200,
    });
  }
  return particles;
}

/** Create landing dust particles. */
export function createLandingDust(x: number, y: number, count = 8): Particle[] {
  return Array.from({ length: count }, () => ({
    type: 'dust' as const,
    x,
    y: y + 20,
    vx: (Math.random() - 0.5) * 15,
    vy: -Math.random() * 5,
    life: 300,
    maxLife: 300,
  }));
}

/* ── Drawing ─────────────────────────────────────────────── */

/** Render all particles onto the canvas and remove expired ones in-place. */
export function drawAndUpdateParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  deltaMs: number,
): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= deltaMs;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);

    if (p.type === 'spark') {
      p.x += p.vx || 0;
      p.y += p.vy || 0;
      ctx.fillStyle = '#eab308';
      ctx.fillRect(p.x, p.y, 4, 4);
    } else if (p.type === 'dust') {
      p.x += p.vx || 0;
      p.y += p.vy || 0;
      if (p.vx) p.vx *= 0.9;
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0, p.life / 60), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'slash') {
      const prog = 1 - p.life / p.maxLife;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(
        p.x + Math.cos(p.angle || 0) * (p.length || 0) * prog,
        p.y + Math.sin(p.angle || 0) * (p.length || 0) * prog,
      );
      ctx.lineTo(
        p.x + Math.cos(p.angle || 0) * (p.length || 0),
        p.y + Math.sin(p.angle || 0) * (p.length || 0),
      );
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

/** Update bones with gravity physics and remove expired ones. */
export function updateBones(bones: Bone[], deltaMs: number): void {
  for (let i = bones.length - 1; i >= 0; i--) {
    const b = bones[i];
    b.x += b.vx;
    b.y += b.vy;
    b.vy += 0.8; // Gravity
    b.angle += b.angVel;
    b.life -= deltaMs;
    if (b.life <= 0) bones.splice(i, 1);
  }
}

/** Update speed lines and remove expired ones. */
export function drawAndUpdateSpeedLines(
  ctx: CanvasRenderingContext2D,
  speedLines: SpeedLine[],
  deltaMs: number,
): void {
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  for (let i = speedLines.length - 1; i >= 0; i--) {
    const sl = speedLines[i];
    sl.life -= deltaMs;
    ctx.globalAlpha = Math.max(0, sl.life / 100);
    ctx.beginPath();
    ctx.moveTo(sl.x, sl.y);
    ctx.lineTo(sl.x - Math.cos(sl.angle) * sl.length, sl.y - Math.sin(sl.angle) * sl.length);
    ctx.stroke();
    if (sl.life <= 0) speedLines.splice(i, 1);
  }
  ctx.globalAlpha = 1;
}
