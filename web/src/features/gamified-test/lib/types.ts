export type Gender = "male" | "female";

export type Demographics = {
  gender: Gender;
  nativeLang: boolean;
  otherLang: boolean;
  age: number;
  preferredExamLanguage?: "en" | "ar";
};

export type QuestionVariant = {
  visualCue: string;
  targetToken: string;
  distractorTokens: string[];
  correctionTargetToken?: string;
  correctionDistractorTokens?: string[];
};

export type InteractionType =
  | "grid"
  | "letterChoices"
  | "wordLetters"
  | "sentenceWords"
  | "wordToLetterChoices"
  | "letterReplacement"
  | "letterArrangement"
  | "syllableArrangement"
  | "sentenceSegmentationChoices"
  | "typedSequenceRecall";

export type Question = {
  id: string;
  title: string;
  prompt: string;
  instruction: string;
  audioText: string;
  interactionType?: InteractionType;
  choiceCount?: number;
  visualCue?: string;
  audioUrl?: string;
  gridSize: number;
  targetToken: string;
  distractorTokens?: string[];
  correctionTargetToken?: string;
  correctionDistractorTokens?: string[];
  targetRepeatCount?: number;
  variants?: QuestionVariant[];
};

export type SessionEventType = "click" | "hit" | "miss";

export type SessionEvent = {
  eventType: SessionEventType;
  questionId: string;
  optionId?: string;
  createdAt: string;
};

export type QuestionMetrics = {
  questionId: string;
  clicks: number;
  hits: number;
  misses: number;
  score: number;
  accuracy: number;
  missrate: number;
};

export type SessionResult = {
  probability: number;
  threshold: number;
  riskDetected: boolean;
  riskLevel: "low" | "moderate" | "high";
  label: string;
  metrics: QuestionMetrics[];
  modelSource?: "fastapi" | "fallback";
  modelVersion?: string;
};

export type SessionRecord = {
  id: string;
  startedAt: string;
  completedAt?: string;
  studentId?: string;
  demographics: Demographics;
  events: SessionEvent[];
  result?: SessionResult;
};

export type StudentRecord = {
  id: string;
  name: string;
  createdAt: string;
  demographics: Demographics;
};

export type StudentAttemptSummary = {
  sessionId: string;
  startedAt: string;
  completedAt?: string;
  probability?: number;
  riskLevel?: "low" | "moderate" | "high";
  riskDetected?: boolean;
};

export type StudentWithAttempts = StudentRecord & {
  attempts: StudentAttemptSummary[];
};
