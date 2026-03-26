import { randomUUID } from "crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import path from "path";
import {
  Demographics,
  SessionEvent,
  SessionRecord,
  SessionResult,
} from "@/lib/types";

const SESSION_DIR = path.join(process.cwd(), ".runtime-sessions");

function ensureSessionDir() {
  if (!existsSync(SESSION_DIR)) {
    mkdirSync(SESSION_DIR, { recursive: true });
  }
}

function getSessionPath(sessionId: string) {
  return path.join(SESSION_DIR, `${sessionId}.json`);
}

function writeSession(record: SessionRecord) {
  ensureSessionDir();
  writeFileSync(
    getSessionPath(record.id),
    JSON.stringify(record, null, 2),
    "utf-8",
  );
}

function readSession(sessionId: string) {
  try {
    ensureSessionDir();
    const raw = readFileSync(getSessionPath(sessionId), "utf-8");
    return JSON.parse(raw) as SessionRecord;
  } catch {
    return null;
  }
}

export function createSession(demographics: Demographics) {
  return createSessionForStudent(demographics);
}

export function createSessionForStudent(
  demographics: Demographics,
  studentId?: string,
) {
  const id = randomUUID();
  const record: SessionRecord = {
    id,
    startedAt: new Date().toISOString(),
    studentId,
    demographics,
    events: [],
  };

  writeSession(record);
  return record;
}

export function getSession(sessionId: string) {
  return readSession(sessionId) ?? undefined;
}

export function addSessionEvent(
  sessionId: string,
  event: Omit<SessionEvent, "createdAt">,
) {
  const session = readSession(sessionId);
  if (!session) {
    return null;
  }

  session.events.push({
    ...event,
    createdAt: new Date().toISOString(),
  });

  writeSession(session);
  return session;
}

export function completeSession(sessionId: string, result: SessionResult) {
  const session = readSession(sessionId);
  if (!session) {
    return null;
  }

  session.completedAt = new Date().toISOString();
  session.result = result;
  writeSession(session);

  return session;
}

export function listSessions() {
  ensureSessionDir();
  const fileNames = readdirSync(SESSION_DIR).filter((name) =>
    name.toLowerCase().endsWith(".json"),
  );

  return fileNames
    .map((name) => readSession(path.basename(name, ".json")))
    .filter((session): session is SessionRecord => Boolean(session));
}
