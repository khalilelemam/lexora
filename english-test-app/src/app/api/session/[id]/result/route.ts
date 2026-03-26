import { NextResponse } from "next/server";
import { getSession } from "@/lib/session-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (!session.result) {
    return NextResponse.json(
      { error: "Session not completed yet." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    sessionId: session.id,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    demographics: session.demographics,
    result: session.result,
  });
}
