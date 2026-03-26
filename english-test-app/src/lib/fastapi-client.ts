export type FastApiPrediction = {
  session_id: string;
  probability: number;
  threshold: number;
  prediction: string;
  confidence: number;
  model_version: string;
  timestamp: string;
};

const FASTAPI_BASE_URL =
  process.env.FASTAPI_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000";

export async function predictRiskFromFastApi(payload: Record<string, unknown>) {
  const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const body = (await response.json()) as
    | FastApiPrediction
    | { detail?: string; error?: string };

  if (!response.ok) {
    const message =
      ("detail" in body && body.detail) ||
      ("error" in body && body.error) ||
      `FastAPI request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body as FastApiPrediction;
}
