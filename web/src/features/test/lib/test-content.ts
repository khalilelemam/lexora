import type { Language, TobiiTaskType } from '../types';

/**
 * Static test reading content — organized by language and task type.
 * Will be replaced by DB-driven / LLM-generated content later.
 */

const SYLLABLES: Record<Language, string[]> = {
  en: [
    'ba  da  ka  ma  pa  ta\nfi  lo  re  su  we  zi\nbla  cra  dri  fro  glu  ple\nsna  spe  stra  tri  twi  whi',
    'be  de  ke  me  pe  te\nfa  li  ro  sa  wo  ze\nbro  cla  dre  fra  gli  pra\nsni  spo  stre  tro  twe  wha',
  ],
  ar: [
    'بَ  دَ  كَ  مَ  نَ  تَ\nفِ  لُ  رَ  سُ  وَ  زِ\nبلا  كرا  درِ  فرو  غلُ  بلي\nسنا  سبِ  سترا  ترِ  توِ  وها',
    'بِ  دِ  كِ  مِ  نِ  تِ\nفَ  لِ  رو  سَ  وُ  زَ\nبرو  كلا  درِ  فرا  غلِ  برا\nسنِ  سبو  سترِ  ترو  توِ  وَها',
  ],
};

const PSEUDO_WORDS: Record<Language, string[]> = {
  en: [
    'bafmol  trinset  glopwed  furkane\nchasdim  pluvort  snelkab  winthoz\ndremfil  quabish  zontrel  krapfin',
    'moldren  tuvbisk  frapgel  juknest\nwherblot  snigfam  clodwep  bruvtil\nzalkome  plinduf  grewsap  thinvol',
  ],
  ar: [
    'بفمول  ترنسيت  غلوبيد  فركان\nشاسديم  بلوفرت  سنلكاب  ونثوز\nدرمفيل  كوابش  زنتريل  كرابفين',
    'مولدرن  توفبسك  فرابجل  جكنست\nوربلوت  سنغفام  كلدويب  بروفتل\nزلكوم  بلندوف  جروساب  ثنفول',
  ],
};

const MEANINGFUL_TEXT: Record<Language, string[]> = {
  en: [
    'The small brown dog ran quickly across the green field. It was chasing a bright red ball that bounced higher and higher. The children laughed and clapped as they watched the happy dog play in the warm afternoon sun.',
    'A little bird sat on the top of a tall tree. It sang a beautiful song every morning. The people in the village loved to listen to the bird as they walked to the market on the dusty road.',
  ],
  ar: [
    'ركض الكلب البني الصغير بسرعة عبر الحقل الأخضر. كان يطارد كرة حمراء زاهية ترتد أعلى فأعلى. ضحك الأطفال وصفقوا وهم يشاهدون الكلب السعيد يلعب في شمس بعد الظهر الدافئة.',
    'جلس عصفور صغير على قمة شجرة طويلة. كان يغني أغنية جميلة كل صباح. أحب أهل القرية الاستماع إلى العصفور وهم يمشون إلى السوق على الطريق المغبر.',
  ],
};

const WEBCAM_PARAGRAPHS: Record<Language, string[]> = {
  en: [
    'The old lighthouse stood tall on the rocky cliff above the sea. Every night its bright light would spin around and around, helping ships find their way safely through the dark waters. The lighthouse keeper climbed the steep stairs each evening to make sure the light was working properly. He could see for miles from the top, watching the waves crash against the rocks below. Sometimes a storm would come and shake the building. The keeper would stay calm and keep the light burning bright. In the morning, the fishermen would wave to him as they sailed out with their little boats to catch fish for the village market.',
    'In the quiet forest, many animals made their homes among the tall trees. Squirrels jumped from branch to branch collecting nuts for the winter. Owls slept during the day and flew silently at night to catch their food. A family of deer walked carefully along the narrow path, stopping now and then to eat the fresh green leaves. Near the river, a beaver was building a dam from sticks and mud. The water flowed gently past the smooth stones on the bank. Birds in the treetops sang their songs while the sun moved slowly across a clear blue sky, making long shadows on the forest floor.',
  ],
  ar: [
    'وقف المنارة القديم شامخاً على الجرف الصخري فوق البحر. كل ليلة كان ضوؤه الساطع يدور ويدور ليساعد السفن على إيجاد طريقها بأمان عبر المياه المظلمة. كان حارس المنارة يصعد الدرج شديد الانحدار كل مساء للتأكد من أن الضوء يعمل بشكل صحيح. كان بإمكانه الرؤية لأميال من القمة ومشاهدة الأمواج وهي تتكسر على الصخور أدناه. أحياناً كانت العواصف تهز المبنى بقوة لكن الحارس كان يبقى هادئاً ويحافظ على الضوء مشتعلاً. في الصباح كان الصيادون يلوحون له وهم يبحرون بقواربهم الصغيرة لصيد الأسماك لسوق القرية.',
    'في الغابة الهادئة صنعت العديد من الحيوانات منازلها بين الأشجار الطويلة. كانت السناجب تقفز من غصن إلى غصن لجمع الجوز لفصل الشتاء. كانت البوم تنام أثناء النهار وتطير بصمت في الليل لاصطياد طعامها. كانت عائلة من الغزلان تمشي بحذر على الممر الضيق وتتوقف بين الحين والآخر لتأكل الأوراق الخضراء الطازجة. بالقرب من النهر كان القندس يبني سداً من العصي والطين. كان الماء يتدفق بلطف فوق الحجارة الناعمة على الضفة. كانت الطيور فوق الأشجار تغني أغانيها بينما الشمس تتحرك ببطء عبر سماء زرقاء صافية.',
  ],
};

/** Get random content for a Tobii task */
export function getTobiiTaskContent(language: Language, taskType: TobiiTaskType): string {
  const pool =
    taskType === 'syllables'
      ? SYLLABLES[language]
      : taskType === 'pseudo-words'
        ? PSEUDO_WORDS[language]
        : MEANINGFUL_TEXT[language];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Get random content for a webcam paragraph task */
export function getWebcamTaskContent(language: Language): string {
  const pool = WEBCAM_PARAGRAPHS[language];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Human-readable task labels */
export const TASK_LABELS: Record<string, string> = {
  syllables: 'Syllables',
  'pseudo-words': 'Pseudo-words',
  'meaningful-text': 'Meaningful Text',
  paragraph: 'Paragraph',
};
