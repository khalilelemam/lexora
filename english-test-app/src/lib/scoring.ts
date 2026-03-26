import { QUESTION_BANK } from "@/lib/questions";
import {
  Demographics,
  QuestionMetrics,
  SessionEvent,
  SessionResult,
} from "@/lib/types";

export function buildQuestionMetrics(
  events: SessionEvent[],
): QuestionMetrics[] {
  return QUESTION_BANK.map((question) => {
    const qEvents = events.filter((event) => event.questionId === question.id);
    const clicks = qEvents.filter(
      (event) => event.eventType === "click",
    ).length;
    const hits = qEvents.filter((event) => event.eventType === "hit").length;
    const misses = qEvents.filter((event) => event.eventType === "miss").length;
    const score = hits;
    const accuracy = clicks > 0 ? hits / clicks : 0;
    const missrate = clicks > 0 ? misses / clicks : 0;

    return {
      questionId: question.id,
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

  metrics.forEach((metric, index) => {
    const position = index + 1;
    payload[`Clicks${position}`] = metric.clicks;
    payload[`Hits${position}`] = metric.hits;
    payload[`Misses${position}`] = metric.misses;
    payload[`Score${position}`] = metric.score;
    payload[`Accuracy${position}`] = metric.accuracy;
    payload[`Missrate${position}`] = metric.missrate;
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
