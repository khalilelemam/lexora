import {
  Demographics,
  SessionRecord,
  SessionResult,
  StudentAttemptSummary,
} from "@/features/gamified-test/lib/types";

type SessionEventInput = {
  eventType: "click" | "hit" | "miss";
  questionId: string;
  optionId?: string;
};

const sessionsById = new Map<string, SessionRecord>();

function createId() {
  return globalThis.crypto.randomUUID();
}

export function createSessionForStudent(
  demographics: Demographics,
  studentId?: string,
): SessionRecord {
  const session: SessionRecord = {
    id: createId(),
    startedAt: new Date().toISOString(),
    demographics,
    studentId,
    events: [],
  };

  sessionsById.set(session.id, session);
  return session;
}

export function getSession(id: string): SessionRecord | undefined {
  return sessionsById.get(id);
}

export function addSessionEvent(
  id: string,
  event: SessionEventInput,
): SessionRecord | undefined {
  const session = sessionsById.get(id);
  if (!session) {
    return undefined;
  }

  session.events.push({
    ...event,
    createdAt: new Date().toISOString(),
  });

  return session;
}

export function completeSession(
  id: string,
  result: SessionResult,
): SessionRecord | undefined {
  const session = sessionsById.get(id);
  if (!session) {
    return undefined;
  }

  session.completedAt = new Date().toISOString();
  session.result = result;
  return session;
}

export function listAttemptSummariesForStudent(
  studentId: string,
): StudentAttemptSummary[] {
  return Array.from(sessionsById.values())
    .filter((session) => session.studentId === studentId)
    .map((session) => ({
      sessionId: session.id,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      probability: session.result?.probability,
      riskLevel: session.result?.riskLevel,
      riskDetected: session.result?.riskDetected,
    }))
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}
