/**
 * Calibration Audio System — Map-based synthesis registry with debouncing.
 *
 * Architecture:
 * - AudioContext + master gain + per-sound gain chain
 * - Map-based sound registry (replaces object literal for O(1) lookup + extensibility)
 * - Optional external audio file loading with synthesis fallback
 * - Per-sound debouncing to prevent audio spam
 *
 * For production, audio files should be placed in /public/audio/calibration/
 * Sound synthesis is used as fallback when files aren't available.
 */

export type SoundType =
  | 'spawn'
  | 'bossSpawn'
  | 'dash'
  | 'jump'
  | 'land'
  | 'bossLand'
  | 'step'
  | 'skid'
  | 'obstacleBreak'
  | 'hit'
  | 'scanTick'
  | 'shatter'
  | 'collect'
  | 'magicSparkle'
  | 'chestOpen'
  | 'success';

interface CalibrationAudioEngine {
  play: (sound: SoundType, options?: { progress?: number }) => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  resume: () => Promise<void>;
  setVolume: (volume: number) => void;
}

/* ── Audio context singleton ─────────────────────────── */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;
let masterVolume = 0.5;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(audioCtx.destination);
  }

  return audioCtx;
}

function getMasterGain(): GainNode | null {
  getAudioContext();
  return masterGain;
}

/* ── Debounce ────────────────────────────────────────── */

const DEBOUNCE_MS = new Map<SoundType, number>([
  ['step', 350],
  ['hit', 250],
  ['scanTick', 180],
  ['dash', 300],
  ['magicSparkle', 250],
  ['jump', 200],
  ['land', 200],
  ['obstacleBreak', 200],
  ['skid', 250],
]);

const lastPlayTime = new Map<SoundType, number>();

function shouldPlay(sound: SoundType): boolean {
  if (muted) return false;

  const debounceMs = DEBOUNCE_MS.get(sound);
  if (!debounceMs) return true;

  const now = performance.now();
  const last = lastPlayTime.get(sound) ?? 0;

  if (now - last < debounceMs) return false;

  lastPlayTime.set(sound, now);
  return true;
}

/* ── Audio file cache ────────────────────────────────── */

const audioBuffers = new Map<string, AudioBuffer>();
const loadingPromises = new Map<string, Promise<AudioBuffer | null>>();

async function loadAudioFile(path: string): Promise<AudioBuffer | null> {
  const ctx = getAudioContext();
  if (!ctx) return null;

  const cached = audioBuffers.get(path);
  if (cached) return cached;

  const existing = loadingPromises.get(path);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const response = await fetch(path);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      audioBuffers.set(path, buffer);
      return buffer;
    } catch {
      return null;
    } finally {
      loadingPromises.delete(path);
    }
  })();

  loadingPromises.set(path, promise);
  return promise;
}

function playBuffer(buffer: AudioBuffer, volume = 1): void {
  const ctx = getAudioContext();
  const master = getMasterGain();
  if (!ctx || !master || muted) return;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.value = volume;

  source.connect(gain);
  gain.connect(master);
  source.start();
}

/* ── Synthesis primitives ────────────────────────────── */

function playTone(
  freq: number,
  type: OscillatorType,
  duration: number,
  volume: number,
  slideFreq?: number,
): void {
  const ctx = getAudioContext();
  const master = getMasterGain();
  if (!ctx || !master || muted) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slideFreq) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(slideFreq, 20),
      ctx.currentTime + duration,
    );
  }

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gain.gain.setValueAtTime(volume, ctx.currentTime + duration * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(master);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playNoise(
  duration: number,
  volume: number,
  filterType: BiquadFilterType,
  startFreq: number,
  endFreq = 100,
): void {
  const ctx = getAudioContext();
  const master = getMasterGain();
  if (!ctx || !master || muted) return;

  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(startFreq, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(endFreq, 20),
    ctx.currentTime + duration,
  );

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  noise.start();
}

function playChord(
  frequencies: number[],
  type: OscillatorType,
  duration: number,
  volume: number,
): void {
  const perOscVolume = volume / Math.sqrt(frequencies.length);
  for (const freq of frequencies) {
    playTone(freq, type, duration, perOscVolume);
  }
}

/* ── Sound registry (Map-based) ──────────────────────── */

type SoundHandler = (options?: { progress?: number }) => void;

/**
 * Map-based registry of synthesis handlers.
 *
 * Advantages over the previous object literal:
 * - O(1) lookup with type-safe keys
 * - Easy to extend at runtime (e.g., register custom sounds)
 * - Consistent with the debounce/cache Maps above
 */
const soundRegistry = new Map<SoundType, SoundHandler>([
  ['spawn', () => {
    playTone(330, 'sine', 0.25, 0.04, 660);
    playTone(440, 'triangle', 0.2, 0.02, 550);
  }],

  ['bossSpawn', () => {
    playTone(130, 'triangle', 0.4, 0.05, 260);
    playChord([130, 195, 260], 'sine', 0.35, 0.025);
  }],

  ['dash', () => {
    playNoise(0.12, 0.025, 'highpass', 2500, 600);
    playTone(500, 'sine', 0.08, 0.015, 800);
  }],

  ['jump', () => {
    playTone(400, 'sine', 0.18, 0.03, 800);
  }],

  ['land', () => {
    playTone(150, 'sine', 0.1, 0.025, 80);
  }],

  ['bossLand', () => {
    playTone(90, 'triangle', 0.18, 0.04, 50);
    playNoise(0.12, 0.025, 'lowpass', 350, 80);
  }],

  ['step', () => {
    // Very subtle soft tap — barely audible to avoid annoyance
    playTone(120, 'sine', 0.04, 0.008, 70);
  }],

  ['skid', () => {
    playNoise(0.1, 0.02, 'bandpass', 1800, 600);
  }],

  ['obstacleBreak', () => {
    playNoise(0.15, 0.04, 'lowpass', 1200, 150);
    playTone(220, 'triangle', 0.1, 0.03, 60);
  }],

  ['hit', () => {
    playTone(600, 'sine', 0.06, 0.02, 300);
  }],

  ['scanTick', (options) => {
    const progress = options?.progress ?? 0;
    playTone(440 + progress * 300, 'sine', 0.05, 0.01);
  }],

  ['shatter', () => {
    playNoise(0.25, 0.08, 'lowpass', 500, 80);
    playTone(110, 'triangle', 0.2, 0.05, 30);
  }],

  ['collect', () => {
    playChord([523, 659, 784], 'sine', 0.25, 0.02);
  }],

  ['magicSparkle', () => {
    playTone(880, 'sine', 0.15, 0.012, 1320);
    setTimeout(() => playTone(1100, 'sine', 0.12, 0.01, 1650), 60);
  }],

  ['chestOpen', () => {
    playChord([392, 494, 587], 'sine', 0.3, 0.025);
  }],

  ['success', () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 'sine', 0.22, 0.02), i * 90);
    });
  }],
]);

/* ── Audio file paths (when available) ───────────────── */

const audioFilePaths = new Map<SoundType, string>([
  // These entries are for when external audio files are added:
  // ['spawn', '/audio/calibration/spawn.mp3'],
  // ['collect', '/audio/calibration/collect.mp3'],
]);

/* ── Engine factory ──────────────────────────────────── */

export function createCalibrationAudioEngine(): CalibrationAudioEngine {
  return {
    play(sound, options) {
      if (!shouldPlay(sound)) return;

      // Try external audio file first
      const filePath = audioFilePaths.get(sound);
      if (filePath) {
        const buffer = audioBuffers.get(filePath);
        if (buffer) {
          playBuffer(buffer, 1);
          return;
        }
        loadAudioFile(filePath);
      }

      // Fall back to synthesis
      const handler = soundRegistry.get(sound);
      handler?.(options);
    },

    setMuted(newMuted) {
      muted = newMuted;
    },

    isMuted() {
      return muted;
    },

    setVolume(volume) {
      masterVolume = Math.max(0, Math.min(1, volume));
      const gain = getMasterGain();
      if (gain) {
        gain.gain.value = masterVolume;
      }
    },

    async resume() {
      const ctx = getAudioContext();
      if (ctx?.state === 'suspended') {
        await ctx.resume();
      }
    },
  };
}

/* ── Singleton ───────────────────────────────────────── */

let engineInstance: CalibrationAudioEngine | null = null;

export function getCalibrationAudio(): CalibrationAudioEngine {
  if (!engineInstance) {
    engineInstance = createCalibrationAudioEngine();
  }
  return engineInstance;
}

/**
 * Preload audio files for faster playback.
 * Call this early in the calibration flow.
 */
export async function preloadCalibrationAudio(): Promise<void> {
  const paths = Array.from(audioFilePaths.values());
  await Promise.all(paths.map((path) => loadAudioFile(path)));
}
