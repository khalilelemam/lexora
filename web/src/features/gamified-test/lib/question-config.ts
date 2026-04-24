export type AgeGroupKey = "G1_7_8" | "G2_9_11" | "G3_12_17";

type AgeGroupConfig = {
  age_range: [number, number];
  questions: number[];
  model_file: string;
  threshold: number;
};

export const QUESTION_CONFIG: Record<AgeGroupKey, AgeGroupConfig> = {
  G1_7_8: {
    age_range: [7, 8],
    questions: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 22, 23, 30,
    ],
    model_file: "model_G1_7_8.pkl",
    threshold: 0.255,
  },
  G2_9_11: {
    age_range: [9, 11],
    questions: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22,
      23, 24, 26, 27, 28, 30,
    ],
    model_file: "model_G2_9_11.pkl",
    threshold: 0.23,
  },
  G3_12_17: {
    age_range: [12, 17],
    questions: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
      22, 23, 24, 25, 26, 27, 28, 30, 31, 32,
    ],
    model_file: "model_G3_12_17.pkl",
    threshold: 0.155,
  },
};

export const MEASURES_PER_QUESTION = [
  "Clicks",
  "Hits",
  "Misses",
  "Score",
  "Accuracy",
  "Missrate",
] as const;

export const DEMOGRAPHIC_FEATURES = [
  "Gender",
  "Nativelang",
  "Otherlang",
  "Age",
] as const;

export function getAgeGroupForAge(age: number): AgeGroupKey | null {
  if (age >= 7 && age <= 8) {
    return "G1_7_8";
  }

  if (age >= 9 && age <= 11) {
    return "G2_9_11";
  }

  if (age >= 12 && age <= 17) {
    return "G3_12_17";
  }

  return null;
}

export function getQuestionIdsForAge(age: number): number[] {
  const group = getAgeGroupForAge(age);
  if (!group) {
    return [];
  }

  return [...QUESTION_CONFIG[group].questions];
}

export function getQuestionIdsForGroup(group: AgeGroupKey): number[] {
  return [...QUESTION_CONFIG[group].questions];
}
