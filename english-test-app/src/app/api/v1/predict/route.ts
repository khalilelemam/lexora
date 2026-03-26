import { NextResponse } from "next/server";
import { predictRiskFromFastApi } from "@/lib/fastapi-client";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const prediction = await predictRiskFromFastApi(payload);
    return NextResponse.json(prediction);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to get prediction.",
      },
      { status: 500 },
    );
  }
}
