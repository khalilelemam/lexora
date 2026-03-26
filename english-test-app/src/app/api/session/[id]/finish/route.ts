import { NextResponse } from "next/server";
import { completeSession, getSession } from "@/lib/session-store";
import { predictRiskFromFastApi } from "@/lib/fastapi-client";
import {
  buildModelFeaturePayload,
  buildQuestionMetrics,
  buildSessionResultFromProbability,
} from "@/lib/scoring";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const metrics = buildQuestionMetrics(session.events);
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
