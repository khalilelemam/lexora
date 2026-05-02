import {
  Demographics,
  QuestionMetrics,
  SessionEvent,
  SessionResult,
} from "@/features/gamified-test/lib/types";

// Q30–Q32 use typedSequenceRecall: every keystroke is a "click" but each
// completed word attempt is one "hit" or "miss".  Using hits/clicks would
// produce a meaninglessly low accuracy (keystrokes >> rounds).
// Instead, accuracy = hits / rounds  where rounds = hits + misses.
// This gives 1.0 when all words are correct, 0.25 when 1 of 4 is correct, etc.
const TYPED_RECALL_QUESTION_IDS = new Set(["q30", "q31", "q32"]);

export function buildQuestionMetrics(
  events: SessionEvent[],
  questionIds: number[],
): QuestionMetrics[] {
  return questionIds.map((questionId) => {
    const questionKey = `q${questionId}`;
    const qEvents = events.filter((event) => event.questionId === questionKey);
    const clicks = qEvents.filter(
      (event) => event.eventType === "click",
    ).length;
    const hits = qEvents.filter((event) => event.eventType === "hit").length;
    const misses = qEvents.filter((event) => event.eventType === "miss").length;
    const score = hits;

    const isTypedRecall = TYPED_RECALL_QUESTION_IDS.has(questionKey);
    const rounds = hits + misses; // completed word attempts

    const accuracy = isTypedRecall
      ? rounds > 0 ? hits / rounds : 0        // e.g. 1/4 = 0.25, 4/4 = 1.0
      : clicks > 0 ? hits / clicks : 0;

    const missrate = isTypedRecall
      ? rounds > 0 ? misses / rounds : 0
      : clicks > 0 ? misses / clicks : 0;

    return {
      questionId: questionKey,
      clicks,
      hits,
      misses,
      score,
      accuracy,
      missrate,
    };
  });
}

function toBinary(value: boolean) {
  return value ? 1 : 0;
}

function toGenderBinary(gender: Demographics["gender"]) {
  return gender === "male" ? 1 : 0;
}

function toRiskLevel(probability: number, threshold: number) {
  if (probability >= threshold * 2) {
    return "high" as const;
  }

  if (probability >= threshold) {
    return "moderate" as const;
  }

  return "low" as const;
}

export function buildModelFeaturePayload(
  demographics: Demographics,
  metrics: QuestionMetrics[],
) {
  const payload: Record<string, number> = {
    Gender: toGenderBinary(demographics.gender),
    Nativelang: toBinary(demographics.nativeLang),
    Otherlang: toBinary(demographics.otherLang),
    Age: demographics.age,
  };

  metrics.forEach((metric) => {
    const questionNumber = Number(metric.questionId.replace(/^q/i, ""));
    if (!Number.isInteger(questionNumber) || questionNumber <= 0) {
      return;
    }

    payload[`Clicks${questionNumber}`] = metric.clicks;
    payload[`Hits${questionNumber}`] = metric.hits;
    payload[`Misses${questionNumber}`] = metric.misses;
    payload[`Score${questionNumber}`] = metric.score;
    payload[`Accuracy${questionNumber}`] = metric.accuracy;
    payload[`Missrate${questionNumber}`] = metric.missrate;
  });

  return payload;
}

export function buildSessionResultFromProbability(
  probability: number,
  threshold: number,
  metrics: QuestionMetrics[],
  options?: {
    label?: string;
    modelSource?: "fastapi" | "fallback";
    modelVersion?: string;
  },
): SessionResult {
  const riskDetected = probability >= threshold;

  return {
    probability,
    threshold,
    riskDetected,
    riskLevel: toRiskLevel(probability, threshold),
    label: options?.label ?? "Dyslexia Risk",
    metrics,
    modelSource: options?.modelSource,
    modelVersion: options?.modelVersion,
  };
}
