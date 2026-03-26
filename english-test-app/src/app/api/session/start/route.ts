import { NextResponse } from "next/server";
import { createSessionForStudent } from "@/lib/session-store";
import { getStudent } from "@/lib/student-store";
import { Demographics } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as
    | (Partial<Demographics> & { studentId?: string })
    | null;

  if (!body) {
    return NextResponse.json(
      { error: "Invalid demographics payload." },
      { status: 400 },
    );
  }

  if (typeof body.studentId === "string" && body.studentId.length > 0) {
    const student = getStudent(body.studentId);
    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    const session = createSessionForStudent(student.demographics, student.id);

    return NextResponse.json({
      sessionId: session.id,
      startedAt: session.startedAt,
      studentId: student.id,
      studentName: student.name,
    });
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

  const session = createSessionForStudent({
    age: body.age,
    gender: body.gender,
    nativeLang: body.nativeLang,
    otherLang: body.otherLang,
  });

  return NextResponse.json({
    sessionId: session.id,
    startedAt: session.startedAt,
  });
}
