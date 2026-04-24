import { NextResponse } from "next/server";
import {
  getAgeGroupForAge,
  getQuestionIdsForAge,
} from "@/features/gamified-test/lib/question-config";
import { getSession } from "@/features/gamified-test/lib/session-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const ageGroup = getAgeGroupForAge(session.demographics.age);
  if (!ageGroup) {
    return NextResponse.json(
      { error: "Session age is out of supported range (7-17)." },
      { status: 400 },
    );
  }

  const questionIds = getQuestionIdsForAge(session.demographics.age);

  return NextResponse.json({
    sessionId: session.id,
    startedAt: session.startedAt,
    demographics: session.demographics,
    ageGroup,
    questionIds,
    totalQuestions: questionIds.length,
  });
}
