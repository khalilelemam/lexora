/**
 * Calibration Audio System with debouncing and optional external audio files.
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

// Debounce configuration per sound type (ms)
const DEBOUNCE_MS: Partial<Record<SoundType, number>> = {
  step: 200,       // Footsteps shouldn't spam
  hit: 150,        // Hit sparks limited
  scanTick: 100,   // Progress ticks limited
  dash: 200,       // Dash whoosh limited
  magicSparkle: 150,
};

// Track last play time for debouncing
const lastPlayTime: Map<SoundType, number> = new Map();

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;
let masterVolume = 0.5;

// Audio file cache
const audioBuffers: Map<string, AudioBuffer> = new Map();
const loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioCtx = new AudioContextCtor();
    
    // Create master gain node
    masterGain = audioCtx.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(audioCtx.destination);
  }

  return audioCtx;
}

function getMasterGain(): GainNode | null {
  getAudioContext(); // Ensure context and gain are created
  return masterGain;
}

/**
 * Load an audio file and cache it.
 */
async function loadAudioFile(path: string): Promise<AudioBuffer | null> {
  const ctx = getAudioContext();
  if (!ctx) return null;

  // Check cache
  const cached = audioBuffers.get(path);
  if (cached) return cached;

  // Check if already loading
  const existing = loadingPromises.get(path);
  if (existing) return existing;

  // Start loading
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

/**
 * Play a cached audio buffer.
 */
function playBuffer(buffer: AudioBuffer, volume: number = 1): void {
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

/**
 * Check debounce and return true if sound should be played.
 */
function shouldPlay(sound: SoundType): boolean {
  if (muted) return false;

  const debounceMs = DEBOUNCE_MS[sound];
  if (!debounceMs) return true;

  const now = performance.now();
  const last = lastPlayTime.get(sound) ?? 0;
  
  if (now - last < debounceMs) {
    return false;
  }

  lastPlayTime.set(sound, now);
  return true;
}

// ============== SYNTHESIS FUNCTIONS ==============

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

  // Smooth envelope to avoid clicks
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

// ============== SOUND HANDLERS ==============
// These provide synthesis fallbacks. External audio files take priority.

const soundHandlers: Record<SoundType, (options?: { progress?: number }) => void> = {
  spawn: () => {
    playTone(600, 'sine', 0.12, 0.03, 900);
  },

  bossSpawn: () => {
    playTone(120, 'sawtooth', 0.6, 0.08, 60);
    playNoise(0.3, 0.05, 'lowpass', 200, 50);
  },

  dash: () => {
    playNoise(0.08, 0.03, 'highpass', 3000, 1500);
  },

  jump: () => {
    playTone(350, 'sine', 0.15, 0.03, 550);
  },

  land: () => {
    playNoise(0.08, 0.03, 'lowpass', 300, 80);
  },

  bossLand: () => {
    playNoise(0.35, 0.12, 'lowpass', 250, 40);
    playTone(70, 'sawtooth', 0.25, 0.06, 35);
  },

  step: () => {
    playNoise(0.04, 0.01, 'highpass', 4000, 2500);
  },

  skid: () => {
    playNoise(0.15, 0.05, 'highpass', 1800, 600);
  },

  obstacleBreak: () => {
    playNoise(0.15, 0.08, 'lowpass', 1500, 150);
    playTone(180, 'square', 0.08, 0.05, 40);
  },

  hit: () => {
    playTone(900, 'square', 0.04, 0.025, 200);
  },

  scanTick: (options) => {
    const progress = options?.progress ?? 0;
    // Higher pitch as progress increases
    playTone(350 + progress * 400, 'sine', 0.04, 0.012);
  },

  shatter: () => {
    playNoise(0.3, 0.18, 'lowpass', 600, 80);
    playTone(90, 'sawtooth', 0.25, 0.1, 25);
  },

  collect: () => {
    // Gentle ascending chime
    playChord([523, 659, 784], 'sine', 0.2, 0.03);
  },

  magicSparkle: () => {
    playTone(1000, 'sine', 0.12, 0.015, 1500);
    setTimeout(() => playTone(1300, 'sine', 0.1, 0.012, 1800), 40);
  },

  chestOpen: () => {
    playChord([392, 494, 587], 'triangle', 0.25, 0.04);
  },

  success: () => {
    // Rising triumphant arpeggio
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 'sine', 0.18, 0.025), i * 70);
    });
  },
};

// Audio file paths (when available)
const AUDIO_FILE_PATHS: Partial<Record<SoundType, string>> = {
  // These paths are for when external audio files are added
  // spawn: '/audio/calibration/spawn.mp3',
  // collect: '/audio/calibration/collect.mp3',
  // etc.
};

export function createCalibrationAudioEngine(): CalibrationAudioEngine {
  return {
    play(sound: SoundType, options?: { progress?: number }) {
      if (!shouldPlay(sound)) return;

      // Try external audio file first
      const filePath = AUDIO_FILE_PATHS[sound];
      if (filePath) {
        const buffer = audioBuffers.get(filePath);
        if (buffer) {
          playBuffer(buffer, 1);
          return;
        }
        // Async load for next time
        loadAudioFile(filePath);
      }

      // Fall back to synthesis
      const handler = soundHandlers[sound];
      if (handler) {
        handler(options);
      }
    },

    setMuted(newMuted: boolean) {
      muted = newMuted;
    },

    isMuted() {
      return muted;
    },

    setVolume(volume: number) {
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

// Singleton instance for convenience
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
  const paths = Object.values(AUDIO_FILE_PATHS);
  await Promise.all(paths.map(path => loadAudioFile(path)));
}
