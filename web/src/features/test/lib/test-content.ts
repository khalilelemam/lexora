import type { TobiiTaskType } from '../types';

/**
 * Static test reading content — English only.
 * Will be replaced by DB-driven / LLM-generated content later.
 */

const SYLLABLES = [
  'ba  da  ka  ma  pa  ta\nfi  lo  re  su  we  zi\nbla  cra  dri  fro  glu  ple\nsna  spe  stra  tri  twi  whi',
  'be  de  ke  me  pe  te\nfa  li  ro  sa  wo  ze\nbro  cla  dre  fra  gli  pra\nsni  spo  stre  tro  twe  wha',
];

const PSEUDO_WORDS = [
  'bafmol  trinset  glopwed  furkane\nchasdim  pluvort  snelkab  winthoz\ndremfil  quabish  zontrel  krapfin',
  'moldren  tuvbisk  frapgel  juknest\nwherblot  snigfam  clodwep  bruvtil\nzalkome  plinduf  grewsap  thinvol',
];

const MEANINGFUL_TEXT = [
  'The small brown dog ran quickly across the green field. It was chasing a bright red ball that bounced higher and higher. The children laughed and clapped as they watched the happy dog play in the warm afternoon sun.',
  'A little bird sat on the top of a tall tree. It sang a beautiful song every morning. The people in the village loved to listen to the bird as they walked to the market on the dusty road.',
];

const WEBCAM_PARAGRAPHS = [
  'The old lighthouse stood tall on the rocky cliff above the sea. Every night its bright light would spin around and around, helping ships find their way safely through the dark waters. The lighthouse keeper climbed the steep stairs each evening to make sure the light was working properly. He could see for miles from the top, watching the waves crash against the rocks below. Sometimes a storm would come and shake the building.',
  'In the quiet forest, many animals made their homes among the tall trees. Squirrels jumped from branch to branch collecting nuts for the winter. Owls slept during the day and flew silently at night to catch their food. A family of deer walked carefully along the narrow path, stopping now and then to eat the fresh green leaves. Near the river, a beaver was building a dam from sticks and mud. The water flowed gently past the smooth stones on the bank.',
];

/** Get random content for a Tobii task */
export function getTobiiTaskContent(taskType: TobiiTaskType): string {
  const pool =
    taskType === 'syllables'
      ? SYLLABLES
      : taskType === 'pseudo-words'
        ? PSEUDO_WORDS
        : MEANINGFUL_TEXT;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Get random content for a webcam paragraph task */
export function getWebcamTaskContent(): string {
  const pool = WEBCAM_PARAGRAPHS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Human-readable task labels */
export const TASK_LABELS: Record<string, string> = {
  syllables: 'Syllables',
  'pseudo-words': 'Pseudo-words',
  'meaningful-text': 'Meaningful Text',
  paragraph: 'Paragraph',
};
