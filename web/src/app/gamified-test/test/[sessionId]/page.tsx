"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getQuestionsByNumbers } from "@/features/gamified-test/lib/questions";
import type { ExamLanguage } from "@/features/gamified-test/lib/questions";
import { Demographics, Question, SessionEvent } from "@/features/gamified-test/lib/types";
import {
  speakTextAndWait,
  unlockSpeechSynthesis,
  type VoiceLocale,
} from "@/features/gamified-test/lib/voice";
import { Volume2, VolumeX } from "lucide-react";

const QUESTION_DURATION_SECONDS = 15;
const ENGLISH_LETTER_POOL = "abcdefghijklmnopqrstuvwxyz";
const ARABIC_LETTER_POOL = [
  "ا",
  "ب",
  "ت",
  "ث",
  "ج",
  "ح",
  "خ",
  "د",
  "ذ",
  "ر",
  "ز",
  "س",
  "ش",
  "ص",
  "ض",
  "ط",
  "ظ",
  "ع",
  "غ",
  "ف",
  "ق",
  "ك",
  "ل",
  "م",
  "ن",
  "ه",
  "و",
  "ي",
];
const TARGET_REPEAT_COUNT = 3;
const MAX_GRID_SIZE = 4;
const SHOW_SKIP_BUTTON = true;
const Q30_VISUAL_EXPOSURE_MS = 3000;
const BACKGROUND_MUSIC_SRC = "/gamified-test/sounds/Busy_Button_Waltz.mp3";
const BACKGROUND_MUSIC_VOLUME = 0.04;
const CLICK_SOUND_SRC = "/gamified-test/sounds/click.wav";
const CLICK_SOUND_VOLUME = 0.16;
const ENGLISH_TYPE_KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];
const ARABIC_TYPE_KEYBOARD_ROWS = [
  ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج", "د"],
  ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ط"],
  ["ذ", "ئ", "ء", "ؤ", "ر", "ى", "ة", "و", "ز", "ظ"],
];

const SEQUENTIAL_VARIANT_QUESTION_IDS = new Set(["q14", "q15", "q16", "q17"]);

const ARABIC_LETTER_NAME_BY_SYMBOL: Record<string, string> = {
  ا: "ألف",
  ب: "باء",
  ت: "تاء",
  ث: "ثاء",
  ج: "جيم",
  ح: "حاء",
  خ: "خاء",
  د: "دال",
  ذ: "ذال",
  ر: "راء",
  ز: "زاي",
  س: "سين",
  ش: "شين",
  ص: "صاد",
  ض: "ضاد",
  ط: "طاء",
  ظ: "ظاء",
  ع: "عين",
  غ: "غين",
  ف: "فاء",
  ق: "قاف",
  ك: "كاف",
  ل: "لام",
  م: "ميم",
  ن: "نون",
  ه: "هاء",
  و: "واو",
  ي: "ياء",
  ة: "تاء مربوطة",
  ى: "ألف مقصورة",
  ء: "همزة",
  ئ: "ياء همزة",
  ؤ: "واو همزة",
};

const EXAM_COPY = {
  en: {
    loadQuestionSet: "Loading age-specific question set...",
    noQuestionFound: "No question found for this session.",
    listenHeading: "Listen",
    voiceHint: "The task will appear after the voice instruction.",
    audioPlaying: "Audio is playing...",
    unlockVoiceHint: "Tap once to enable voice playback on this browser.",
    enableVoiceButton: "Enable Voice",
    enablingVoiceButton: "Enabling Voice...",
    voiceMayBeUnavailable:
      "Voice may be unavailable on this device. The test will continue.",
    skipTesting: "Skip (testing)",
    completeLabel: "complete",
    pointsPrefix: "You got",
    pointsSuffix: "points",
    progressPrefix: "Progress:",
    noClicks: "No clicks were detected. Please retake this question.",
    finishing: "Finishing...",
    retake: "Retake Question",
    viewResult: "View Final Result",
    continue: "Continue",
    skip: "Skip",
    muteMusic: "Mute Music",
    unmuteMusic: "Unmute Music",
    memorizeAndType: "Memorize and type",
    typedPrefix: "Typed",
  },
  ar: {
    loadQuestionSet: "جاري تحميل أسئلة الفئة العمرية...",
    noQuestionFound: "لا توجد أسئلة لهذه الجلسة.",
    listenHeading: "استمع",
    voiceHint: "ستظهر المهمة بعد التعليمات الصوتية.",
    audioPlaying: "الصوت قيد التشغيل...",
    unlockVoiceHint: "اضغط مرة واحدة لتفعيل تشغيل الصوت في المتصفح.",
    enableVoiceButton: "تفعيل الصوت",
    enablingVoiceButton: "جاري تفعيل الصوت...",
    voiceMayBeUnavailable:
      "قد لا يكون الصوت متاحا على هذا الجهاز. سيستمر الاختبار.",
    skipTesting: "تخطي (للاختبار)",
    completeLabel: "اكتمل",
    pointsPrefix: "حصلت على",
    pointsSuffix: "نقطة",
    progressPrefix: "التقدم:",
    noClicks: "لم يتم تسجيل أي ضغطات. يرجى إعادة السؤال.",
    finishing: "جاري الإنهاء...",
    retake: "إعادة السؤال",
    viewResult: "عرض النتيجة النهائية",
    continue: "متابعة",
    skip: "تخطي",
    muteMusic: "كتم الموسيقى",
    unmuteMusic: "تشغيل الموسيقى",
    memorizeAndType: "احفظ ثم اكتب",
    typedPrefix: "المكتوب",
  },
} as const;

type RoundStats = {
  clicks: number;
  hits: number;
  misses: number;
};

type ActivePrompt = {
  targetToken: string;
  distractorTokens?: string[];
  visualCue?: string;
  correctionTargetToken?: string;
  correctionDistractorTokens?: string[];
  /** Recorded audio URL for this specific prompt (used in Q31/Q32 variants). */
  audioUrl?: string;
};

type ClientSessionData = {
  sessionId: string;
  demographics: Demographics;
  questionIds: number[];
  theme?: string;
};

function normalizeToken(token: string) {
  return token
    .toLocaleLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function hasArabicScript(token: string) {
  return /[\u0600-\u06FF]/.test(token);
}

function toArabicSpeechText(text: string) {
  if (!text.trim()) {
    return text;
  }

  return text
    .split(/\s+/)
    .map((token) => {
      const strippedToken = token.replace(/[^\u0600-\u06FF]/g, "");
      if (strippedToken.length !== 1) {
        return token;
      }

      const letterName = ARABIC_LETTER_NAME_BY_SYMBOL[strippedToken];
      if (!letterName) {
        return token;
      }

      return token.replace(strippedToken, letterName);
    })
    .join(" ");
}

function getSpeechTextByLanguage(text: string, _language: ExamLanguage) {
  // Currently only "en" is supported; Arabic path kept for future use
  return text;
}

async function playAudioAndWait(url: string) {
  return new Promise<boolean>((resolve) => {
    const audio = new Audio(url);
    audio.onended = () => resolve(true);
    audio.onerror = () => resolve(false);
    audio.play().catch(() => resolve(false));
  });
}


function getLetterPool(targetToken: string) {
  if (hasArabicScript(targetToken)) {
    return ARABIC_LETTER_POOL;
  }

  return ENGLISH_LETTER_POOL.split("");
}

function shuffleArray<T>(values: T[]) {
  const items = [...values];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function getEffectiveGridSize(gridSize: number) {
  return Math.max(2, Math.min(gridSize, MAX_GRID_SIZE));
}

function buildLetterChoices(
  targetToken: string,
  distractorTokens: string[] | undefined,
  choiceCount: number,
) {
  const normalizedTarget = targetToken.toLowerCase();
  const distractors = normalizeDistractorPool(targetToken, distractorTokens)
    .filter((token) => token.length === 1 && token !== normalizedTarget)
    .slice(0, Math.max(choiceCount - 1, 0));

  if (distractors.length < Math.max(choiceCount - 1, 0)) {
    const fallback = getLetterPool(targetToken).filter(
      (token) => token !== normalizedTarget && !distractors.includes(token),
    );
    distractors.push(
      ...fallback.slice(0, choiceCount - 1 - distractors.length),
    );
  }

  return shuffleArray([
    normalizedTarget,
    ...distractors.slice(0, choiceCount - 1),
  ]);
}

function buildWordLetterChoices(visualCue?: string) {
  if (!visualCue) {
    return [];
  }

  return visualCue
    .replace(/\s+/g, "")
    .split("")
    .map((token) => token.toLowerCase());
}

function buildPromptSequence(question: Question): ActivePrompt[] {
  const basePrompt: ActivePrompt = {
    targetToken: question.targetToken,
    distractorTokens: question.distractorTokens,
    visualCue: question.visualCue,
    correctionTargetToken: question.correctionTargetToken,
    correctionDistractorTokens: question.correctionDistractorTokens,
  };

  if (!question.variants || question.variants.length === 0) {
    return [basePrompt];
  }

  const variantPrompts = question.variants.map((variant) => ({
    targetToken: variant.targetToken,
    distractorTokens: variant.distractorTokens,
    visualCue: variant.visualCue,
    correctionTargetToken: variant.correctionTargetToken,
    correctionDistractorTokens: variant.correctionDistractorTokens,
    audioUrl: variant.audioUrl, // carry per-variant recorded audio
  }));

  return [basePrompt, ...variantPrompts];
}

function buildSentenceSegmentationChoices(
  targetToken: string,
  distractorTokens: string[] | undefined,
  choiceCount: number,
) {
  const normalizedTarget = targetToken.trim().toLowerCase();
  const distractors = (distractorTokens ?? [])
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0 && token !== normalizedTarget);

  const options = [normalizedTarget, ...distractors].slice(
    0,
    Math.max(choiceCount, 2),
  );

  return shuffleArray(options);
}

function buildAnswerOptions(
  question: Question,
  prompt: ActivePrompt,
  typedKeyboardKeys: string[],
) {
  const interactionType = question.interactionType ?? "grid";

  if (interactionType === "letterChoices") {
    return buildLetterChoices(
      prompt.targetToken,
      prompt.distractorTokens,
      question.choiceCount ?? 5,
    );
  }

  if (interactionType === "wordLetters") {
    return buildWordLetterChoices(prompt.visualCue);
  }

  if (interactionType === "wordToLetterChoices") {
    return buildWordLetterChoices(prompt.visualCue);
  }

  if (interactionType === "letterReplacement") {
    return buildWordLetterChoices(prompt.visualCue);
  }

  if (interactionType === "letterArrangement") {
    return buildLettersFromVisualCue(prompt.visualCue);
  }

  if (interactionType === "syllableArrangement") {
    return buildSyllablesFromVisualCue(prompt.visualCue);
  }

  if (interactionType === "sentenceSegmentationChoices") {
    return buildSentenceSegmentationChoices(
      prompt.targetToken,
      prompt.distractorTokens,
      question.choiceCount ?? 4,
    );
  }

  if (interactionType === "typedSequenceRecall") {
    return typedKeyboardKeys;
  }

  if (interactionType === "grid") {
    const effectiveGridSize = getEffectiveGridSize(question.gridSize);
    return generateGrid(
      effectiveGridSize,
      prompt.targetToken,
      prompt.distractorTokens,
      question.targetRepeatCount,
      shouldUseFixedGridTargetCell(question)
        ? Math.floor((effectiveGridSize * effectiveGridSize) / 2)
        : undefined,
    );
  }

  return [];
}

function buildLettersFromVisualCue(visualCue?: string): string[] {
  if (!visualCue) {
    return [];
  }
  const letters = visualCue
    .split(",")
    .map((letter) => letter.trim().toLowerCase());
  return shuffleArray(letters);
}

function buildSyllablesFromVisualCue(visualCue?: string): string[] {
  if (!visualCue) {
    return [];
  }
  const syllables = visualCue
    .split(",")
    .map((syllable) => syllable.trim().toLowerCase());
  return shuffleArray(syllables);
}

function buildFiveLetterChoices(
  correctLetter: string,
  distractorTokens?: string[],
) {
  const normalizedCorrect = correctLetter.toLowerCase();
  const pool = (distractorTokens ?? [])
    .map((token) => token.toLowerCase())
    .filter((token) => token.length === 1 && token !== normalizedCorrect);

  if (pool.length < 4) {
    const fallback = getLetterPool(correctLetter).filter(
      (token) => token !== normalizedCorrect && !pool.includes(token),
    );
    pool.push(...fallback.slice(0, 4 - pool.length));
  }

  return shuffleArray([normalizedCorrect, ...pool.slice(0, 4)]);
}

function getVisualCueClassName(visualCue: string) {
  const isSentenceLike = visualCue.includes(" ") || visualCue.length > 16;
  const isArabicText = hasArabicScript(visualCue);

  if (isSentenceLike) {
    return "w-full max-w-5xl rounded-sm border border-sky-200 bg-white px-5 py-4 text-center text-base leading-relaxed tracking-normal text-slate-600 sm:px-8 sm:py-5 sm:text-xl";
  }

  if (isArabicText) {
    return "min-w-65 rounded-sm border border-sky-200 bg-white px-8 py-5 text-center text-4xl tracking-normal text-slate-600 sm:min-w-105 sm:text-5xl";
  }

  return "min-w-65 rounded-sm border border-sky-200 bg-white px-8 py-5 text-center text-4xl tracking-[0.3em] text-slate-600 sm:min-w-105 sm:text-5xl";
}

function resolveActivePrompt(question: Question, previousVisualCue?: string) {
  if (!question.variants || question.variants.length === 0) {
    return {
      targetToken: question.targetToken,
      distractorTokens: question.distractorTokens,
      visualCue: question.visualCue,
    };
  }

  const candidates = previousVisualCue
    ? question.variants.filter(
        (variant) => variant.visualCue !== previousVisualCue,
      )
    : question.variants;

  const source = candidates.length > 0 ? candidates : question.variants;
  const selected = source[Math.floor(Math.random() * source.length)];

  return {
    targetToken: selected.targetToken,
    distractorTokens: selected.distractorTokens,
    visualCue: selected.visualCue,
    correctionTargetToken: selected.correctionTargetToken,
    correctionDistractorTokens: selected.correctionDistractorTokens,
  };
}

function shouldUseSequentialPromptCycle(question: Question) {
  return SEQUENTIAL_VARIANT_QUESTION_IDS.has(question.id);
}

function shouldUseFixedGridTargetCell(question: Question) {
  return false;
}

function getDefaultDistractorPool(targetToken: string) {
  if (targetToken.length === 1) {
    return getLetterPool(targetToken).filter(
      (token) => token !== targetToken.toLowerCase(),
    );
  }

  if (hasArabicScript(targetToken)) {
    return ["با", "تا", "دا", "را", "سا", "نا", "ما", "فا", "لا", "كا"];
  }

  return [
    "pla",
    "bla",
    "gla",
    "glin",
    "glir",
    "gris",
    "gril",
    "glen",
    "grel",
    "glim",
  ];
}

function normalizeDistractorPool(
  targetToken: string,
  distractorTokens?: string[],
) {
  const sanitized = (distractorTokens ?? [])
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0 && token !== targetToken.toLowerCase());

  if (sanitized.length > 0) {
    return sanitized;
  }

  return getDefaultDistractorPool(targetToken);
}

function generateGrid(
  gridSize: number,
  targetToken: string,
  distractorTokens?: string[],
  targetRepeatCount?: number,
  fixedTargetIndex?: number,
) {
  const cellsCount = gridSize * gridSize;
  const distractorPool = normalizeDistractorPool(targetToken, distractorTokens);

  const cells = Array.from({ length: cellsCount }, () => {
    const index = Math.floor(Math.random() * distractorPool.length);
    return distractorPool[index];
  });

  const requestedCount = targetRepeatCount ?? TARGET_REPEAT_COUNT;
  const targetCount = Math.min(Math.max(requestedCount, 1), cellsCount);
  const targetIndexes = new Set<number>();

  if (typeof fixedTargetIndex === "number" && targetCount === 1) {
    const boundedFixedIndex = Math.max(
      0,
      Math.min(cellsCount - 1, fixedTargetIndex),
    );
    targetIndexes.add(boundedFixedIndex);
  }

  while (targetIndexes.size < targetCount) {
    targetIndexes.add(Math.floor(Math.random() * cellsCount));
  }

  targetIndexes.forEach((targetIndex) => {
    cells[targetIndex] = targetToken.toLowerCase();
  });

  return cells;
}

function getCellSide(gridSize: number) {
  if (gridSize >= 4) {
    return "min(20vw, 13vh)";
  }

  if (gridSize === 3) {
    return "min(23vw, 14vh)";
  }

  return "min(25vw, 16vh)";
}

function getTokenFontSize(tokenLength: number) {
  if (tokenLength >= 8) {
    return "clamp(0.95rem, 1.55vw, 1.22rem)";
  }
  if (tokenLength >= 7) {
    return "clamp(1rem, 1.68vw, 1.32rem)";
  }
  if (tokenLength >= 6) {
    return "clamp(1.08rem, 1.82vw, 1.42rem)";
  }
  if (tokenLength >= 5) {
    return "clamp(1.22rem, 2vw, 1.56rem)";
  }
  if (tokenLength >= 4) {
    return "clamp(1.34rem, 2.2vw, 1.72rem)";
  }
  return "clamp(1.65rem, 3.35vw, 2.45rem)";
}

function getSyllableTileSize(tokenLength: number) {
  if (tokenLength >= 4) {
    return {
      width: "min(15vw, 9.5vh)",
      height: "min(15vw, 9.5vh)",
      fontSize: "clamp(1rem, 1.8vw, 1.35rem)",
    };
  }

  return {
    width: "min(13vw, 8.5vh)",
    height: "min(13vw, 8.5vh)",
    fontSize: "clamp(1.1rem, 2vw, 1.45rem)",
  };
}

function getTimeProgress(timeLeft: number) {
  return Math.max(
    0,
    Math.min(100, (timeLeft / QUESTION_DURATION_SECONDS) * 100),
  );
}

export default function TestPage() {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId;
  const examLanguage: ExamLanguage = "en";
  const isLightTheme = searchParams.get("theme") === "light";
  const copy = EXAM_COPY[examLanguage];
  const isArabicExam = false; // Only English is currently supported
  const voiceLocale: VoiceLocale = "en-US";
  const voiceUnavailableMessage = copy.voiceMayBeUnavailable;
  const typedKeyboardRows = ENGLISH_TYPE_KEYBOARD_ROWS;
  const typedKeyboardKeys = useMemo(
    () => typedKeyboardRows.flat(),
    [typedKeyboardRows],
  );

  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [questionSetLoading, setQuestionSetLoading] = useState(true);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<
    "voice" | "active" | "summary" | "finishing"
  >("voice");
  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION_SECONDS);
  const [gridCells, setGridCells] = useState<string[]>([]);
  const [stats, setStats] = useState<RoundStats>({
    clicks: 0,
    hits: 0,
    misses: 0,
  });
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<ActivePrompt | null>(null);
  const [pendingCorrectionChoices, setPendingCorrectionChoices] = useState<
    string[]
  >([]);
  const [selectedArrangementIndices, setSelectedArrangementIndices] = useState<
    number[]
  >([]);
  const [pendingLetterReplacementIndex, setPendingLetterReplacementIndex] =
    useState<number | null>(null);
  const [pendingReplacementTargetLetter, setPendingReplacementTargetLetter] =
    useState<string | null>(null);
  const [typedInput, setTypedInput] = useState("");
  const [typedPromptSequence, setTypedPromptSequence] = useState<
    ActivePrompt[]
  >([]);
  const [promptCycleIndex, setPromptCycleIndex] = useState(0);
  const [typedPromptIndex, setTypedPromptIndex] = useState(0);
  const [typedRoundStage, setTypedRoundStage] = useState<
    "idle" | "cue" | "input"
  >("idle");
  const [showVisualSequence, setShowVisualSequence] = useState(false);
  const [isBackgroundMusicMuted, setIsBackgroundMusicMuted] = useState(
    () => isLightTheme,
  );
  const [isSpeechReady, setIsSpeechReady] = useState(false);
  const [isEnablingSpeech, setIsEnablingSpeech] = useState(false);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);
  // Client-side event log — replaces server /event API calls
  const clientEventsRef = useRef<SessionEvent[]>([]);
  const clientSessionDataRef = useRef<ClientSessionData | null>(null);

  const question = useMemo(
    () => activeQuestions[index],
    [activeQuestions, index],
  );
  const total = activeQuestions.length;
  const score = stats.hits;
  const progressPercent =
    total > 0 ? Math.round(((index + 1) / total) * 100) : 0;
  const isLastQuestion = total > 0 && index + 1 === total;
  const mustRetakeQuestion = stats.clicks === 0;
  const interactionType = question?.interactionType ?? "grid";
  const isTypedRecallMode = interactionType === "typedSequenceRecall";

  const pauseBackgroundMusic = useCallback(() => {
    const audio = backgroundMusicRef.current;
    if (!audio || audio.paused) {
      return;
    }

    audio.pause();
  }, []);

  const playBackgroundMusic = useCallback(() => {
    const audio = backgroundMusicRef.current;
    if (!audio || isBackgroundMusicMuted) {
      return;
    }

    audio.volume = BACKGROUND_MUSIC_VOLUME;
    void audio.play().catch(() => {
      // Browser autoplay policies may block until a user gesture.
    });
  }, [isBackgroundMusicMuted]);

  const toggleBackgroundMusicMute = useCallback(() => {
    setIsBackgroundMusicMuted((previous) => {
      const nextMuted = !previous;
      const audio = backgroundMusicRef.current;
      if (audio) {
        audio.muted = nextMuted;
        if (!nextMuted) {
          void audio.play().catch(() => {
            // Browser autoplay policies may block until a user gesture.
          });
        }
      }
      return nextMuted;
    });
  }, []);

  const playClickSound = useCallback(() => {
    const audio = clickSoundRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Autoplay can be blocked until user gesture.
    });
  }, []);

  const handleEnableSpeech = useCallback(async () => {
    setIsEnablingSpeech(true);
    setError(null);

    try {
      const unlocked = await unlockSpeechSynthesis(voiceLocale);

      if (!unlocked) {
        setError(voiceUnavailableMessage);
      }

      setIsSpeechReady(true);
    } finally {
      setIsEnablingSpeech(false);
    }
  }, [voiceLocale, voiceUnavailableMessage]);

  const speakWithVoiceFallback = useCallback(
    async (text: string) => {
      const speechText = getSpeechTextByLanguage(text, examLanguage);
      const voiceCompleted = await speakTextAndWait(speechText, voiceLocale);
      return voiceCompleted;
    },
    [examLanguage, voiceLocale],
  );

  useEffect(() => {
    const audio = new Audio(BACKGROUND_MUSIC_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = BACKGROUND_MUSIC_VOLUME;
    audio.muted = isBackgroundMusicMuted;

    backgroundMusicRef.current = audio;
    playBackgroundMusic();

    return () => {
      audio.pause();
      audio.currentTime = 0;
      backgroundMusicRef.current = null;
    };
  }, [isBackgroundMusicMuted, playBackgroundMusic]);

  useEffect(() => {
    const audio = new Audio(CLICK_SOUND_SRC);
    audio.preload = "auto";
    audio.volume = CLICK_SOUND_VOLUME;

    clickSoundRef.current = audio;

    return () => {
      audio.pause();
      clickSoundRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isVoicePlaying) {
      pauseBackgroundMusic();
      return;
    }

    playBackgroundMusic();
  }, [isVoicePlaying, pauseBackgroundMusic, playBackgroundMusic]);

  useEffect(() => {
    // Load session data from sessionStorage (client-side only, Vercel-safe)
    setQuestionSetLoading(true);
    setError(null);

    try {
      const raw = sessionStorage.getItem(`gt_session_${sessionId}`);
      if (!raw) {
        throw new Error(
          "Session data not found. Please start the test again.",
        );
      }

      const sessionData = JSON.parse(raw) as ClientSessionData;
      clientSessionDataRef.current = sessionData;
      clientEventsRef.current = [];

      const questions = getQuestionsByNumbers(
        sessionData.questionIds,
        examLanguage,
      );

      if (questions.length === 0) {
        throw new Error("No questions are configured for this session.");
      }

      setActiveQuestions(questions);
      setIndex(0);
      setPhase("voice");
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unexpected error.",
      );
    } finally {
      setQuestionSetLoading(false);
    }
  }, [sessionId, examLanguage]);

  // Client-side event recorder — no API call, just push to ref
  const postEvent = useCallback(
    (
      eventType: "click" | "hit" | "miss",
      questionId: string,
      optionId?: string,
    ) => {
      clientEventsRef.current.push({
        eventType,
        questionId,
        optionId,
        createdAt: new Date().toISOString(),
      });
      return Promise.resolve();
    },
    [],
  );

  async function finishSession() {
    const sessionData = clientSessionDataRef.current;
    if (!sessionData) {
      throw new Error("Session data missing.");
    }

    const response = await fetch("/api/gamified-test/finish-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionData.sessionId,
        demographics: sessionData.demographics,
        questionIds: sessionData.questionIds,
        events: clientEventsRef.current,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        (payload as { error?: string }).error ?? "Unable to finish session.",
      );
    }

    // Store result client-side for the result page
    sessionStorage.setItem(
      `gt_result_${sessionId}`,
      JSON.stringify(payload),
    );

    router.push(`/gamified-test/result/${sessionId}`);
  }

  function resetQuestionState() {
    setTimeLeft(QUESTION_DURATION_SECONDS);
    setStats({ clicks: 0, hits: 0, misses: 0 });
    setGridCells([]);
    setActivePrompt(null);
    setPromptCycleIndex(0);
    setPendingCorrectionChoices([]);
    setSelectedArrangementIndices([]);
    setPendingLetterReplacementIndex(null);
    setPendingReplacementTargetLetter(null);
    setTypedInput("");
    setTypedPromptSequence([]);
    setTypedPromptIndex(0);
    setTypedRoundStage("idle");
    setShowVisualSequence(false);
    setError(null);
  }

  function restartCurrentQuestion() {
    resetQuestionState();
    setPhase("voice");
  }

  function moveToNextPrompt(currentQuestion: Question) {
    const nextPrompt = shouldUseSequentialPromptCycle(currentQuestion)
      ? (() => {
          const sequence = buildPromptSequence(currentQuestion);
          const nextIndex = (promptCycleIndex + 1) % sequence.length;
          setPromptCycleIndex(nextIndex);
          return sequence[nextIndex];
        })()
      : resolveActivePrompt(currentQuestion, activePrompt?.visualCue);

    setActivePrompt(nextPrompt);
    setPendingCorrectionChoices([]);
    setSelectedArrangementIndices([]);
    setPendingLetterReplacementIndex(null);
    setPendingReplacementTargetLetter(null);
    setGridCells(
      buildAnswerOptions(currentQuestion, nextPrompt, typedKeyboardKeys),
    );
  }

  const advanceTypedRoundOrFinish = useCallback(
    (currentQuestion: Question) => {
      if (typedPromptSequence.length === 0) {
        setPhase("summary");
        return;
      }

      const hasNextRound = typedPromptIndex < typedPromptSequence.length - 1;

      if (!hasNextRound) {
        setPhase("summary");
        return;
      }

      const nextIndex = typedPromptIndex + 1;
      const nextPrompt = typedPromptSequence[nextIndex];
      setTypedPromptIndex(nextIndex);
      setActivePrompt(nextPrompt);
      setTypedInput("");
      setShowVisualSequence(false);
      setTypedRoundStage("cue");
      setTimeLeft(QUESTION_DURATION_SECONDS);
      setGridCells(
        buildAnswerOptions(currentQuestion, nextPrompt, typedKeyboardKeys),
      );
    },
    [typedPromptSequence, typedPromptIndex, typedKeyboardKeys],
  );

  const completeTypedRound = useCallback(
    (currentQuestion: Question, submittedText: string) => {
      const expected = normalizeToken(
        activePrompt?.targetToken ?? currentQuestion.targetToken,
      );
      const typed = normalizeToken(submittedText);
      const isHit = typed.length > 0 && typed === expected;

      setStats((previous) => ({
        clicks: previous.clicks,
        hits: previous.hits + (isHit ? 1 : 0),
        misses: previous.misses + (isHit ? 0 : 1),
      }));

      void postEvent(
        isHit ? "hit" : "miss",
        currentQuestion.id,
        `${typedPromptIndex}:${typed}`,
      ).catch((eventError) => {
        setError(
          eventError instanceof Error
            ? eventError.message
            : "Unexpected error.",
        );
      });

      advanceTypedRoundOrFinish(currentQuestion);
    },
    [activePrompt, typedPromptIndex, postEvent, advanceTypedRoundOrFinish],
  );

  useEffect(() => {
    if (!question || phase !== "voice" || !isSpeechReady) {
      return;
    }

    let active = true;

    async function startQuestionWithVoice() {
      setIsVoicePlaying(true);

      let voiceCompleted = false;
      if (question.audioUrl) {
        voiceCompleted = await playAudioAndWait(question.audioUrl);
      } else {
        voiceCompleted = await speakWithVoiceFallback(question.audioText);
      }

      if (!active) {
        return;
      }

      // Fallback in browsers where speech end event is unreliable.
      if (!voiceCompleted) {
        setError(voiceUnavailableMessage);
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }


      if (!active) {
        return;
      }

      if (isTypedRecallMode) {
        const promptSequence = buildPromptSequence(question);
        const firstPrompt = promptSequence[0];
        setTypedPromptSequence(promptSequence);
        setTypedPromptIndex(0);
        setTypedInput("");
        setTypedRoundStage("cue");
        setShowVisualSequence(false);
        setActivePrompt(firstPrompt);
        setGridCells(
          buildAnswerOptions(question, firstPrompt, typedKeyboardKeys),
        );
      } else {
        const initialPrompt = shouldUseSequentialPromptCycle(question)
          ? (() => {
              const sequence = buildPromptSequence(question);
              setPromptCycleIndex(0);
              return sequence[0];
            })()
          : resolveActivePrompt(question);
        setActivePrompt(initialPrompt);
        setPendingCorrectionChoices([]);
        setGridCells(
          buildAnswerOptions(question, initialPrompt, typedKeyboardKeys),
        );
      }
      setIsVoicePlaying(false);
      setPhase("active");
    }

    void startQuestionWithVoice();

    return () => {
      active = false;
    };
  }, [
    question,
    phase,
    isTypedRecallMode,
    typedKeyboardKeys,
    isSpeechReady,
    voiceUnavailableMessage,
    speakWithVoiceFallback,
  ]);

  useEffect(() => {
    if (!question || !isTypedRecallMode || phase !== "active") {
      return;
    }

    if (typedRoundStage !== "cue") {
      return;
    }

    let active = true;

    async function runTypedCue() {
      const currentPrompt =
        typedPromptSequence[typedPromptIndex] ?? activePrompt ?? null;

      if (!currentPrompt) {
        return;
      }

      setIsVoicePlaying(true);
      setTypedInput("");
      setTimeLeft(QUESTION_DURATION_SECONDS);

      if (question.id === "q30") {
        setShowVisualSequence(true);
        await new Promise((resolve) =>
          setTimeout(resolve, Q30_VISUAL_EXPOSURE_MS),
        );

        if (!active) {
          return;
        }

        setShowVisualSequence(false);
      } else {
        // Use recorded audio file if available (Q31/Q32 variants),
        // otherwise fall back to TTS.
        const voiceCompleted = currentPrompt.audioUrl
          ? await playAudioAndWait(currentPrompt.audioUrl)
          : await speakWithVoiceFallback(currentPrompt.targetToken);

        if (!active) {
          return;
        }

        if (!voiceCompleted) {
          setError(voiceUnavailableMessage);
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
      }

      if (!active) {
        return;
      }

      setIsVoicePlaying(false);
      setTypedRoundStage("input");
    }

    void runTypedCue();

    return () => {
      active = false;
    };
  }, [
    question,
    isTypedRecallMode,
    phase,
    typedRoundStage,
    typedPromptSequence,
    typedPromptIndex,
    activePrompt,
    voiceUnavailableMessage,
    speakWithVoiceFallback,
  ]);

  useEffect(() => {
    if (phase !== "active") {
      return;
    }

    if (isTypedRecallMode && typedRoundStage !== "input") {
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          if (isTypedRecallMode) {
            completeTypedRound(question, typedInput);
          } else {
            setPhase("summary");
          }
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [
    phase,
    timeLeft,
    isTypedRecallMode,
    typedRoundStage,
    question,
    typedInput,
    completeTypedRound,
  ]);

  function handleAnswerClick(clickedToken: string, answerIndex: number) {
    if (!question || phase !== "active") {
      return;
    }

    playBackgroundMusic();
    playClickSound();

    const currentTarget = activePrompt?.targetToken ?? question.targetToken;
    const interactionType = question.interactionType ?? "grid";

    if (interactionType === "typedSequenceRecall") {
      if (typedRoundStage !== "input") {
        return;
      }

      const nextTypedInput = `${typedInput}${clickedToken.toLowerCase()}`;
      setTypedInput(nextTypedInput);

      setStats((previous) => ({
        clicks: previous.clicks + 1,
        hits: previous.hits,
        misses: previous.misses,
      }));

      void postEvent(
        "click",
        question.id,
        `${typedPromptIndex}:${answerIndex}:${clickedToken}`,
      ).catch((eventError) => {
        setError(
          eventError instanceof Error
            ? eventError.message
            : "Unexpected error.",
        );
      });

      const expectedLength = normalizeToken(currentTarget).length;
      if (nextTypedInput.length >= expectedLength) {
        completeTypedRound(question, nextTypedInput);
      }

      return;
    }

    if (interactionType === "wordToLetterChoices") {
      const hasPendingChoices = pendingCorrectionChoices.length > 0;

      if (!hasPendingChoices) {
        const selectedWrongLetter =
          clickedToken.toLowerCase() === currentTarget.toLowerCase();

        void postEvent(
          "click",
          question.id,
          `${answerIndex}:${clickedToken}`,
        ).catch((eventError) => {
          setError(
            eventError instanceof Error
              ? eventError.message
              : "Unexpected error.",
          );
        });

        if (selectedWrongLetter) {
          const correctionTarget =
            activePrompt?.correctionTargetToken ??
            question.correctionTargetToken;

          if (!correctionTarget) {
            moveToNextPrompt(question);
            return;
          }

          const choices = buildFiveLetterChoices(
            correctionTarget,
            activePrompt?.correctionDistractorTokens ??
              question.correctionDistractorTokens,
          );
          setPendingCorrectionChoices(choices);
          setGridCells(choices);
          return;
        }

        setStats((previous) => ({
          clicks: previous.clicks + 1,
          hits: previous.hits,
          misses: previous.misses + 1,
        }));

        void postEvent(
          "miss",
          question.id,
          `${answerIndex}:${clickedToken}`,
        ).catch((eventError) => {
          setError(
            eventError instanceof Error
              ? eventError.message
              : "Unexpected error.",
          );
        });

        moveToNextPrompt(question);
        return;
      }

      const correctionTarget =
        activePrompt?.correctionTargetToken ?? question.correctionTargetToken;
      const isHit =
        clickedToken.toLowerCase() === (correctionTarget ?? "").toLowerCase();

      setStats((previous) => ({
        clicks: previous.clicks + 1,
        hits: previous.hits + (isHit ? 1 : 0),
        misses: previous.misses + (isHit ? 0 : 1),
      }));

      void postEvent(
        "click",
        question.id,
        `${answerIndex}:${clickedToken}`,
      ).catch((eventError) => {
        setError(
          eventError instanceof Error
            ? eventError.message
            : "Unexpected error.",
        );
      });

      void postEvent(
        isHit ? "hit" : "miss",
        question.id,
        `${answerIndex}:${clickedToken}`,
      ).catch((eventError) => {
        setError(
          eventError instanceof Error
            ? eventError.message
            : "Unexpected error.",
        );
      });

      moveToNextPrompt(question);
      return;
    }

    if (interactionType === "letterReplacement") {
      const hasPendingChoices = pendingLetterReplacementIndex !== null;

      if (!hasPendingChoices) {
        void postEvent(
          "click",
          question.id,
          `${answerIndex}:${clickedToken}`,
        ).catch((eventError) => {
          setError(
            eventError instanceof Error
              ? eventError.message
              : "Unexpected error.",
          );
        });

        const targetWord =
          activePrompt?.targetToken.toLowerCase() ??
          question.targetToken.toLowerCase();
        const correctionTarget = targetWord.charAt(answerIndex);

        if (!correctionTarget) {
          moveToNextPrompt(question);
          return;
        }

        const choices = buildFiveLetterChoices(
          correctionTarget,
          activePrompt?.correctionDistractorTokens ??
            question.correctionDistractorTokens,
        );
        setPendingLetterReplacementIndex(answerIndex);
        setPendingReplacementTargetLetter(correctionTarget);
        setGridCells(choices);
        return;
      }

      const correctionTarget = pendingReplacementTargetLetter ?? "";
      const isHit =
        clickedToken.toLowerCase() === correctionTarget.toLowerCase();

      setStats((previous) => ({
        clicks: previous.clicks + 1,
        hits: previous.hits + (isHit ? 1 : 0),
        misses: previous.misses + (isHit ? 0 : 1),
      }));

      void postEvent(
        "click",
        question.id,
        `${answerIndex}:${clickedToken}`,
      ).catch((eventError) => {
        setError(
          eventError instanceof Error
            ? eventError.message
            : "Unexpected error.",
        );
      });

      void postEvent(
        isHit ? "hit" : "miss",
        question.id,
        `${answerIndex}:${clickedToken}`,
      ).catch((eventError) => {
        setError(
          eventError instanceof Error
            ? eventError.message
            : "Unexpected error.",
        );
      });

      moveToNextPrompt(question);
      return;
    }

    if (
      interactionType === "letterArrangement" ||
      interactionType === "syllableArrangement"
    ) {
      const allOptions = gridCells;
      const currentTarget = activePrompt?.targetToken ?? question.targetToken;

      const newIndices = [...selectedArrangementIndices, answerIndex];
      const selectedTokens = newIndices.map((idx) => allOptions[idx]).join("");

      void postEvent(
        "click",
        question.id,
        `${answerIndex}:${clickedToken}`,
      ).catch((eventError) => {
        setError(
          eventError instanceof Error
            ? eventError.message
            : "Unexpected error.",
        );
      });

      const normalizedTarget = normalizeToken(currentTarget);
      const targetLength = normalizedTarget.length;
      const hasFullAttempt = selectedTokens.length >= targetLength;
      const isComplete =
        hasFullAttempt &&
        selectedTokens.toLowerCase() === normalizedTarget;

      if (isComplete) {
        setStats((previous) => ({
          clicks: previous.clicks + 1,
          hits: previous.hits + 1,
          misses: previous.misses,
        }));

        void postEvent(
          "hit",
          question.id,
          `${answerIndex}:${clickedToken}`,
        ).catch((eventError) => {
          setError(
            eventError instanceof Error
              ? eventError.message
              : "Unexpected error.",
          );
        });

        moveToNextPrompt(question);
        return;
      }

      if (hasFullAttempt && !isComplete) {
        setStats((previous) => ({
          clicks: previous.clicks + 1,
          hits: previous.hits,
          misses: previous.misses + 1,
        }));

        void postEvent(
          "miss",
          question.id,
          `${answerIndex}:${clickedToken}`,
        ).catch((eventError) => {
          setError(
            eventError instanceof Error
              ? eventError.message
              : "Unexpected error.",
          );
        });

        moveToNextPrompt(question);
        return;
      }

      setSelectedArrangementIndices(newIndices);
      return;
    }

    const isHit =
      interactionType === "sentenceWords"
        ? normalizeToken(clickedToken) === normalizeToken(currentTarget)
        : clickedToken.toLowerCase() === currentTarget.toLowerCase();

    setStats((previous) => ({
      clicks: previous.clicks + 1,
      hits: previous.hits + (isHit ? 1 : 0),
      misses: previous.misses + (isHit ? 0 : 1),
    }));

    moveToNextPrompt(question);

    void postEvent(
      "click",
      question.id,
      `${answerIndex}:${clickedToken}`,
    ).catch((eventError) => {
      setError(
        eventError instanceof Error ? eventError.message : "Unexpected error.",
      );
    });

    void postEvent(
      isHit ? "hit" : "miss",
      question.id,
      `${answerIndex}:${clickedToken}`,
    ).catch((eventError) => {
      setError(
        eventError instanceof Error ? eventError.message : "Unexpected error.",
      );
    });
  }

  async function handleContinue() {
    if (!question) {
      return;
    }

    playBackgroundMusic();

    if (mustRetakeQuestion) {
      restartCurrentQuestion();
      return;
    }

    const nextIndex = index + 1;

    if (nextIndex >= total) {
      try {
        setPhase("finishing");
        await finishSession();
      } catch (finishError) {
        setError(
          finishError instanceof Error
            ? finishError.message
            : "Unexpected error.",
        );
        setPhase("summary");
      }
      return;
    }

    resetQuestionState();
    setPhase("voice");
    setIndex(nextIndex);
  }

  async function handleSkip() {
    if (!question) {
      return;
    }

    playBackgroundMusic();

    setError(null);

    if (isLastQuestion) {
      try {
        setPhase("finishing");
        await finishSession();
      } catch (finishError) {
        setError(
          finishError instanceof Error
            ? finishError.message
            : "Unexpected error.",
        );
        setPhase("summary");
      }
      return;
    }

    resetQuestionState();
    setPhase("voice");
    setIndex((previous) => previous + 1);
  }

  if (questionSetLoading) {
    return (
      <main
        className="mx-auto max-w-4xl px-6 py-16"
        dir={isArabicExam ? "rtl" : "ltr"}
      >
        <p className="text-slate-700">{copy.loadQuestionSet}</p>
      </main>
    );
  }

  if (!question) {
    return (
      <main
        className="mx-auto max-w-4xl px-6 py-16"
        dir={isArabicExam ? "rtl" : "ltr"}
      >
        <p className="text-red-700">{copy.noQuestionFound}</p>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </main>
    );
  }

  if (phase === "voice") {
    return (
      <main
        className="relative h-dvh w-full overflow-hidden"
        dir={isArabicExam ? "rtl" : "ltr"}
      >
        {/* Background — Gemini only in gamified theme, solid white in light theme */}
        {!isLightTheme && (
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/gamified-test/Gemini_background.png')" }}
          />
        )}
        {!isLightTheme && <div aria-hidden className="absolute inset-0 bg-black/12" />}
        {isLightTheme && <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 40%, #f0ede5 0%, #e8e4da 60%, #ddd9cf 100%)" }} />}

        <div className="relative z-10 mx-auto flex h-full w-full max-w-3xl items-center justify-center px-6 py-10">
          <div className={`w-full rounded-3xl p-10 text-center ${
              !isLightTheme
                ? "border border-sky-100 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
                : "border border-[#c8c4b8] bg-[#faf8f4] shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
            }`}>
            <p className={`text-sm font-medium ${ !isLightTheme ? "text-slate-500" : "text-[#7a7567]" }`}>
              {question.title} ({index + 1}/{total})
            </p>
            <h1 className={`mt-4 text-3xl font-semibold ${ !isLightTheme ? "text-slate-800" : "text-[#2d2a24]" }`}>
              {copy.listenHeading}
            </h1>
            <p className={`mt-3 ${ !isLightTheme ? "text-slate-500" : "text-[#7a7567]" }`}>
              {isSpeechReady ? copy.voiceHint : copy.unlockVoiceHint}
            </p>
            {!isSpeechReady ? (
              <button
                type="button"
                onClick={handleEnableSpeech}
                disabled={isEnablingSpeech}
                className={`mt-5 inline-flex rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${
                  !isLightTheme
                    ? "border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
                    : "border border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                }`}
              >
                {isEnablingSpeech ? copy.enablingVoiceButton : copy.enableVoiceButton}
              </button>
            ) : null}
            {isSpeechReady && isVoicePlaying ? (
              <p className={`mt-5 text-sm ${ !isLightTheme ? "text-slate-400" : "text-[#9a9287]" }`}>{copy.audioPlaying}</p>
            ) : null}
            {error ? (
              <p className={`mt-4 text-sm ${ !isLightTheme ? "text-amber-600" : "text-amber-700" }`}>{error}</p>
            ) : null}
            {SHOW_SKIP_BUTTON ? (
              <button
                type="button"
                onClick={handleSkip}
                className={`mt-8 inline-flex rounded-lg px-4 py-2 text-sm font-semibold ${
                  !isLightTheme
                    ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    : "border border-[#c8c4b8] bg-white text-[#7a7567] hover:bg-[#f0ede5]"
                }`}
              >
                {copy.skipTesting}
              </button>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  if (phase === "summary" || phase === "finishing") {
    return (
      <main
        className="relative h-dvh w-full overflow-hidden"
        dir={isArabicExam ? "rtl" : "ltr"}
      >
        {/* Background — Gemini only in gamified theme, solid white in light theme */}
        {!isLightTheme && (
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/gamified-test/Gemini_background.png')" }}
          />
        )}
        {!isLightTheme && <div aria-hidden className="absolute inset-0 bg-black/18" />}
        {isLightTheme && <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 40%, #f0ede5 0%, #e8e4da 60%, #ddd9cf 100%)" }} />}

        <div className="relative z-10 mx-auto flex h-full w-full max-w-3xl items-center justify-center px-6 py-10">
          <div className={`w-full max-w-md rounded-2xl p-8 text-center ${
              !isLightTheme
                ? "border border-sky-100 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
                : "border border-[#c8c4b8] bg-[#faf8f4] shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
            }`}>
            <p className={`text-sm font-medium ${ !isLightTheme ? "text-slate-500" : "text-[#7a7567]" }`}>
              {question.title} {copy.completeLabel}
            </p>
            <h1 className={`mt-4 text-3xl font-semibold ${ !isLightTheme ? "text-slate-800" : "text-[#2d2a24]" }`}>
              {copy.pointsPrefix} {score} {copy.pointsSuffix}
            </h1>
            <p className={`mt-2 ${ !isLightTheme ? "text-slate-500" : "text-[#7a7567]" }`}>
              {copy.progressPrefix} {progressPercent}%
            </p>

            {mustRetakeQuestion ? (
              <p className={`mt-3 text-sm font-medium ${ !isLightTheme ? "text-amber-600" : "text-amber-700" }`}>
                {copy.noClicks}
              </p>
            ) : null}

            <div className={`mx-auto mt-6 flex h-24 w-24 items-center justify-center rounded-full border-8 text-lg font-semibold ${
              !isLightTheme
                ? "border-sky-200 bg-sky-50 text-sky-600"
                : "border-[#b8c9a8] bg-[#f0f5ec] text-[#5a7a48]"
            }`}>
              {progressPercent}%
            </div>

            {error ? (
              <p className={`mt-4 text-sm ${ !isLightTheme ? "text-red-300" : "text-red-700" }`}>{error}</p>
            ) : null}

            <button
              type="button"
              disabled={phase === "finishing"}
              onClick={handleContinue}
              className={`mt-8 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                !isLightTheme
                  ? "bg-sky-500 border border-sky-400 text-white hover:bg-sky-600"
                  : "bg-[#51513d] border border-[#51513d] text-[#e3dcc2] hover:bg-[#3d3d2d]"
              }`}
            >
              {phase === "finishing"
                ? copy.finishing
                : mustRetakeQuestion
                  ? copy.retake
                  : isLastQuestion
                    ? copy.viewResult
                    : copy.continue}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const effectiveGridSize = getEffectiveGridSize(question.gridSize);
  const cellSide = getCellSide(effectiveGridSize);
  const timeProgress = getTimeProgress(timeLeft);
  const isClassicGridMode = interactionType === "grid";
  const isWordCorrectionChoiceMode =
    interactionType === "wordToLetterChoices" &&
    pendingCorrectionChoices.length > 0;
  const isLetterReplacementChoiceMode =
    interactionType === "letterReplacement" &&
    pendingLetterReplacementIndex !== null;
  const isArrangementMode =
    interactionType === "letterArrangement" ||
    interactionType === "syllableArrangement";
  const isSentenceSegmentationMode =
    interactionType === "sentenceSegmentationChoices";
  const sentenceTokens =
    interactionType === "sentenceWords"
      ? (activePrompt?.visualCue ?? question.visualCue ?? "")
          .split(/\s+/)
          .filter((token) => token.length > 0)
      : [];
  const showCueBox =
    interactionType !== "sentenceWords" &&
    interactionType !== "wordLetters" &&
    interactionType !== "wordToLetterChoices" &&
    interactionType !== "letterReplacement" &&
    interactionType !== "letterArrangement" &&
    interactionType !== "syllableArrangement" &&
    interactionType !== "typedSequenceRecall";

  const selectedArrangementTokens =
    isArrangementMode && gridCells.length > 0
      ? selectedArrangementIndices.map((idx) => gridCells[idx])
      : [];

  const typedExpectedLength = normalizeToken(
    activePrompt?.targetToken ?? question.targetToken,
  ).length;
  const typedPromptProgress = `${typedPromptIndex + 1}/${Math.max(typedPromptSequence.length, 1)}`;
  const typedDisplayValue = showVisualSequence
    ? (activePrompt?.visualCue ?? "") // keep original spacing for memorization display
    : typedInput;


  return (
    <main
      className="relative h-dvh w-full overflow-hidden"
      dir={isArabicExam ? "rtl" : "ltr"}
    >
      {/* Background: only shown in dark (default) theme */}
      {!isLightTheme && (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/gamified-test/Gemini_background.png')" }}
        />
      )}
      {!isLightTheme && (
        <div aria-hidden className="absolute inset-0 bg-black/12" />
      )}
      {isLightTheme && (
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 40%, #f0ede5 0%, #e8e4da 60%, #ddd9cf 100%)" }} />
      )}

      {SHOW_SKIP_BUTTON ? (
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2 sm:left-7 sm:top-6">
          <button
            type="button"
            onClick={handleSkip}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              !isLightTheme
                ? "border border-white/25 bg-white/90 text-slate-700 hover:bg-white"
                : "border border-[#c8c4b8] bg-[#faf8f4] text-[#7a7567] hover:bg-[#f0ede5]"
            }`}
          >
            {copy.skip}
          </button>
          <button
            type="button"
            onClick={toggleBackgroundMusicMute}
            title={isBackgroundMusicMuted ? "Unmute music" : "Mute music"}
            className={`rounded-lg p-2 transition-colors ${
              !isLightTheme
                ? "border border-white/25 bg-white/90 text-slate-700 hover:bg-white"
                : "border border-[#c8c4b8] bg-[#faf8f4] text-[#7a7567] hover:bg-[#f0ede5]"
            }`}
          >
            {isBackgroundMusicMuted
              ? <VolumeX className="w-4 h-4" />
              : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      ) : null}

      <div className="absolute right-4 top-4 z-20 sm:right-7 sm:top-6">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full p-1.5"
          style={{
            background: isLightTheme
              ? `conic-gradient(#5a7a48 ${timeProgress}%, #c8d8bc ${timeProgress}% 100%)`
              : `conic-gradient(#18a7d3 ${timeProgress}%, #9dd2ea ${timeProgress}% 100%)`,
          }}
        >
          <div className={`flex h-full w-full items-center justify-center rounded-full ${
            isLightTheme ? "bg-[#faf8f4] text-[#2d2a24]" : "bg-white text-slate-700"
          }`}>
            <span className="text-xl font-semibold leading-none">{score}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex h-full w-full items-center justify-center px-3 py-3 sm:px-6 sm:py-6">
        <div className="flex flex-col items-center gap-7 sm:gap-9">
          {showCueBox && (activePrompt?.visualCue || question.visualCue) ? (
            <div
              className={getVisualCueClassName(
                activePrompt?.visualCue ?? question.visualCue ?? "",
              )}
            >
              {activePrompt?.visualCue ?? question.visualCue}
            </div>
          ) : null}

          {interactionType === "typedSequenceRecall" ? (
            <>
              <div className={`rounded-xl px-8 py-5 text-center sm:min-w-105 ${
                !isLightTheme
                  ? "border border-sky-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
                  : "border border-[#c8c4b8] bg-[#faf8f4] shadow-[0_4px_16px_rgba(0,0,0,0.07)] text-[#2d2a24]"
              }`}>
                <div className={`text-xs font-semibold uppercase tracking-[0.12em] ${ !isLightTheme ? "text-slate-400" : "text-[#9a9287]" }`}>
                  {`Round ${typedPromptProgress}`}
                </div>
                <div className={`mt-2 min-h-14 text-4xl tracking-[0.24em] sm:text-5xl ${ !isLightTheme ? "text-slate-800" : "" }`}>
                  {typedDisplayValue}
                </div>
                {isVoicePlaying && typedRoundStage === "cue" ? (
                  <p className={`mt-2 text-sm ${ !isLightTheme ? "text-slate-400" : "text-[#9a9287]" }`}>
                    {copy.memorizeAndType}
                  </p>
                ) : null}
                {typedRoundStage === "input" ? (
                  <p className={`mt-2 text-sm ${ !isLightTheme ? "text-slate-400" : "text-[#9a9287]" }`}>
                    {copy.typedPrefix} {typedInput.length}/{typedExpectedLength}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col items-center gap-2">
                {typedKeyboardRows.map((row, rowIndex) => (
                  <div
                    key={`kb-row-${rowIndex}`}
                    className="grid gap-2 sm:gap-2.5"
                    style={{
                      gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {row.map((keyToken) => (
                      <button
                        key={`kb-${rowIndex}-${keyToken}`}
                        type="button"
                        disabled={typedRoundStage !== "input"}
                        onClick={() =>
                          handleAnswerClick(
                            keyToken,
                            typedKeyboardKeys.indexOf(keyToken),
                          )
                        }
                        className={`rounded-sm border px-2 font-bold leading-tight text-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          isLightTheme
                            ? "border-2 border-sky-300 bg-white hover:bg-sky-50"
                            : "border-sky-200 bg-white hover:bg-sky-50"
                        }`}
                        style={{
                          width: "min(12.5vw, 8.8vh)",
                          height: "min(12.5vw, 8.8vh)",
                          fontSize: "clamp(1.25rem, 2.4vw, 1.8rem)",
                        }}
                      >
                        {keyToken}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          ) : interactionType === "letterReplacement" ? (
            <>
              <div className="rounded-sm border border-sky-200 bg-white px-6 py-4 text-center text-slate-700 sm:px-8 sm:py-5">
                <div className="inline-flex items-center text-4xl sm:text-5xl">
                  {buildWordLetterChoices(
                    activePrompt?.visualCue ?? question.visualCue,
                  ).map((letter, letterIndex) => (
                    <button
                      key={`${index}-word-${letterIndex}-${letter}`}
                      type="button"
                      onClick={() => handleAnswerClick(letter, letterIndex)}
                      className={`relative border-b-2 px-0.5 font-semibold leading-none transition ${
                        pendingLetterReplacementIndex === letterIndex
                          ? "border-sky-500 text-sky-700"
                          : "border-transparent text-slate-700 hover:border-sky-300"
                      }`}
                      style={{
                        fontSize: "clamp(1.6rem, 4.2vw, 3rem)",
                      }}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>
              {isLetterReplacementChoiceMode && (
                <div
                  className="grid gap-1.5 sm:gap-2"
                  style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
                >
                  {gridCells.map((cell, cellIndex) => (
                    <button
                      key={`${index}-choice-${cellIndex}-${cell}`}
                      type="button"
                      onClick={() => handleAnswerClick(cell, cellIndex)}
                      className={`rounded-sm border px-1 font-bold leading-tight text-black transition ${
                          isLightTheme
                            ? "border-2 border-sky-300 bg-white hover:bg-sky-50"
                            : "border-sky-200 bg-white hover:bg-sky-50"
                        }`}
                      style={{
                        ...getSyllableTileSize(cell.length),
                      }}
                    >
                      {cell}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : isArrangementMode ? (
            <>
              {selectedArrangementTokens.length > 0 && (
                <div className="rounded-sm border border-sky-200 bg-sky-50 px-8 py-4 text-center text-3xl tracking-widest text-slate-700 sm:text-4xl">
                  {selectedArrangementTokens.join("")}
                </div>
              )}
              <div
                className="grid gap-1.5 sm:gap-2"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(gridCells.length, 1)}, minmax(0, 1fr))`,
                }}
              >
                {gridCells.map((cell, cellIndex) => {
                  const isSelected =
                    selectedArrangementIndices.includes(cellIndex);
                  return (
                    <button
                      key={`${index}-arrange-${cellIndex}-${cell}`}
                      type="button"
                      onClick={() => handleAnswerClick(cell, cellIndex)}
                      disabled={isSelected}
                      className={`rounded-sm border-2 px-1 font-semibold leading-tight transition ${
                        isSelected
                          ? "border-sky-500 bg-sky-100 text-sky-400 cursor-not-allowed"
                          : "border-sky-200 bg-white text-slate-800 hover:bg-sky-50"
                      }`}
                      style={{
                        ...getSyllableTileSize(cell.length),
                      }}
                    >
                      {cell}
                    </button>
                  );
                })}
              </div>
            </>
          ) : interactionType === "sentenceWords" ? (
            <div className="w-full max-w-5xl rounded-sm border border-sky-200 bg-white px-5 py-4 text-center leading-relaxed sm:px-8 sm:py-5">
              {sentenceTokens.map((token, tokenIndex) => (
                <button
                  key={`${index}-${tokenIndex}-${token}`}
                  type="button"
                  onClick={() => handleAnswerClick(token, tokenIndex)}
                  className="mx-1 my-1 inline rounded px-1 py-0.5 text-2xl text-slate-600 hover:bg-sky-50"
                >
                  {token}
                </button>
              ))}
            </div>
          ) : (
            <div
              className={
                isClassicGridMode
                  ? "grid gap-2.5 sm:gap-3"
                  : "grid gap-1.5 sm:gap-2"
              }
              style={{
                gridTemplateColumns:
                  interactionType === "letterChoices"
                    ? `repeat(${question.choiceCount ?? 5}, minmax(0, 1fr))`
                    : isSentenceSegmentationMode
                      ? "repeat(1, minmax(0, 1fr))"
                      : isWordCorrectionChoiceMode
                        ? "repeat(5, minmax(0, 1fr))"
                        : interactionType === "wordLetters" ||
                            interactionType === "wordToLetterChoices"
                          ? `repeat(${Math.max(gridCells.length, 1)}, minmax(0, 1fr))`
                          : `repeat(${effectiveGridSize}, minmax(0, 1fr))`,
              }}
            >
              {gridCells.map((cell, cellIndex) => (
                <button
                  key={`${index}-${cellIndex}-${cell}`}
                  type="button"
                  onClick={() => handleAnswerClick(cell, cellIndex)}
                  className={
                    isClassicGridMode
                      ? isLightTheme
                        ? "rounded-xl border-2 border-sky-300 bg-white px-1 text-center font-bold leading-none text-black shadow-sm transition active:scale-95 hover:bg-sky-50"
                        : "rounded-2xl border-[3px] border-[#73a8d9] bg-linear-to-b from-[#eaf5ff] to-[#cfe7ff] px-1 text-center font-semibold leading-none text-[#0a5f87] shadow-[inset_0_2px_0_rgba(255,255,255,0.9),0_4px_0_rgba(110,155,196,0.72),0_10px_18px_rgba(0,0,0,0.24)] transition active:scale-95"
                      : isLightTheme
                      ? "rounded-lg border-2 border-sky-300 bg-white px-1 text-center font-bold leading-tight text-black transition hover:bg-sky-50"
                      : "rounded-sm border border-sky-200 bg-white px-1 text-center font-semibold leading-tight text-slate-800 transition hover:bg-sky-50"
                  }
                  style={{
                    width:
                      interactionType === "letterChoices" ||
                      interactionType === "wordLetters" ||
                      interactionType === "wordToLetterChoices"
                        ? "min(11vw, 7.8vh)"
                        : isSentenceSegmentationMode
                          ? "min(88vw, 56rem)"
                          : cell.length > 3
                            ? "min(22vw, 9rem)"
                            : cellSide,
                    height:
                      interactionType === "letterChoices" ||
                      interactionType === "wordLetters" ||
                      interactionType === "wordToLetterChoices"
                        ? "min(11vw, 7.8vh)"
                        : isSentenceSegmentationMode
                          ? "auto"
                          : cell.length > 3
                            ? "min(15vw, 6.2rem)"
                            : cellSide,
                    fontSize:
                      interactionType === "wordLetters" ||
                      interactionType === "wordToLetterChoices"
                        ? "clamp(1.1rem, 2vw, 1.45rem)"
                        : isSentenceSegmentationMode
                          ? "clamp(1.05rem, 1.9vw, 1.45rem)"
                          : cell.length > 3
                            ? "clamp(0.95rem, 1.8vw, 1.28rem)"
                            : getTokenFontSize(cell.length),
                    padding: isSentenceSegmentationMode
                      ? "0.8rem 1rem"
                      : cell.length > 3
                        ? "0.35rem"
                        : undefined,
                    whiteSpace:
                      isSentenceSegmentationMode || cell.length > 3
                        ? "normal"
                        : "nowrap",
                    overflow: cell.length > 3 ? "visible" : "hidden",
                    textOverflow: cell.length > 3 ? "unset" : "clip",
                  }}
                >
                  {cell}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-20 flex justify-center px-4">
        <div style={{ minHeight: "1.25rem" }}>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      </div>
    </main>
  );
}
