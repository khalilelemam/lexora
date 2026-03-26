"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QUESTION_BANK } from "@/lib/questions";
import { Question } from "@/lib/types";
import { speakTextAndWait } from "@/lib/voice";

const QUESTION_DURATION_SECONDS = 15;
const LETTER_POOL = "abcdefghijklmnopqrstuvwxyz";
const TARGET_REPEAT_COUNT = 3;
const SHOW_SKIP_BUTTON = false;
const Q30_VISUAL_EXPOSURE_MS = 3000;
const TYPE_KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];
const TYPE_KEYBOARD_KEYS = TYPE_KEYBOARD_ROWS.flat();

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
};

function normalizeToken(token: string) {
  return token.toLowerCase().replace(/[^a-z]/g, "");
}

function shuffleArray<T>(values: T[]) {
  const items = [...values];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
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
    const fallback = LETTER_POOL.split("").filter(
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

function buildAnswerOptions(question: Question, prompt: ActivePrompt) {
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
    return TYPE_KEYBOARD_KEYS;
  }

  if (interactionType === "grid") {
    return generateGrid(
      question.gridSize,
      prompt.targetToken,
      prompt.distractorTokens,
      question.targetRepeatCount,
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
    const fallback = LETTER_POOL.split("").filter(
      (token) => token !== normalizedCorrect && !pool.includes(token),
    );
    pool.push(...fallback.slice(0, 4 - pool.length));
  }

  return shuffleArray([normalizedCorrect, ...pool.slice(0, 4)]);
}

function getVisualCueClassName(visualCue: string) {
  const isSentenceLike = visualCue.includes(" ") || visualCue.length > 16;

  if (isSentenceLike) {
    return "w-full max-w-5xl rounded-sm border border-sky-200 bg-white px-5 py-4 text-center text-base leading-relaxed tracking-normal text-slate-600 sm:px-8 sm:py-5 sm:text-xl";
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
  };
}

function getDefaultDistractorPool(targetToken: string) {
  if (targetToken.length === 1) {
    return LETTER_POOL.split("").filter(
      (token) => token !== targetToken.toLowerCase(),
    );
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

  while (targetIndexes.size < targetCount) {
    targetIndexes.add(Math.floor(Math.random() * cellsCount));
  }

  targetIndexes.forEach((targetIndex) => {
    cells[targetIndex] = targetToken.toLowerCase();
  });

  return cells;
}

function getCellSide(gridSize: number) {
  if (gridSize >= 6) {
    return "min(12.6vw, 9.2vh)";
  }
  if (gridSize === 5) {
    return "min(13.8vw, 10.2vh)";
  }
  if (gridSize === 4) {
    return "min(16.5vw, 11.8vh)";
  }
  return "min(19.5vw, 14vh)";
}

function getTokenFontSize(tokenLength: number) {
  if (tokenLength >= 8) {
    return "clamp(0.9rem, 1.5vw, 1.2rem)";
  }
  if (tokenLength >= 7) {
    return "clamp(0.98rem, 1.65vw, 1.28rem)";
  }
  if (tokenLength >= 6) {
    return "clamp(1.06rem, 1.8vw, 1.38rem)";
  }
  if (tokenLength >= 5) {
    return "clamp(1.14rem, 1.95vw, 1.48rem)";
  }
  if (tokenLength >= 4) {
    return "clamp(1.22rem, 2.1vw, 1.62rem)";
  }
  return "clamp(1.34rem, 2.4vw, 1.82rem)";
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
  const sessionId = params.sessionId;

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
  const [typedPromptIndex, setTypedPromptIndex] = useState(0);
  const [typedRoundStage, setTypedRoundStage] = useState<
    "idle" | "cue" | "input"
  >("idle");
  const [showVisualSequence, setShowVisualSequence] = useState(false);

  const question = useMemo(() => QUESTION_BANK[index], [index]);
  const total = QUESTION_BANK.length;
  const score = stats.hits;
  const progressPercent = Math.round(((index + 1) / total) * 100);
  const isLastQuestion = index + 1 === total;
  const mustRetakeQuestion = stats.clicks === 0;
  const interactionType = question?.interactionType ?? "grid";
  const isTypedRecallMode = interactionType === "typedSequenceRecall";

  async function postEvent(
    eventType: "click" | "hit" | "miss",
    questionId: string,
    optionId?: string,
  ) {
    const response = await fetch(`/api/session/${sessionId}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, questionId, optionId }),
    });

    if (!response.ok) {
      throw new Error("Unable to save event.");
    }
  }

  async function finishSession() {
    const response = await fetch(`/api/session/${sessionId}/finish`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Unable to finish session.");
    }

    router.push(`/result/${sessionId}`);
  }

  function resetQuestionState() {
    setTimeLeft(QUESTION_DURATION_SECONDS);
    setStats({ clicks: 0, hits: 0, misses: 0 });
    setGridCells([]);
    setActivePrompt(null);
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
    const nextPrompt = resolveActivePrompt(
      currentQuestion,
      activePrompt?.visualCue,
    );
    setActivePrompt(nextPrompt);
    setPendingCorrectionChoices([]);
    setSelectedArrangementIndices([]);
    setPendingLetterReplacementIndex(null);
    setPendingReplacementTargetLetter(null);
    setGridCells(buildAnswerOptions(currentQuestion, nextPrompt));
  }

  function advanceTypedRoundOrFinish(currentQuestion: Question) {
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
    setGridCells(buildAnswerOptions(currentQuestion, nextPrompt));
  }

  function completeTypedRound(
    currentQuestion: Question,
    submittedText: string,
  ) {
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
        eventError instanceof Error ? eventError.message : "Unexpected error.",
      );
    });

    advanceTypedRoundOrFinish(currentQuestion);
  }

  useEffect(() => {
    if (!question || phase !== "voice") {
      return;
    }

    let active = true;

    async function startQuestionWithVoice() {
      setIsVoicePlaying(true);
      const voiceCompleted = await speakTextAndWait(question.audioText);

      if (!active) {
        return;
      }

      // Fallback in browsers where speech end event is unreliable.
      if (!voiceCompleted) {
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
        setGridCells(buildAnswerOptions(question, firstPrompt));
      } else {
        const initialPrompt = resolveActivePrompt(question);
        setActivePrompt(initialPrompt);
        setPendingCorrectionChoices([]);
        setGridCells(buildAnswerOptions(question, initialPrompt));
      }
      setIsVoicePlaying(false);
      setPhase("active");
    }

    void startQuestionWithVoice();

    return () => {
      active = false;
    };
  }, [question, phase, isTypedRecallMode]);

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
        const voiceCompleted = await speakTextAndWait(
          currentPrompt.targetToken,
        );

        if (!active) {
          return;
        }

        if (!voiceCompleted) {
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
  ]);

  function handleAnswerClick(clickedToken: string, answerIndex: number) {
    if (!question || phase !== "active") {
      return;
    }

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

      const targetLength = currentTarget.length;
      const hasFullAttempt = selectedTokens.length >= targetLength;
      const isComplete =
        hasFullAttempt &&
        selectedTokens.toLowerCase() === currentTarget.toLowerCase();

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

  if (!question) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-red-700">No question found.</p>
      </main>
    );
  }

  if (phase === "voice") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-10">
        <div className="w-full rounded-3xl border border-sky-100 bg-white/95 p-10 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            {question.title} ({index + 1}/{total})
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-800">Listen</h1>
          <p className="mt-3 text-slate-500">
            The task will appear after the voice instruction.
          </p>
          {isVoicePlaying ? (
            <p className="mt-5 text-sm text-slate-400">Audio is playing...</p>
          ) : null}

          {SHOW_SKIP_BUTTON ? (
            <button
              type="button"
              onClick={handleSkip}
              className="mt-8 inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Skip (testing)
            </button>
          ) : null}
        </div>
      </main>
    );
  }

  if (phase === "summary" || phase === "finishing") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-2xl border border-sky-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            {question.title} complete
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-800">
            You got {score} points
          </h1>
          <p className="mt-2 text-slate-500">Progress: {progressPercent}%</p>

          {mustRetakeQuestion ? (
            <p className="mt-3 text-sm font-medium text-amber-700">
              No clicks were detected. Please retake this question.
            </p>
          ) : null}

          <div className="mx-auto mt-6 flex h-24 w-24 items-center justify-center rounded-full border-8 border-sky-200 text-lg font-semibold text-sky-700">
            {progressPercent}%
          </div>

          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

          <button
            type="button"
            disabled={phase === "finishing"}
            onClick={handleContinue}
            className="mt-8 inline-flex w-full items-center justify-center rounded-lg border border-sky-300 bg-white px-4 py-3 font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {phase === "finishing"
              ? "Finishing..."
              : mustRetakeQuestion
                ? "Retake Question"
                : isLastQuestion
                  ? "View Final Result"
                  : "Continue"}
          </button>
        </div>
      </main>
    );
  }

  const cellSide = getCellSide(question.gridSize);
  const timeProgress = getTimeProgress(timeLeft);
  const activeTokenLength =
    activePrompt?.targetToken.length ?? question.targetToken.length;
  const tokenFontSize = getTokenFontSize(activeTokenLength);
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
    ? (activePrompt?.visualCue ?? "").replace(/\s+/g, "")
    : typedInput;

  const timerCircleStyle = {
    background: `conic-gradient(#18a7d3 ${timeProgress}%, #9dd2ea ${timeProgress}% 100%)`,
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      {SHOW_SKIP_BUTTON ? (
        <div className="absolute left-4 top-4 z-20 sm:left-7 sm:top-6">
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Skip
          </button>
        </div>
      ) : null}

      <div className="absolute right-4 top-4 z-20 sm:right-7 sm:top-6">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full p-1.5"
          style={timerCircleStyle}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-slate-700">
            <span className="text-xl font-semibold leading-none">{score}</span>
          </div>
        </div>
      </div>

      <div className="flex h-full w-full items-center justify-center px-3 py-3 sm:px-6 sm:py-6">
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
              <div className="rounded-sm border border-sky-200 bg-white px-8 py-5 text-center text-slate-700 sm:min-w-105">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Round {typedPromptProgress}
                </div>
                <div className="mt-2 min-h-14 text-4xl tracking-[0.24em] text-slate-700 sm:text-5xl">
                  {typedDisplayValue}
                </div>
                {isVoicePlaying && typedRoundStage === "cue" ? (
                  <p className="mt-2 text-sm text-slate-400">
                    Memorize and type
                  </p>
                ) : null}
                {typedRoundStage === "input" ? (
                  <p className="mt-2 text-sm text-slate-400">
                    Typed {typedInput.length}/{typedExpectedLength}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col items-center gap-2">
                {TYPE_KEYBOARD_ROWS.map((row, rowIndex) => (
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
                            TYPE_KEYBOARD_KEYS.indexOf(keyToken),
                          )
                        }
                        className="rounded-sm border border-sky-200 bg-white px-2 font-semibold leading-tight text-slate-800 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                      className="rounded-sm border border-sky-200 bg-white px-1 font-semibold leading-tight text-slate-800 transition hover:bg-sky-50"
                      style={{
                        width: "min(11.5vw, 8vh)",
                        height: "min(11.5vw, 8vh)",
                        fontSize: "clamp(1.2rem, 2.2vw, 1.6rem)",
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
                        width:
                          cell.length > 3
                            ? "min(14vw, 10vh)"
                            : "min(11.5vw, 8vh)",
                        height:
                          cell.length > 3
                            ? "min(14vw, 10vh)"
                            : "min(11.5vw, 8vh)",
                        fontSize:
                          cell.length > 3
                            ? "clamp(1rem, 1.9vw, 1.35rem)"
                            : "clamp(1.2rem, 2.2vw, 1.6rem)",
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
              className="grid gap-1.5 sm:gap-2"
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
                          : `repeat(${question.gridSize}, minmax(0, 1fr))`,
              }}
            >
              {gridCells.map((cell, cellIndex) => (
                <button
                  key={`${index}-${cellIndex}-${cell}`}
                  type="button"
                  onClick={() => handleAnswerClick(cell, cellIndex)}
                  className="rounded-sm border border-sky-200 bg-white px-1 text-center font-semibold leading-tight text-slate-800 transition hover:bg-sky-50"
                  style={{
                    width:
                      interactionType === "letterChoices" ||
                      interactionType === "wordLetters" ||
                      interactionType === "wordToLetterChoices"
                        ? "min(11.5vw, 8vh)"
                        : isSentenceSegmentationMode
                          ? "min(88vw, 56rem)"
                          : cell.length > 3
                            ? "min(22vw, 9rem)"
                            : cellSide,
                    height:
                      interactionType === "letterChoices" ||
                      interactionType === "wordLetters" ||
                      interactionType === "wordToLetterChoices"
                        ? "min(11.5vw, 8vh)"
                        : isSentenceSegmentationMode
                          ? "auto"
                          : cell.length > 3
                            ? "min(15vw, 6.2rem)"
                            : cellSide,
                    fontSize:
                      interactionType === "wordLetters" ||
                      interactionType === "wordToLetterChoices"
                        ? "clamp(1.2rem, 2.2vw, 1.6rem)"
                        : isSentenceSegmentationMode
                          ? "clamp(1.05rem, 1.9vw, 1.45rem)"
                          : cell.length > 3
                            ? "clamp(0.95rem, 1.8vw, 1.28rem)"
                            : tokenFontSize,
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

      <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center px-4">
        <div style={{ minHeight: "1.25rem" }}>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      </div>
    </main>
  );
}
