import 'server-only';

import sharp from 'sharp';

import type { GazeFeature } from '@/features/test/types';

// ── AOI bounds — sourced from constants.ts ──────────────────
// CALIBRATION_POINTS X range: [0.2, 0.8]
// AOI_Y_BOUNDS: { min: 0.1, max: 0.65 }

const AOI_X = { min: 0.2, max: 0.8 };
const AOI_Y = { min: 0.1, max: 0.65 };

// ── Virtual viewport ────────────────────────────────────────
// Matches fullscreen layout: reading zone at 20%–80% X, 10%–95% Y

const VP_W = 1920;
const VP_H = 1080;
const ZONE_LEFT = VP_W * 0.2;
const ZONE_TOP = VP_H * 0.1;
const ZONE_W = VP_W * 0.6; // 20%–80%
const ZONE_H = VP_H * 0.85; // 10%–95%

// ── Coordinate mapping ──────────────────────────────────────
// Same as FullscreenGazeReplay: mapToElement(raw, aoi.min, aoi.max) → [0,1]
// Then map into the reading zone pixel bounds.

function mapToElement(raw: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (raw - min) / (max - min)));
}

function toPixelX(rawX: number): number {
  return ZONE_LEFT + mapToElement(rawX, AOI_X.min, AOI_X.max) * ZONE_W;
}

function toPixelY(rawY: number): number {
  return ZONE_TOP + mapToElement(rawY, AOI_Y.min, AOI_Y.max) * ZONE_H;
}

// ── Bubble sizing ───────────────────────────────────────────
// Same formula as useGazeReplay: 10 + (duration / maxDuration) * 26

function getBubbleSize(durationMs: number, maxDuration: number): number {
  return 10 + (durationMs / maxDuration) * 26;
}

// ── Colors (matching fullscreen-gaze-replay.tsx) ────────────

const COLOR_FORWARD = '#4A7C59';
const COLOR_REGRESSION = '#f87171';
const COLOR_LINE_FORWARD = '#86efac';
const COLOR_LINE_REGRESSION = '#f87171';
const COLOR_LINE_SWEEP = '#d1d5db';

// ── SVG overlay (transparent background) ────────────────────

/**
 * Builds saccade lines connecting sequential fixation points.
 */
function renderSaccadeLines(features: GazeFeature[], w: number, h: number): string {
  const scaleX = w / VP_W;
  const scaleY = h / VP_H;
  const lines: string[] = [];

  for (let i = 1; i < features.length; i++) {
    const prev = features[i - 1];
    const curr = features[i];
    const x1 = toPixelX(prev.fixationX) * scaleX;
    const y1 = toPixelY(prev.fixationY) * scaleY;
    const x2 = toPixelX(curr.fixationX) * scaleX;
    const y2 = toPixelY(curr.fixationY) * scaleY;

    let stroke: string;
    let dashArray: string;
    let opacity: number;

    if (curr.isReturnSweep) {
      stroke = COLOR_LINE_SWEEP;
      dashArray = '3 4';
      opacity = 0.35;
    } else if (curr.isRegression) {
      stroke = COLOR_LINE_REGRESSION;
      dashArray = 'none';
      opacity = 0.45;
    } else {
      stroke = COLOR_LINE_FORWARD;
      dashArray = 'none';
      opacity = 0.45;
    }

    lines.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ` +
        `stroke="${stroke}" stroke-width="${1.5 * scaleX}" stroke-dasharray="${dashArray}" opacity="${opacity}" />`,
    );
  }

  return lines.join('\n');
}

/**
 * Builds fixation bubble circles.
 */
function renderFixationBubbles(features: GazeFeature[], w: number, h: number): string {
  const scaleX = w / VP_W;
  const scaleY = h / VP_H;
  const maxDuration = Math.max(...features.map((f) => f.durationMs), 1);
  const bubbles: string[] = [];

  for (const f of features) {
    const cx = toPixelX(f.fixationX) * scaleX;
    const cy = toPixelY(f.fixationY) * scaleY;
    const r = (getBubbleSize(f.durationMs, maxDuration) / 2) * scaleX;
    const fill = f.isRegression ? COLOR_REGRESSION : COLOR_FORWARD;

    bubbles.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="0.45" />`);
  }

  return bubbles.join('\n');
}

/**
 * Builds the legend overlay.
 */
function renderLegend(w: number, h: number): string {
  const scaleX = w / VP_W;
  const scaleY = h / VP_H;
  const x = w - 220 * scaleX;
  const y = 20 * scaleY;
  const fs = Math.round(11 * scaleX);

  return `
    <rect x="${x}" y="${y}" width="${200 * scaleX}" height="${100 * scaleY}" rx="${12 * scaleX}" fill="white" opacity="0.9" stroke="#E8E0D4" />
    <circle cx="${x + 18 * scaleX}" cy="${y + 22 * scaleY}" r="${5 * scaleX}" fill="${COLOR_FORWARD}" opacity="0.6" />
    <text x="${x + 30 * scaleX}" y="${y + 26 * scaleY}" font-family="sans-serif" font-size="${fs}" fill="#8B857E">Forward fixation</text>
    <circle cx="${x + 18 * scaleX}" cy="${y + 44 * scaleY}" r="${5 * scaleX}" fill="${COLOR_REGRESSION}" opacity="0.6" />
    <text x="${x + 30 * scaleX}" y="${y + 48 * scaleY}" font-family="sans-serif" font-size="${fs}" fill="#8B857E">Regression (backward)</text>
    <line x1="${x + 12 * scaleX}" y1="${y + 66 * scaleY}" x2="${x + 26 * scaleX}" y2="${y + 66 * scaleY}" stroke="${COLOR_LINE_SWEEP}" stroke-width="${1.5 * scaleX}" stroke-dasharray="3 4" />
    <text x="${x + 30 * scaleX}" y="${y + 70 * scaleY}" font-family="sans-serif" font-size="${fs}" fill="#8B857E">Return sweep</text>
    <text x="${x + 18 * scaleX}" y="${y + 90 * scaleY}" font-family="sans-serif" font-size="${fs}" fill="#8B857E">Bubble size = fixation duration</text>
  `;
}

/**
 * Generates a transparent SVG overlay with gaze bubbles and saccade lines,
 * scaled to the given pixel dimensions.
 */
function buildGazeOverlaySvg(features: GazeFeature[], w: number, h: number): Buffer {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      ${renderSaccadeLines(features, w, h)}
      ${renderFixationBubbles(features, w, h)}
      ${renderLegend(w, h)}
    </svg>
  `.trim();

  return Buffer.from(svg, 'utf8');
}

// ── Public API ──────────────────────────────────────────────

/**
 * Composites a gaze overlay onto a real screenshot captured during the test.
 *
 * The overlay SVG is scaled to match the screenshot's actual pixel dimensions,
 * then composited on top using sharp. This gives pixel-perfect results since
 * the background is the exact DOM the user saw during the test.
 *
 * Returns null if there are no features to render.
 */
export async function compositeGazeVisualization(
  features: GazeFeature[],
  screenshotBuffer: Buffer,
): Promise<Buffer | null> {
  if (features.length === 0) {
    return null;
  }

  // Read screenshot dimensions to scale the overlay correctly.
  const metadata = await sharp(screenshotBuffer).metadata();
  const w = metadata.width ?? VP_W;
  const h = metadata.height ?? VP_H;

  const overlaySvg = buildGazeOverlaySvg(features, w, h);

  return sharp(screenshotBuffer)
    .composite([{ input: overlaySvg, top: 0, left: 0 }])
    .png()
    .toBuffer();
}
