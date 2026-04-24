import { NextResponse } from "next/server";
import { predictRiskFromFastApi } from "@/features/gamified-test/lib/fastapi-client";
import { getQuestionIdsForAge } from "@/features/gamified-test/lib/question-config";
import {
  buildModelFeaturePayload,
  buildQuestionMetrics,
  buildSessionResultFromProbability,
} from "@/features/gamified-test/lib/scoring";
import { completeSession, getSession } from "@/features/gamified-test/lib/session-store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const questionIds = getQuestionIdsForAge(session.demographics.age);
  const metrics = buildQuestionMetrics(session.events, questionIds);
  const totalClicks = metrics.reduce(
    (total, metric) => total + metric.clicks,
    0,
  );

  if (totalClicks === 0) {
    return NextResponse.json(
      {
        error:
          "No responses were captured. Please answer the test before finishing.",
      },
      { status: 400 },
    );
  }

  const modelFeatures = buildModelFeaturePayload(session.demographics, metrics);

  let prediction;

  try {
    prediction = await predictRiskFromFastApi({
      session_id: id,
      participant_id: undefined,
      ...modelFeatures,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch model output.";
    return NextResponse.json(
      { error: `Model prediction failed: ${message}` },
      { status: 503 },
    );
  }

  const result = buildSessionResultFromProbability(
    prediction.probability,
    prediction.threshold,
    metrics,
    {
      label: prediction.prediction,
      modelSource: "fastapi",
      modelVersion: prediction.model_version,
    },
  );

  const completed = completeSession(id, result);

  if (!completed) {
    return NextResponse.json(
      { error: "Unable to complete session." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    sessionId: completed.id,
    completedAt: completed.completedAt,
    result: completed.result,
  });
}
