'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { CalibrationModeViewProps } from '../types';
import { getCalibrationAudio } from '../../../lib/calibration-audio';

/**
 * Star Canvas - Gentle magical star collector mode for younger children
 *
 * Key mechanics:
 * - Phase 1 (floating): Star floats gently toward target position
 * - Phase 2 (collecting): Star hovers, gaze fills progress ring over 1.5s
 * - Phase 3 (collected): Star shrinks and flies to treasure chest
 */

export interface StarCanvasProps extends CalibrationModeViewProps {
  gazeX: number;
  gazeY: number;
  onSampleCollected?: () => void;
}

type GamePhase = 'floating' | 'collecting' | 'collected' | 'waiting';

interface FloatingOrb {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
  hue: number;
  opacity: number;
}

interface FlyingStar {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  scale: number;
}

// Scan duration in milliseconds (time to fill the ring)
const SCAN_DURATION_MS = 2000;
// Float duration in milliseconds
const FLOAT_DURATION_MS = 1200;
// Collect animation duration
const COLLECT_ANIMATION_MS = 800;

function generateFloatingOrbs(count: number, width: number, height: number): FloatingOrb[] {
  const orbs: FloatingOrb[] = [];
  for (let i = 0; i < count; i++) {
    orbs.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 3 + Math.random() * 6,
      speed: 0.2 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      hue: 280 + Math.random() * 80, // Purple to pink range
      opacity: 0.2 + Math.random() * 0.4,
    });
  }
  return orbs;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function StarCanvas({
  currentPoint,
  collectionStep,
  collectionTotal,
  isBossPoint,
  isStableFixation,
  gazeX,
  gazeY,
  onSampleCollected,
}: StarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const gazeRef = useRef({ x: gazeX, y: gazeY });
  const lastRenderTimeRef = useRef(0);
  const pointKeyRef = useRef(`${currentPoint.x}-${currentPoint.y}-${collectionStep}`);
  const renderRef = useRef<((time: number) => void) | null>(null);

  // Game state refs
  const gameRef = useRef<{
    phase: GamePhase;
    starX: number;
    starY: number;
    targetX: number;
    targetY: number;
    floatStartTime: number;
    floatStartX: number;
    floatStartY: number;
    scanProgress: number;
    glowIntensity: number;
    collectScale: number;
    phaseStartTime: number;
    sampleCollectedForThisPoint: boolean;
    width: number;
    height: number;
    dpr: number;
    orbs: FloatingOrb[];
    flyingStars: FlyingStar[];
    chestFillPercent: number;
  } | null>(null);

  useEffect(() => {
    gazeRef.current = { x: gazeX, y: gazeY };
  }, [gazeX, gazeY]);

  const audio = useMemo(() => getCalibrationAudio(), []);

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const targetX = currentPoint.x * width;
    const targetY = currentPoint.y * height;

    // Random spawn position
    const startX = Math.random() * width;
    const startY = -80;

    // Preserve orbs if they exist, otherwise generate new ones
    const existingOrbs = gameRef.current?.orbs || [];
    const orbs = existingOrbs.length > 0 ? existingOrbs : generateFloatingOrbs(15, width, height);

    // Preserve flying stars
    const flyingStars = gameRef.current?.flyingStars || [];

    // Preserve chest fill
    const prevFill = gameRef.current?.chestFillPercent || 0;

    gameRef.current = {
      phase: 'floating',
      starX: startX,
      starY: startY,
      targetX,
      targetY,
      floatStartTime: 0,
      floatStartX: startX,
      floatStartY: startY,
      scanProgress: 0,
      glowIntensity: 0.3,
      collectScale: 1,
      phaseStartTime: performance.now(),
      sampleCollectedForThisPoint: false,
      width,
      height,
      dpr,
      orbs,
      flyingStars,
      chestFillPercent: Math.max(prevFill, ((collectionStep - 1) / collectionTotal) * 100),
    };

    audio.play('magicSparkle');
  }, [currentPoint, collectionStep, collectionTotal, audio]);

  // Draw magical pastel background
  const drawBackground = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
      // Base gradient (soft pastel sky)
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#fdf4ff'); // Soft pink/white
      gradient.addColorStop(0.5, '#fce7f3'); // Soft pink
      gradient.addColorStop(1, '#f5d0fe'); // Soft purple
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Subtle sparkle overlay
      const shimmer = 0.02 + Math.sin(time * 0.001) * 0.01;
      ctx.fillStyle = `rgba(255, 255, 255, ${shimmer})`;
      ctx.fillRect(0, 0, width, height);
    },
    [],
  );

  // Draw floating orbs
  const drawOrbs = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      orbs: FloatingOrb[],
      time: number,
      width: number,
      height: number,
    ) => {
      for (const orb of orbs) {
        // Update position
        orb.y -= orb.speed;
        orb.x += Math.sin(time * 0.002 + orb.phase) * 0.3;

        // Wrap around
        if (orb.y < -orb.size) {
          orb.y = height + orb.size;
          orb.x = Math.random() * width;
        }

        // Draw orb
        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.size);
        gradient.addColorStop(0, `hsla(${orb.hue}, 80%, 80%, ${orb.opacity})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [],
  );

  // Draw star
  const drawStar = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      scale: number,
      rotation: number,
      glowIntensity: number,
      isBoss: boolean,
      time: number,
    ) => {
      const baseSize = isBoss ? 50 : 30;
      const size = baseSize * scale;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      // Outer glow
      const glowSize = size * 2;
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
      const glowColor = isBoss ? '253, 224, 71' : '244, 114, 182'; // Yellow for boss, pink for regular
      glow.addColorStop(0, `rgba(${glowColor}, ${glowIntensity * 0.6})`);
      glow.addColorStop(0.5, `rgba(${glowColor}, ${glowIntensity * 0.2})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Star shape
      const points = isBoss ? 6 : 5;
      const innerRadius = size * 0.4;
      const outerRadius = size;

      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        if (i === 0) {
          ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        } else {
          ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
      }
      ctx.closePath();

      // Fill with gradient
      const starGradient = ctx.createRadialGradient(0, -size / 3, 0, 0, 0, size);
      if (isBoss) {
        starGradient.addColorStop(0, '#fef08a');
        starGradient.addColorStop(0.5, '#facc15');
        starGradient.addColorStop(1, '#eab308');
      } else {
        starGradient.addColorStop(0, '#fdf4ff');
        starGradient.addColorStop(0.5, '#f9a8d4');
        starGradient.addColorStop(1, '#ec4899');
      }
      ctx.fillStyle = starGradient;
      ctx.fill();

      // Sparkle effect on edges
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(time * 0.01) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    },
    [],
  );

  // Draw treasure chest
  const drawChest = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, fillPercent: number, time: number) => {
      ctx.save();
      ctx.translate(x, y);

      // Chest body
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-40, -20, 80, 50);

      // Chest lid
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, -20, 40, Math.PI, 0, false);
      ctx.fill();

      // Metal bands
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-42, -10, 84, 6);
      ctx.fillRect(-42, 10, 84, 6);

      // Lock
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();

      // Fill glow based on progress
      if (fillPercent > 0) {
        const glowRadius = 30 + fillPercent / 2;
        const fillGlow = ctx.createRadialGradient(0, -10, 0, 0, -10, glowRadius);
        fillGlow.addColorStop(0, `rgba(253, 224, 71, ${0.3 + fillPercent / 200})`);
        fillGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = fillGlow;
        ctx.beginPath();
        ctx.arc(0, -10, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sparkles around chest
      const sparkleCount = Math.floor(fillPercent / 20);
      for (let i = 0; i < sparkleCount; i++) {
        const angle = (i / sparkleCount) * Math.PI * 2 + time * 0.002;
        const distance = 50 + Math.sin(time * 0.005 + i) * 10;
        const sx = Math.cos(angle) * distance;
        const sy = Math.sin(angle) * distance * 0.5 - 10;

        ctx.fillStyle = `rgba(253, 224, 71, ${0.5 + Math.sin(time * 0.01 + i) * 0.3})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },
    [],
  );

  // Draw progress ring
  const drawProgressRing = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, progress: number) => {
      // Background ring
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Progress arc
      if (progress > 0) {
        ctx.beginPath();
        ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.strokeStyle = '#10b981'; // Emerald green
        ctx.lineCap = 'round';
        ctx.lineWidth = 6;
        ctx.stroke();
      }
    },
    [],
  );

  const render = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      const game = gameRef.current;
      if (!canvas || !game) {
        animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
        return;
      }

      const deltaMs = lastRenderTimeRef.current ? time - lastRenderTimeRef.current : 16;
      lastRenderTimeRef.current = time;

      const { width, height, dpr } = game;
      const gaze = gazeRef.current;
      const hitRadius = isBossPoint ? 50 : 30;

      // Clear and reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Draw background
      drawBackground(ctx, width, height, time);

      // Draw floating orbs
      drawOrbs(ctx, game.orbs, time, width, height);

      // Calculate bob offset for star
      const bobOffset = Math.sin(time * 0.003) * 8;
      const rotation =
        time * 0.0005 + (game.phase === 'collecting' ? Math.sin(time * 0.005) * 0.1 : 0);

      // === PHASE: FLOATING ===
      if (game.phase === 'floating') {
        if (game.floatStartTime === 0) {
          game.floatStartTime = time;
        }

        const elapsed = time - game.floatStartTime;
        const progress = Math.min(1, elapsed / FLOAT_DURATION_MS);
        const eased = easeOutCubic(progress);

        game.starX = game.floatStartX + (game.targetX - game.floatStartX) * eased;
        game.starY = game.floatStartY + (game.targetY - game.floatStartY) * eased;

        // Add horizontal drift
        game.starX += Math.sin(time * 0.003) * 20 * (1 - progress);

        if (progress >= 1) {
          game.phase = 'collecting';
          game.starX = game.targetX;
          game.starY = game.targetY;
          game.phaseStartTime = time;
        }
      }

      // === PHASE: COLLECTING ===
      if (game.phase === 'collecting') {
        game.starX = game.targetX;
        game.starY = game.targetY + bobOffset;

        const mouseDist = Math.hypot(game.starX - gaze.x, game.starY - gaze.y);
        const isGazeOnTarget = isStableFixation || mouseDist < hitRadius * 1.3;

        if (isGazeOnTarget) {
          game.scanProgress += deltaMs / SCAN_DURATION_MS;
          game.glowIntensity = 0.5 + game.scanProgress * 0.5;

          // Play tick sound at intervals
          const tickStep = Math.floor(game.scanProgress * 10);
          const prevTickStep = Math.floor((game.scanProgress - deltaMs / SCAN_DURATION_MS) * 10);
          if (tickStep !== prevTickStep && game.scanProgress < 1) {
            audio.play('scanTick', { progress: game.scanProgress });
          }

          if (game.scanProgress >= 1 && !game.sampleCollectedForThisPoint) {
            game.phase = 'collected';
            game.phaseStartTime = time;
            game.sampleCollectedForThisPoint = true;

            audio.play('collect');

            // Add flying star to chest
            const chestX = width / 2;
            const chestY = height - 60;
            game.flyingStars.push({
              x: game.starX,
              y: game.starY,
              targetX: chestX,
              targetY: chestY,
              progress: 0,
              scale: 1,
            });

            game.chestFillPercent = (collectionStep / collectionTotal) * 100;

            onSampleCollected?.();
          }
        } else {
          // Reset progress if gaze leaves (gentle fade)
          game.scanProgress = Math.max(0, game.scanProgress - deltaMs / 700);
          game.glowIntensity = 0.3 + Math.sin(time * 0.003) * 0.1;
        }
      }

      // === PHASE: COLLECTED ===
      if (game.phase === 'collected') {
        const elapsed = time - game.phaseStartTime;
        const progress = Math.min(1, elapsed / COLLECT_ANIMATION_MS);

        game.collectScale = 1 - progress;
        game.glowIntensity = 1 - progress;

        if (progress >= 1) {
          game.phase = 'waiting';
        }
      }

      // Update flying stars
      for (let i = game.flyingStars.length - 1; i >= 0; i--) {
        const star = game.flyingStars[i];
        star.progress += deltaMs / 500;

        if (star.progress >= 1) {
          game.flyingStars.splice(i, 1);
          audio.play('chestOpen');
          continue;
        }

        const eased = easeOutCubic(star.progress);
        const arcHeight = 100;
        const arcOffset = Math.sin(star.progress * Math.PI) * arcHeight;

        const flyX = star.x + (star.targetX - star.x) * eased;
        const flyY = star.y + (star.targetY - star.y) * eased - arcOffset;
        star.scale = 1 - star.progress * 0.5;

        // Draw flying star
        drawStar(ctx, flyX, flyY, star.scale * 0.5, time * 0.01, 0.8, false, time);
      }

      // Draw main star (unless waiting)
      if (game.phase !== 'waiting') {
        drawStar(
          ctx,
          game.starX,
          game.starY,
          game.collectScale,
          rotation,
          game.glowIntensity,
          isBossPoint,
          time,
        );

        // Progress ring during collecting
        if (game.phase === 'collecting') {
          drawProgressRing(ctx, game.starX, game.starY, hitRadius + 15, game.scanProgress);

          // "Look here" hint
          ctx.font = 'bold 14px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(236, 72, 153, 0.8)';
          ctx.globalAlpha = 0.6 + Math.sin(time * 0.005) * 0.4;
          ctx.fillText('✨ Look here! ✨', game.starX, game.starY + hitRadius + 35);
          ctx.globalAlpha = 1;
        }
      }

      // Draw treasure chest
      drawChest(ctx, width / 2, height - 60, game.chestFillPercent, time);

      animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
    },
    [
      isBossPoint,
      isStableFixation,
      collectionStep,
      collectionTotal,
      audio,
      drawBackground,
      drawOrbs,
      drawStar,
      drawChest,
      drawProgressRing,
      onSampleCollected,
    ],
  );

  // Keep render ref up to date
  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  // Handle point change
  useEffect(() => {
    const newKey = `${currentPoint.x}-${currentPoint.y}-${collectionStep}`;
    if (newKey !== pointKeyRef.current) {
      pointKeyRef.current = newKey;
      initGame();
    }
  }, [currentPoint, collectionStep, initGame]);

  // Setup canvas and animation
  useEffect(() => {
    initGame();

    const handleResize = () => {
      initGame();
    };

    window.addEventListener('resize', handleResize);
    animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [initGame]);

  // Resume audio
  useEffect(() => {
    const handleInteraction = () => {
      audio.resume();
    };

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [audio]);

  return (
    <div className="z-50 fixed inset-0 overflow-hidden cursor-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* HUD Overlay */}
      <div className="top-4 left-4 absolute bg-white/75 backdrop-blur-sm px-3 py-2 border border-pink-200/50 rounded-lg text-slate-700 text-sm pointer-events-none">
        ✨ Star Collector Mode
      </div>

      <div className="top-4 right-4 absolute bg-white/75 backdrop-blur-sm px-3 py-2 border border-pink-200/50 rounded-lg text-slate-700 text-sm pointer-events-none">
        Stars collected: {Math.max(0, collectionStep - 1)} / {collectionTotal}
      </div>

      {/* Progress stars */}
      <div className="top-14 left-1/2 absolute flex gap-3 -translate-x-1/2 pointer-events-none">
        {Array.from({ length: collectionTotal }).map((_, idx) => (
          <div
            key={idx}
            className={`transition-all duration-300 ${
              idx < collectionStep - 1
                ? 'scale-100 text-amber-400'
                : idx === collectionStep - 1
                  ? 'scale-125 animate-pulse text-pink-400'
                  : 'scale-90 text-slate-300'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
