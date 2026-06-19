import type { TobiiTaskType } from '../types';
import tobiiData from './data/tobii-passages.json';
import webcamData from './data/webcam-passages.json';

/**
 * Dynamic test reading content mapped by age.
 */

function getTobiiGroup(age?: number) {
  if (typeof age === 'number') {
    const group = tobiiData.ageGroups.find((g) => age >= g.minAge && age <= g.maxAge);
    if (group) return group;
  }
  return tobiiData.default;
}

function getWebcamGroup(age?: number) {
  if (typeof age === 'number') {
    const group = webcamData.ageGroups.find((g) => age >= g.minAge && age <= g.maxAge);
    if (group) return group;
  }
  return webcamData.default;
}

/** Get content for a Tobii task dynamically based on age */
export function getTobiiTaskContent(taskType: TobiiTaskType, age?: number): string {
  const group = getTobiiGroup(age);
  
  if (taskType === 'syllables') return group.syllables;
  if (taskType === 'pseudo-words') return group.pseudoWords;
  return group.meaningfulText;
}

/** Get content for a webcam paragraph task dynamically based on age */
export function getWebcamTaskContent(age?: number): string {
  const group = getWebcamGroup(age);
  return group.paragraph;
}

/** Human-readable task labels */
export const TASK_LABELS: Record<string, string> = {
  syllables: 'Syllables',
  'pseudo-words': 'Pseudo-words',
  'meaningful-text': 'Meaningful Text',
  paragraph: 'Paragraph',
};
