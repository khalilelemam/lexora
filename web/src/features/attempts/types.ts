import type {
  AttemptContentSnapshot,
  CalibrationMode,
  GazeFeature,
  PredictionResult,
  RiskLevel,
  TaskType,
  TestMode,
} from '@/features/test/types';

export interface AttemptUserSummary {
  id: string;
  name: string | null;
  email: string;
}

export interface AttemptListItem {
  attemptId: string;
  testType: TestMode;
  outcome: RiskLevel;
  age: number;
  label: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user?: AttemptUserSummary;
}

export interface AttemptDetail extends AttemptListItem {
  modelVersion: string;
  calibrationMode: CalibrationMode;
  result: PredictionResult;
  contentSnapshot: AttemptContentSnapshot | null;
  visualizations: AttemptVisualization[];
}

export interface AttemptVisualization {
  taskType: TaskType;
  label: string;
  content: string;
  features: GazeFeature[];
}

export interface AttemptFilters {
  testType?: TestMode;
  outcomes?: RiskLevel[];
  query?: string;
  createdFrom?: string;
  createdTo?: string;
  cursor?: string;
  limit?: number;
}

export interface AttemptsListResponse {
  attempts: AttemptListItem[];
  nextCursor: string | null;
  total: number;
}

export interface AttemptDetailResponse {
  attempt: AttemptDetail;
}
