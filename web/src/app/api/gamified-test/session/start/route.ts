import { NextResponse } from "next/server";
import {
  getAgeGroupForAge,
  getQuestionIdsForAge,
} from "@/features/gamified-test/lib/question-config";
import type { ExamLanguage } from "@/features/gamified-test/lib/questions";
import { createSessionForStudent } from "@/features/gamified-test/lib/session-store";
import type { Demographics } from "@/features/gamified-test/lib/types";

function resolveExamLanguage(value: unknown): ExamLanguage {
  return value === "ar" ? "ar" : "en";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as
      | (Partial<Demographics> & { examLanguage?: ExamLanguage })
      | null;

    if (!body) {
      return NextResponse.json(
        { error: "Invalid demographics payload." },
        { status: 400 },
      );
    }

    if (
      typeof body.age !== "number" ||
      body.age < 7 ||
      body.age > 17 ||
      (body.gender !== "male" && body.gender !== "female") ||
      typeof body.nativeLang !== "boolean" ||
      typeof body.otherLang !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Invalid demographics payload." },
        { status: 400 },
      );
    }

    const examLanguage = resolveExamLanguage(body.examLanguage);

    const session = createSessionForStudent({
      age: body.age,
      gender: body.gender,
      nativeLang: body.nativeLang,
      otherLang: body.otherLang,
    });

    const ageGroup = getAgeGroupForAge(body.age);
    const questionIds = getQuestionIdsForAge(body.age);

    return NextResponse.json({
      sessionId: session.id,
      startedAt: session.startedAt,
      ageGroup,
      examLanguage,
      questionIds,
      totalQuestions: questionIds.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to start test.",
      },
      { status: 500 },
    );
  }
}
