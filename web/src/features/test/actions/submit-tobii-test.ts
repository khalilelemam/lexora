'use server';

import type { TobiiSubmissionInput } from '../types';
import type { SubmissionActionResult } from './types';
import { submitTobiiTestAttempt } from '../server/submit-test-attempt';

export async function submitTobiiTest(
  input: TobiiSubmissionInput,
): Promise<SubmissionActionResult> {
  return submitTobiiTestAttempt(input);
}
