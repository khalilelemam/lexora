'use server';

import type { WebcamSubmissionInput } from '../types';
import type { SubmissionActionResult } from './types';
import { submitWebcamTestAttempt } from '../server/submit-test-attempt';

export async function submitWebcamTest(
  input: WebcamSubmissionInput,
): Promise<SubmissionActionResult> {
  return submitWebcamTestAttempt(input);
}
