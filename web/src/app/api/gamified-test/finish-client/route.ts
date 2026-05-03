import { NextResponse } from "next/server";
import { predictRiskFromFastApi } from "@/features/gamified-test/lib/fastapi-client";
import {
  buildModelFeaturePayload,
  buildQuestionMetrics,
  buildSessionResultFromProbability,
} from "@/features/gamified-test/lib/scoring";
import type { Demographics, SessionEvent } from "@/features/gamified-test/lib/types";

type FinishClientBody = {
  sessionId: string;
  demographics: Demographics;
  questionIds: number[];
  events: SessionEvent[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FinishClientBody | null;

    if (
      !body ||
      !body.sessionId ||
      !body.demographics ||
      !Array.isArray(body.questionIds) ||
      !Array.isArray(body.events)
    ) {
      return NextResponse.json(
        { error: "Invalid payload." },
        { status: 400 },
      );
    }

    const { sessionId, demographics, questionIds, events } = body;

    const metrics = buildQuestionMetrics(events, questionIds);
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

    const modelFeatures = buildModelFeaturePayload(demographics, metrics);

    let prediction;
    try {
      prediction = await predictRiskFromFastApi({
        session_id: sessionId,
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

    return NextResponse.json({
      sessionId,
      completedAt: new Date().toISOString(),
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to finish test.",
      },
      { status: 500 },
    );
  }
}
