import type { WebcamTaskType, TaskType } from '../types';
import arabicData from './data/arabic-passages.json';
import englishData from './data/tobii-passages.json';

/**
 * Dynamic reading content mapped by age and language (Arabic default, English secondary).
 * Structure adheres to ETDD70 standards for eye-tracking reading diagnostics:
 * 1. Syllables: Isolates sublexical decoding & phonological processing.
 * 2. Pseudo-words: Evaluates grapheme-to-phoneme conversion without sight-word shortcuts.
 * 3. Meaningful Text: Natural reading flow, return sweeps, regressions, and context.
 */

function getArabicGroup(age?: number) {
  if (typeof age === 'number') {
    const group = arabicData.ageGroups.find((g) => age >= g.minAge && age <= g.maxAge);
    if (group) return group;
  }
  return arabicData.default;
}

function getEnglishGroup(age?: number) {
  if (typeof age === 'number') {
    const group = englishData.ageGroups.find((g) => age >= g.minAge && age <= g.maxAge);
    if (group) return group;
  }
  return englishData.default;
}

/** Get reading content for a task dynamically based on age and language */
export function getTaskContent(
  taskType: WebcamTaskType,
  age?: number,
  lang: 'ar' | 'en' = 'ar',
): string {
  if (lang === 'en') {
    const group = getEnglishGroup(age);
    if (taskType === 'syllables') return group.syllables;
    if (taskType === 'pseudo-words') return group.pseudoWords;
    return group.meaningfulText;
  }

  const group = getArabicGroup(age);
  if (taskType === 'syllables') return group.syllables;
  if (taskType === 'pseudo-words') return group.pseudoWords;
  return group.meaningfulText;
}

/** Get content for a webcam task (defaults to Arabic) */
export function getWebcamTaskContent(
  taskType: WebcamTaskType = 'meaningful-text',
  age?: number,
  lang: 'ar' | 'en' = 'ar',
): string {
  return getTaskContent(taskType, age, lang);
}

export const getTobiiTaskContent = getTaskContent;

/** Human-readable task labels in Arabic & English */
export const TASK_LABELS: Record<string, { ar: string; en: string }> = {
  syllables: {
    ar: 'المقاطع الصوتية',
    en: 'Syllables',
  },
  'pseudo-words': {
    ar: 'الكلمات غير الحقيقية',
    en: 'Pseudo-words',
  },
  'meaningful-text': {
    ar: 'النص الهادف',
    en: 'Meaningful Text',
  },
};

/** Task descriptions to guide parents / readers */
export const TASK_DESCRIPTIONS: Record<string, { ar: string; en: string }> = {
  syllables: {
    ar: 'اجعل طفلك يقرأ كل مقطع صوتي بوضوح من اليمين إلى اليسار.',
    en: 'Read each syllable clearly across each line.',
  },
  'pseudo-words': {
    ar: 'هذه كلمات ليس لها معنى محدد، المطلوب قراءتها وفقاً للتشكيل من اليمين إلى اليسار.',
    en: 'These are non-words. Read each word out loud using phonetic rules.',
  },
  'meaningful-text': {
    ar: 'اجعل طفلك يقرأ القصة التالية بصوت طبيعي ومريح حتى النهاية.',
    en: 'Read this short story aloud naturally from beginning to end.',
  },
};
