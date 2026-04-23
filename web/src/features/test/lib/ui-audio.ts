/**
 * Lightweight UI audio helpers — shared AudioContext for soft feedback sounds.
 *
 * The TTS voice system (speakInstruction) has been removed.
 * Research shows repeating interrupted voice prompts degrade UX.
 * Replaced with: brief text overlays + subtle audio cues.
 */

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (_ctx && _ctx.state !== 'closed') return _ctx;
  const Ctor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  _ctx = new Ctor();
  return _ctx;
}

/**
 * Play a short sine-wave tone for subtle UI feedback (e.g. point transition).
 */
export function playSoftSound(frequency: number, durationMs = 95, volume = 0.04): void {
  const ctx = getCtx();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined);
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.005);
  gain.gain.setValueAtTime(volume, ctx.currentTime + (durationMs / 1000) * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + durationMs / 1000);
}
