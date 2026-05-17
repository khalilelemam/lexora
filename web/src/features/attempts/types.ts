import type {
  AttemptContentSnapshot,
  CalibrationMode,
  PredictionResult,
  RiskLevel,
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
  label: string | null;
  createdAt: string;
  updatedAt: string;
  user?: AttemptUserSummary;
}

export interface AttemptDetail extends AttemptListItem {
  modelVersion: string;
  calibrationMode: CalibrationMode;
  result: PredictionResult;
  contentSnapshot: AttemptContentSnapshot | null;
}

export interface AttemptFilters {
  testType?: TestMode;
  outcome?: RiskLevel;
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface AttemptsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AttemptsListResponse {
  attempts: AttemptListItem[];
  pagination: AttemptsPagination;
}

export interface AttemptDetailResponse {
  attempt: AttemptDetail;
}
