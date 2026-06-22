import type {
  AttemptOutcome,
  CalibrationMode,
  ExportArtifactStatus,
  TestMode,
} from '@/generated/prisma/client';

// ── Content mode ────────────────────────────────────────────

export type ExportContentMode = 'raw' | 'derived' | 'both';

// ── Row shape returned by the export query ──────────────────

export interface ExportAttemptRow {
  attempt_id: string;
  test_type: TestMode;
  outcome: AttemptOutcome;
  model_version: string;
  calibration_mode: CalibrationMode;
  age: number;
  label: string;
  raw_data_consented: boolean;
  raw_blob_url: string | null;
  derived_blob_url: string;
  export_artifact_status: ExportArtifactStatus;
  export_manifest_path: string | null;
  created_at: Date | string;
  deleted_at: Date | string | null;
  user_id: string;
  user_name: string | null;
  user_email: string;
}

// ── Task key mapping ────────────────────────────────────────
// Consistent short names for folder/file naming.

export const TOBII_TASK_KEYS = ['syllables', 'pseudo', 'meaningful'] as const;
export type TobiiTaskKey = (typeof TOBII_TASK_KEYS)[number];

/** Maps the derived blob feature keys to export file names. */
export const TOBII_FEATURE_KEY_MAP: Record<string, TobiiTaskKey> = {
  syllables: 'syllables',
  pseudo: 'pseudo',
  meaningful: 'meaningful',
};

/** Maps the raw blob task keys to export file names. */
export const TOBII_RAW_KEY_MAP: Record<string, TobiiTaskKey> = {
  syllablesTask: 'syllables',
  pseudoTask: 'pseudo',
  meaningfulTask: 'meaningful',
};
