import { NextResponse } from "next/server";
import { addSessionEvent } from "@/lib/session-store";
import { SessionEventType } from "@/lib/types";

function isValidEventType(value: string): value is SessionEventType {
  return value === "click" || value === "hit" || value === "miss";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    eventType?: string;
    questionId?: string;
    optionId?: string;
  };

  if (
    !body ||
    !body.questionId ||
    typeof body.questionId !== "string" ||
    !body.eventType ||
    !isValidEventType(body.eventType)
  ) {
    return NextResponse.json(
      { error: "Invalid event payload." },
      { status: 400 },
    );
  }

  const updated = addSessionEvent(id, {
    questionId: body.questionId,
    optionId: body.optionId,
    eventType: body.eventType,
  });

  if (!updated) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    eventsCount: updated.events.length,
  });
}
