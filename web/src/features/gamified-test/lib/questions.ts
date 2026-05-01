import { Question } from "@/features/gamified-test/lib/types";

export type ExamLanguage = "en";

export const QUESTION_BANK: Question[] = [
  {
    id: "q1",
    title: "Question 1",
    prompt: "Find the letter e in a 3x3 grid.",
    instruction: "Click the letter e as many times as you can before the timer ends.",
    audioText: "Find the letter e.",
    audioUrl: "/gamified-test/questions/q1.mp3",
    gridSize: 3,
    targetToken: "e",
    distractorTokens: ["a", "o", "c", "u", "i", "l", "n", "m", "r"],
  },
  {
    id: "q2",
    title: "Question 2",
    prompt: "Find the letter g in a 4x4 grid.",
    instruction: "Click the letter g as many times as you can before the timer ends.",
    audioText: "Find the letter g.",
    audioUrl: "/gamified-test/questions/q2.mp3",
    gridSize: 4,
    targetToken: "g",
    distractorTokens: ["q", "c", "j", "b", "d", "p", "o", "a", "s", "y"],
  },
  {
    id: "q3",
    title: "Question 3",
    prompt: "Find the letter b in a 5x5 grid.",
    instruction: "Click the letter b as many times as you can before the timer ends.",
    audioText: "Find the letter b.",
    audioUrl: "/gamified-test/questions/q3.mp3",
    gridSize: 5,
    targetToken: "b",
    distractorTokens: ["d", "p", "q", "g", "h", "k", "l", "n", "m", "r"],
  },
  {
    id: "q4",
    title: "Question 4",
    prompt: "Find the letter d in a 6x6 grid.",
    instruction: "Click the letter d as many times as you can before the timer ends.",
    audioText: "Find the letter d.",
    audioUrl: "/gamified-test/questions/q4.mp3",
    gridSize: 6,
    targetToken: "d",
    distractorTokens: ["b", "p", "q", "o", "a", "g", "l", "h", "c", "e"],
  },
  {
    id: "q5",
    title: "Question 5",
    prompt: "Find the syllable ba in a 5x5 grid.",
    instruction: "Click the syllable ba as many times as you can before the timer ends.",
    audioText: "Find the syllable ba.",
    audioUrl: "/gamified-test/questions/q5.mp3",
    gridSize: 5,
    targetToken: "ba",
    distractorTokens: ["da", "pa", "ga", "be", "bo", "ab", "la", "na", "ma", "ra"],
  },
  {
    id: "q6",
    title: "Question 6",
    prompt: "Find the syllable gar in a 5x5 grid.",
    instruction: "Click the syllable gar as many times as you can before time runs out.",
    audioText: "Find the syllable gar.",
    audioUrl: "/gamified-test/questions/q6.mp3",
    gridSize: 5,
    targetToken: "gar",
    distractorTokens: ["bar", "car", "par", "dar", "gal", "gan", "gor", "ger", "sar", "lar"],
  },
  {
    id: "q7",
    title: "Question 7",
    prompt: "Find the syllable cla in a 5x5 grid.",
    instruction: "Click the syllable cla as many times as you can before time runs out.",
    audioText: "Find the syllable cla.",
    audioUrl: "/gamified-test/questions/q7.mp3",
    gridSize: 5,
    targetToken: "cla",
    distractorTokens: ["cra", "fla", "gla", "cle", "clo", "clu", "cna", "cfa", "sla"],
  },
  {
    id: "q8",
    title: "Question 8",
    prompt: "Find the syllable lan in a 5x5 grid.",
    instruction: "Click the syllable lan as many times as you can before time runs out.",
    audioText: "Find the syllable lan.",
    audioUrl: "/gamified-test/questions/q8.mp3",
    gridSize: 5,
    targetToken: "lan",
    distractorTokens: ["man", "ran", "can", "len", "lin", "lon", "tan", "pan", "fan", "ban"],
  },
  {
    id: "q9",
    title: "Question 9",
    prompt: "Find the syllable gli in a 5x5 grid.",
    instruction: "Click the syllable gli as many times as you can before time runs out.",
    audioText: "Find the syllable gli.",
    audioUrl: "/gamified-test/questions/q9.mp3",
    gridSize: 6,
    targetToken: "gli",
    distractorTokens: ["gri", "gla", "gle", "glo", "bli", "cli", "fli", "gni", "dli", "sli"],
  },
  {
    id: "q10",
    title: "Question 10",
    prompt: "Find the word bake in a 3x3 grid.",
    instruction: "Click the word bake as many times as you can before the timer ends.",
    audioText: "Find the word bake.",
    audioUrl: "/gamified-test/questions/q10.mp3",
    gridSize: 3,
    targetToken: "bake",
    distractorTokens: ["lake", "fake", "make", "rake", "pace", "base", "lace", "dake", "gake"],
  },
  {
    id: "q11",
    title: "Question 11",
    prompt: "Find the word game in a 4x4 grid.",
    instruction: "Click the word game as many times as you can before the timer ends.",
    audioText: "Find the word game.",
    audioUrl: "/gamified-test/questions/q11.mp3",
    gridSize: 4,
    targetToken: "game",
    distractorTokens: ["same", "came", "gate", "fame", "gale", "name", "gane", "gime", "gome", "gaze"],
  },
  {
    id: "q12",
    title: "Question 12",
    prompt: "Find the word stone in a 4x4 grid.",
    instruction: "Click the word stone as many times as you can before the timer ends.",
    audioText: "Find the word stone.",
    audioUrl: "/gamified-test/questions/q12.mp3",
    gridSize: 4,
    targetToken: "stone",
    distractorTokens: ["stane", "stole", "store", "shone", "atone", "stine", "scone", "stome", "stune", "spone"],
  },
  {
    id: "q13",
    title: "Question 13",
    prompt: "Find the word market in a 4x4 grid.",
    instruction: "Click the word market as many times as you can before the timer ends.",
    audioText: "Find the word market.",
    audioUrl: "/gamified-test/questions/q13.mp3",
    gridSize: 4,
    targetToken: "market",
    distractorTokens: ["marker", "marset", "marget", "martet", "marlet", "makret", "markel", "parket", "morket", "marcet"],
  },
  {
    id: "q14",
    title: "Question 14",
    prompt: "Find the ONE different letter — all others are the same.",
    instruction: "Tap the letter that does NOT match the rest.",
    audioText: "Find the different letter.",
    audioUrl: "/gamified-test/questions/q14_v1 to q17_v4.mp3",
    gridSize: 5,
    targetToken: "a",
    distractorTokens: ["o"],
    targetRepeatCount: 1,
    variants: [
      {
        visualCue: "",
        targetToken: "a",
        distractorTokens: ["o"],
      },
      {
        visualCue: "",
        targetToken: "o",
        distractorTokens: ["a"],
      },
      {
        visualCue: "",
        targetToken: "e",
        distractorTokens: ["o"],
      },
      {
        visualCue: "",
        targetToken: "o",
        distractorTokens: ["e"],
      },
    ],
  },
  {
    id: "q15",
    title: "Question 15",
    prompt: "Find the ONE different letter — all others are the same.",
    instruction: "Tap the letter that does NOT match the rest.",
    audioText: "Find the different letter.",
    audioUrl: "/gamified-test/questions/q14_v1 to q17_v4.mp3",
    gridSize: 5,
    targetToken: "b",
    distractorTokens: ["d"],
    targetRepeatCount: 1,
    variants: [
      {
        visualCue: "",
        targetToken: "b",
        distractorTokens: ["d"],
      },
      {
        visualCue: "",
        targetToken: "d",
        distractorTokens: ["b"],
      },
      {
        visualCue: "",
        targetToken: "b",
        distractorTokens: ["q"],
      },
      {
        visualCue: "",
        targetToken: "q",
        distractorTokens: ["b"],
      },
    ],
  },
  {
    id: "q16",
    title: "Question 16",
    prompt: "Find the ONE different letter — all others are the same.",
    instruction: "Tap the letter that does NOT match the rest.",
    audioText: "Find the different letter.",
    audioUrl: "/gamified-test/questions/q14_v1 to q17_v4.mp3",
    gridSize: 5,
    targetToken: "p",
    distractorTokens: ["q"],
    targetRepeatCount: 1,
    variants: [
      {
        visualCue: "",
        targetToken: "p",
        distractorTokens: ["q"],
      },
      {
        visualCue: "",
        targetToken: "q",
        distractorTokens: ["p"],
      },
      {
        visualCue: "",
        targetToken: "p",
        distractorTokens: ["d"],
      },
      {
        visualCue: "",
        targetToken: "d",
        distractorTokens: ["p"],
      },
    ],
  },
  {
    id: "q17",
    title: "Question 17",
    prompt: "Find the ONE different letter — all others are the same.",
    instruction: "Tap the letter that does NOT match the rest.",
    audioText: "Find the different letter.",
    audioUrl: "/gamified-test/questions/q14_v1 to q17_v4.mp3",
    gridSize: 5,
    targetToken: "u",
    distractorTokens: ["v"],
    targetRepeatCount: 1,
    variants: [
      {
        visualCue: "",
        targetToken: "u",
        distractorTokens: ["v"],
      },
      {
        visualCue: "",
        targetToken: "v",
        distractorTokens: ["u"],
      },
      {
        visualCue: "",
        targetToken: "m",
        distractorTokens: ["n"],
      },
      {
        visualCue: "",
        targetToken: "n",
        distractorTokens: ["m"],
      },
    ],
  },
  {
    id: "q18",
    title: "Question 18",
    prompt: "Choose the correct spelling of the made-up word.",
    instruction: "Click the correct spelling as many times as you can before the timer ends.",
    audioText: "Find the word flantek.",
    audioUrl: "/gamified-test/questions/q18.mp3",
    gridSize: 3,
    targetToken: "flantek",
    distractorTokens: ["blantek", "flanket", "flantec", "frontec", "flanled", "plantek", "flantest", "flanteg"],
  },
  {
    id: "q19",
    title: "Question 19",
    prompt: "Choose the correct spelling of the made-up word.",
    instruction: "Click the correct spelling as many times as you can before the timer ends.",
    audioText: "Find the word trambit.",
    audioUrl: "/gamified-test/questions/q19.mp3",
    gridSize: 3,
    targetToken: "trambit",
    distractorTokens: ["trambid", "trambig", "trampit", "trambat", "trampid", "scrambit", "trambits", "trambird"],
  },
  {
    id: "q20",
    title: "Question 20",
    prompt: "Choose the correct spelling of the word.",
    instruction: "Click the correct spelling as many times as you can before the timer ends.",
    audioText: "Find the word window.",
    audioUrl: "/gamified-test/questions/q20.mp3",
    gridSize: 3,
    targetToken: "window",
    distractorTokens: ["windwo", "widnow", "windo", "winndow", "wimdow", "windor", "winrow", "windaw"],
  },
  {
    id: "q21",
    title: "Question 21",
    prompt: "Choose the correct spelling of the word.",
    instruction: "Click the correct spelling as many times as you can before the timer ends.",
    audioText: "Find the word planet.",
    audioUrl: "/gamified-test/questions/q21.mp3",
    gridSize: 3,
    targetToken: "planet",
    distractorTokens: ["plnaet", "planat", "plannet", "planer", "palnet", "plamet", "plonet", "planed"],
  },
  {
    id: "q22",
    title: "Question 22",
    prompt: "Find the missing letter in the word.",
    instruction: "Click the missing letter as many times as you can before the timer ends.",
    audioText: "Find the missing letter.",
    audioUrl: "/gamified-test/questions/q22_v1 to q22_v13.mp3",
    interactionType: "letterChoices",
    choiceCount: 5,
    visualCue: "h _ use",
    gridSize: 3,
    targetToken: "o",
    distractorTokens: ["u", "a", "e", "i"],
    targetRepeatCount: 1,
    variants: [
      {
        visualCue: "h _ use",
        targetToken: "o",
        distractorTokens: ["u", "a", "e", "i"],
      },
      {
        visualCue: "c _ t",
        targetToken: "a",
        distractorTokens: ["u", "o", "e", "i"],
      },
      {
        visualCue: "pl _ ne",
        targetToken: "a",
        distractorTokens: ["e", "i", "o", "u"],
      },
      {
        visualCue: "sm _ le",
        targetToken: "i",
        distractorTokens: ["e", "a", "o", "u"],
      },
      {
        visualCue: "tr _ in",
        targetToken: "a",
        distractorTokens: ["e", "i", "o", "u"],
      },
      {
        visualCue: "b _ ok",
        targetToken: "o",
        distractorTokens: ["a", "e", "i", "u"],
      },
      {
        visualCue: "st _ ne",
        targetToken: "o",
        distractorTokens: ["a", "e", "i", "u"],
      },
      {
        visualCue: "gr _ pe",
        targetToken: "a",
        distractorTokens: ["e", "i", "o", "u"],
      },
      {
        visualCue: "sh _ p",
        targetToken: "i",
        distractorTokens: ["a", "e", "o", "u"],
      },
      {
        visualCue: "dr _ nk",
        targetToken: "i",
        distractorTokens: ["a", "e", "o", "u"],
      },
      {
        visualCue: "br _ dge",
        targetToken: "i",
        distractorTokens: ["a", "e", "o", "u"],
      },
      {
        visualCue: "cl _ ck",
        targetToken: "o",
        distractorTokens: ["a", "e", "i", "u"],
      },
      {
        visualCue: "fl _ wer",
        targetToken: "o",
        distractorTokens: ["a", "e", "i", "u"],
      },
    ],
  },
  {
    id: "q23",
    title: "Question 23",
    prompt: "Find the wrong letter in the word.",
    instruction: "Click the wrong letter in the word as many times as you can before the timer ends.",
    audioText: "Find the wrong letter.",
    audioUrl: "/gamified-test/questions/q23_v1 to q23_v13.mp3",
    interactionType: "wordLetters",
    visualCue: "houzse",
    gridSize: 3,
    targetToken: "z",
    distractorTokens: ["h", "o", "u", "s", "e"],
    targetRepeatCount: 1,
    variants: [
      {
        visualCue: "houzse",
        targetToken: "z",
        distractorTokens: ["h", "o", "u", "s", "e"],
      },
      {
        visualCue: "friepnd",
        targetToken: "p",
        distractorTokens: ["f", "r", "i", "e", "n", "d"],
      },
      {
        visualCue: "plaqne",
        targetToken: "q",
        distractorTokens: ["p", "l", "a", "n", "e"],
      },
      {
        visualCue: "smilfe",
        targetToken: "f",
        distractorTokens: ["s", "m", "i", "l", "e"],
      },
      {
        visualCue: "trakin",
        targetToken: "k",
        distractorTokens: ["t", "r", "a", "i", "n"],
      },
      {
        visualCue: "bookm",
        targetToken: "m",
        distractorTokens: ["b", "o", "k", "a", "e"],
      },
      {
        visualCue: "stonwe",
        targetToken: "w",
        distractorTokens: ["s", "t", "o", "n", "e"],
      },
      {
        visualCue: "gracpe",
        targetToken: "c",
        distractorTokens: ["g", "r", "a", "p", "e"],
      },
      {
        visualCue: "shiup",
        targetToken: "u",
        distractorTokens: ["s", "h", "i", "p", "a"],
      },
      {
        visualCue: "drinvk",
        targetToken: "v",
        distractorTokens: ["d", "r", "i", "n", "k"],
      },
      {
        visualCue: "bridgze",
        targetToken: "z",
        distractorTokens: ["b", "r", "i", "d", "g", "e"],
      },
      {
        visualCue: "cloqck",
        targetToken: "q",
        distractorTokens: ["c", "l", "o", "k", "a"],
      },
      {
        visualCue: "flowber",
        targetToken: "b",
        distractorTokens: ["f", "l", "o", "w", "e", "r"],
      },
    ],
  },
  {
    id: "q24",
    title: "Question 24",
    prompt: "Find the wrong word in the sentence.",
    instruction: "Click the wrong word in the sentence as many times as you can before the timer ends.",
    audioText: "Find the wrong word.",
    audioUrl: "/gamified-test/questions/q24_v1 to q24_v5.mp3",
    interactionType: "sentenceWords",
    visualCue: "She went to the bakery to compare a cake.",
    gridSize: 3,
    targetToken: "compare",
    distractorTokens: ["she", "went", "to", "the", "bakery", "to", "buy", "a", "cake"],
    targetRepeatCount: 1,
    variants: [
      {
        visualCue: "She went to the bakery to compare a cake.",
        targetToken: "compare",
        distractorTokens: ["she", "went", "to", "the", "bakery", "to", "buy", "a", "cake"],
      },
      {
        visualCue: "He opened the umbrella because it was raining.",
        targetToken: "umbrella",
        distractorTokens: ["he", "opened", "the", "it", "was", "raining"],
      },
      {
        visualCue: "The farmer milked the tree every morning.",
        targetToken: "tree",
        distractorTokens: ["the", "farmer", "milked", "the", "cow", "every", "morning"],
      },
      {
        visualCue: "Mina wore her boots to swim in the pool.",
        targetToken: "boots",
        distractorTokens: ["mina", "wore", "her", "to", "swim", "in", "the", "pool"],
      },
      {
        visualCue: "They put the soup in the freezer to make it hot.",
        targetToken: "hot",
        distractorTokens: ["they", "put", "the", "soup", "in", "the", "freezer", "to", "make", "it", "cold"],
      },
    ],
  },
  {
    id: "q25",
    title: "Question 25",
    prompt: "Find the wrong grammatical part in the sentence.",
    instruction: "Click the wrong grammatical part as many times as you can before the timer ends.",
    audioText: "Find the wrong grammatical part.",
    audioUrl: "/gamified-test/questions/q25_v1 to q25_v5.mp3",
    interactionType: "sentenceWords",
    visualCue: "She is a end of the hall.",
    gridSize: 3,
    targetToken: "a",
    distractorTokens: ["she", "is", "at", "the", "end", "of", "the", "hall"],
    targetRepeatCount: 1,
    variants: [
      {
        visualCue: "She is a end of the hall.",
        targetToken: "a",
        distractorTokens: ["she", "is", "at", "the", "end", "of", "the", "hall"],
      },
      {
        visualCue: "I arrived to Monday morning.",
        targetToken: "to",
        distractorTokens: ["i", "arrived", "on", "monday", "morning"],
      },
      {
        visualCue: "He gave the book at his friend.",
        targetToken: "at",
        distractorTokens: ["he", "gave", "the", "book", "to", "his", "friend"],
      },
      {
        visualCue: "They are interested on music.",
        targetToken: "on",
        distractorTokens: ["they", "are", "interested", "in", "music"],
      },
      {
        visualCue: "We listened a story before bed.",
        targetToken: "a",
        distractorTokens: ["we", "listened", "to", "a", "story", "before", "bed"],
      },
    ],
  },
  {
    id: "q26",
    title: "Question 26",
    prompt: "Fix the wrong letter in the word.",
    instruction: "Click the wrong letter, then choose the correct replacement.",
    audioText: "Fix the wrong letter in the word.",
    audioUrl: "/gamified-test/questions/q26_v1 to q26_v10.mp3",
    interactionType: "letterReplacement",
    visualCue: "tabke",
    gridSize: 3,
    targetToken: "table",
    distractorTokens: ["tabke", "tabla", "tablr", "tabme", "tabre"],
    targetRepeatCount: 1,
    variants: [
      {
        visualCue: "tabke",
        targetToken: "table",
        distractorTokens: ["tabke", "tabla", "tablr", "tabme", "tabre"],
      },
      {
        visualCue: "greeb",
        targetToken: "green",
        distractorTokens: ["greeb", "grean", "greem", "greel", "greer"],
      },
      {
        visualCue: "chiar",
        targetToken: "chair",
        distractorTokens: ["chiar", "chaar", "choir", "chairr", "chier"],
      },
      {
        visualCue: "breadt",
        targetToken: "bread",
        distractorTokens: ["breadt", "briad", "breud", "broad", "breld"],
      },
      {
        visualCue: "ligth",
        targetToken: "light",
        distractorTokens: ["ligth", "lighr", "lignt", "lightt", "ligrt"],
      },
      {
        visualCue: "moues",
        targetToken: "mouse",
        distractorTokens: ["moues", "mousa", "mousr", "mousl", "moust"],
      },
      {
        visualCue: "plnat",
        targetToken: "plant",
        distractorTokens: ["plnat", "planr", "plent", "plamt", "plart"],
      },
      {
        visualCue: "houes",
        targetToken: "house",
        distractorTokens: ["houes", "housa", "housr", "hoube", "hoyse"],
      },
      {
        visualCue: "milt",
        targetToken: "milk",
        distractorTokens: ["milt", "milp", "milm", "miln", "mils"],
      },
      {
        visualCue: "leafs",
        targetToken: "leaf",
        distractorTokens: ["leafs", "leafd", "leafm", "leafn", "leafr"],
      },
    ],
  },
  {
    id: "q27",
    title: "Question 27",
    prompt: "Arrange the scrambled letters to make the correct word.",
    instruction: "Click the letters in order to arrange them and form the correct word at the top.",
    audioText: "Arrange the letters to make the word.",
    audioUrl: "/gamified-test/questions/q27_v1 to q27_v5.mp3",
    interactionType: "letterArrangement",
    visualCue: "e,v,s,e,n",
    gridSize: 3,
    targetToken: "seven",
    distractorTokens: ["sever", "sieve", "venes", "evens", "scene"],
    targetRepeatCount: 1,
    variants: [
      {
        visualCue: "e,v,s,e,n",
        targetToken: "seven",
        distractorTokens: ["sever", "sieve", "venes", "evens", "scene"],
      },
      {
        visualCue: "a,p,p,l,e",
        targetToken: "apple",
        distractorTokens: ["apply", "appel", "papel", "pearl", "allee"],
      },
      {
        visualCue: "w,a,t,e,r",
        targetToken: "water",
        distractorTokens: ["waver", "tower", "wrote", "treat", "wears"],
      },
      {
        visualCue: "s,c,h,o,o,l",
        targetToken: "school",
        distractorTokens: ["shoolc", "choosl", "cohsol", "shcool", "chools"],
      },
      {
        visualCue: "w,i,n,t,e,r",
        targetToken: "winter",
        distractorTokens: ["writer", "interw", "wintre", "twiner", "winert"],
      },
    ],
  },
  {
    id: "q28",
    title: "Question 28",
    prompt: "Tap the syllables in order to build the word.",
    instruction: "Click each syllable in the correct order to form the word shown at the top.",
    audioText: "Tap the syllables in order.",
    audioUrl: "/gamified-test/questions/q28_v1 to q28_v8.mp3",
    interactionType: "syllableArrangement",
    visualCue: "un,der,stand",
    gridSize: 3,
    targetToken: "un-der-stand",
    distractorTokens: ["understand", "unstand", "understend", "undarstand", "understand"],
    targetRepeatCount: 1,
    variants: [
      {
        visualCue: "un,der,stand",
        targetToken: "un-der-stand",
        distractorTokens: ["understand", "unstand", "understend", "undarstand", "understand"],
      },
      {
        visualCue: "hap,pi,ness",
        targetToken: "hap-pi-ness",
        distractorTokens: ["hapiness", "happyness", "happines", "hapinnes", "happiness"],
      },
      {
        visualCue: "ba,nan,a",
        targetToken: "ba-nan-a",
        distractorTokens: ["bannana", "banana", "bananna", "banena", "bannanna"],
      },
      {
        visualCue: "el,e,phant",
        targetToken: "el-e-phant",
        distractorTokens: ["elaphant", "elefant", "eliephant", "elifant", "elephant"],
      },
      {
        visualCue: "com,pu,ter",
        targetToken: "com-pu-ter",
        distractorTokens: ["computter", "compuder", "computor", "computar", "computer"],
      },
      {
        visualCue: "but,ter,fly",
        targetToken: "but-ter-fly",
        distractorTokens: ["butterflye", "batterfli", "buterffly", "butturfly", "butterfly"],
      },
      {
        visualCue: "choc,o,late",
        targetToken: "choc-o-late",
        distractorTokens: ["choclate", "choclite", "chocolat", "chokolate", "chocolate"],
      },
      {
        visualCue: "cal,en,dar",
        targetToken: "cal-en-dar",
        distractorTokens: ["calander", "callender", "callander", "calandar", "calendar"],
      },
    ],
  },
  {
    id: "q29",
    title: "Question 29",
    prompt: "Separate the connected text into a meaningful sentence by choosing the correct segmentation.",
    instruction: "Read the connected text and click the correctly separated sentence.",
    audioText: "Choose the correctly separated sentence.",
    audioUrl: "/gamified-test/questions/q29_v1 to q29_v13.mp3",
    interactionType: "sentenceSegmentationChoices",
    choiceCount: 4,
    visualCue: "iturnedtwentytwotoday",
    gridSize: 2,
    targetToken: "i turned twenty two today",
    distractorTokens: ["iturned twenty two today", "i turnedtwenty two today", "i turned twenty twotoday"],
    targetRepeatCount: 1,
    variants: [
      {
        visualCue: "iturnedtwentytwotoday",
        targetToken: "i turned twenty two today",
        distractorTokens: ["iturned twenty two today", "i turnedtwenty two today", "i turned twenty twotoday"],
      },
      {
        visualCue: "mymotherreadsmeastory",
        targetToken: "my mother reads me a story",
        distractorTokens: ["mymother reads me a story", "my motherreads me a story", "my mother reads me astory"],
      },
      {
        visualCue: "thecatsleepsonthesofa",
        targetToken: "the cat sleeps on the sofa",
        distractorTokens: ["thecat sleeps on the sofa", "the catsleeps on the sofa", "the cat sleeps onthe sofa"],
      },
      {
        visualCue: "wegototheparkwithmycousin",
        targetToken: "we go to the park with my cousin",
        distractorTokens: ["wego to the park with my cousin", "we go tothe park with my cousin", "we go to the parkwith my cousin"],
      },
      {
        visualCue: "thechocolatecakeisready",
        targetToken: "the chocolate cake is ready",
        distractorTokens: ["thechocolate cake is ready", "the chocolatecake is ready", "the chocolate cakeis ready"],
      },
      {
        visualCue: "mybrotherplayswiththeball",
        targetToken: "my brother plays with the ball",
        distractorTokens: ["mybrother plays with the ball", "my brotherplays with the ball", "my brother plays withthe ball"],
      },
      {
        visualCue: "theteacherwritesontheboard",
        targetToken: "the teacher writes on the board",
        distractorTokens: ["theteacher writes on the board", "the teacherwrites on the board", "the teacher writes onthe board"],
      },
      {
        visualCue: "shewashesherhandsbeforelunch",
        targetToken: "she washes her hands before lunch",
        distractorTokens: ["shewashes her hands before lunch", "she washesher hands before lunch", "she washes her handsbefore lunch"],
      },
      {
        visualCue: "thechildrenrunintheyard",
        targetToken: "the children run in the yard",
        distractorTokens: ["thechildren run in the yard", "the childrenrun in the yard", "the children run inthe yard"],
      },
      {
        visualCue: "wewatchamovieafterdinner",
        targetToken: "we watch a movie after dinner",
        distractorTokens: ["wewatch a movie after dinner", "we watcha movie after dinner", "we watch a movieafter dinner"],
      },
      {
        visualCue: "thebabyisplayingwithblocks",
        targetToken: "the baby is playing with blocks",
        distractorTokens: ["thebaby is playing with blocks", "the babyis playing with blocks", "the baby is playing withblocks"],
      },
      {
        visualCue: "myfriendbringsabluenotebook",
        targetToken: "my friend brings a blue notebook",
        distractorTokens: ["myfriend brings a blue notebook", "my friendbrings a blue notebook", "my friend brings ablue notebook"],
      },
      {
        visualCue: "wecleanourroomeverymorning",
        targetToken: "we clean our room every morning",
        distractorTokens: ["weclean our room every morning", "we cleanour room every morning", "we clean our roomevery morning"],
      },
    ],
  },
  {
    id: "q30",
    title: "Question 30",
    prompt: "Memorize the short letter sequence, then type it.",
    instruction: "Watch for 3 seconds, then type from memory.",
    audioText: "Memorize, then type.",
    audioUrl: "/gamified-test/questions/q30_v1 to q30_v3.mp3",
    interactionType: "typedSequenceRecall",
    visualCue: "rato",
    gridSize: 3,
    targetToken: "rato",
    targetRepeatCount: 1,
    variants: [
      {
        visualCue: "rato",
        targetToken: "rato",
        distractorTokens: [],
      },
      {
        visualCue: "luse",
        targetToken: "luse",
        distractorTokens: [],
      },
      {
        visualCue: "voni",
        targetToken: "voni",
        distractorTokens: [],
      },
    ],
  },
  {
    id: "q31",
    title: "Question 31",
    prompt: "Listen and type the word you hear.",
    instruction: "You will hear a word — type it exactly as you heard it.",
    audioText: "Listen and type the word.",
    interactionType: "typedSequenceRecall",
    gridSize: 3,
    targetToken: "cat",
    targetRepeatCount: 1,
    variants: [
      {
        visualCue: "",
        targetToken: "cat",
        distractorTokens: [],
      },
      {
        visualCue: "",
        targetToken: "dog",
        distractorTokens: [],
      },
      {
        visualCue: "",
        targetToken: "sun",
        distractorTokens: [],
      },
      {
        visualCue: "",
        targetToken: "hat",
        distractorTokens: [],
      },
      {
        visualCue: "",
        targetToken: "map",
        distractorTokens: [],
      },
      {
        visualCue: "",
        targetToken: "bed",
        distractorTokens: [],
      },
      {
        visualCue: "",
        targetToken: "fish",
        distractorTokens: [],
      },
      {
        visualCue: "",
        targetToken: "rain",
        distractorTokens: [],
      },
      {
        visualCue: "",
        targetToken: "jump",
        distractorTokens: [],
      },
      {
        visualCue: "",
        targetToken: "cake",
        distractorTokens: [],
      },
    ],
  },
  {
    id: "q32",
    title: "Question 32",
    prompt: "Listen and type the made-up word you hear.",
    instruction: "You will hear a made-up word — type it exactly as you heard it.",
    audioText: "Listen and type the made-up word.",
    interactionType: "typedSequenceRecall",
    gridSize: 3,
    targetToken: "savi",
    targetRepeatCount: 1,
    variants: [
      {
        visualCue: "",
        targetToken: "savi",
        distractorTokens: [],
      },
      {
        visualCue: "",
        targetToken: "luno",
        distractorTokens: [],
      },
      {
        visualCue: "",
        targetToken: "mibo",
        distractorTokens: [],
      },
      {
        visualCue: "",
        targetToken: "fado",
        distractorTokens: [],
      },
      {
        visualCue: "",
        targetToken: "ribo",
        distractorTokens: [],
      },
    ],
  },
];

function parseQuestionNumber(questionId: string) {
  const number = Number(questionId.replace(/^q/i, ""));
  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return number;
}

function buildQuestionLookup(questionBank: Question[]) {
  return new Map<number, Question>(
    questionBank.flatMap((question) => {
      const number = parseQuestionNumber(question.id);
      if (!number) {
        return [];
      }

      return [[number, question] as const];
    }),
  );
}

const QUESTION_LOOKUP_BY_LANGUAGE: Record<
  ExamLanguage,
  Map<number, Question>
> = {
  en: buildQuestionLookup(QUESTION_BANK),
};

export function getQuestionsByNumbers(
  questionNumbers: number[],
  language: ExamLanguage = "en",
) {
  const lookup =
    QUESTION_LOOKUP_BY_LANGUAGE[language] ?? QUESTION_LOOKUP_BY_LANGUAGE.en;

  return questionNumbers
    .map((questionNumber) => lookup.get(questionNumber))
    .filter((question): question is Question => !!question);
}

export function getQuestionBank() {
  return QUESTION_BANK;
}
