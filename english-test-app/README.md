# English Dyslexia Screening MVP

A Next.js MVP inspired by the PLOS-style gamified screening flow.

## What Is Implemented

- Intake screen and test session lifecycle.
- Timed Whac-A-Mole style grid interaction.
- Voice instruction before each question.
- Circular progress timer in active question view.
- Retake rule if the student makes no click in a question.
- Final result page with per-question features.

## Question Coverage

- Q1 to Q4: Letter mapping tasks (letters: e, g, b, d).
  - Goal: alphabetic awareness, phonological awareness, visual discrimination.
- Q5 to Q9: Syllable mapping tasks (ba, gar, pla, bla, str).
  - Goal: phonological awareness, syllabic awareness, auditory discrimination.
- Q10 to Q13: Word mapping tasks (spoken word to spelling, with similar words/pseudo-words).
  - Goal: lexical awareness, auditory working memory, auditory discrimination.
- Q14 to Q17: Visual discrimination letter-search tasks using highly similar letter sets.
  - Goal: visual discrimination, categorization, executive functions.

### Grid Rules

- Q1: 3x3
- Q2: 4x4
- Q3: 5x5
- Q4: 6x6
- Q5: 5x5, 2-letter syllables
- Q6: 5x5, 3-letter syllables
- Q7: 5x5, 3-letter syllables
- Q8: 5x5, 3-letter syllables
- Q9: 6x6, 4-letter syllables
- Q10: 3x3, 4-letter word
- Q11: 4x4, 4-letter word
- Q12: 4x4, 5-letter word
- Q13: 4x4, 6-letter word
- Q14: 5x5, visual pair discrimination
- Q15: 5x5, visual pair discrimination
- Q16: 5x5, visual pair discrimination
- Q17: 5x5, visual pair discrimination

Each generated grid places the correct target token 3 times.

## Feature Extraction (Dataset Style)

For each question N, the app computes:

- ClicksN
- HitsN
- MissesN
- ScoreN
- AccuracyN
- MissrateN

## Important Behavioral Rule

If a question ends with zero clicks, the student must retake the same question.

## Project Structure

- src/app/page.tsx: intake/start
- src/app/test/[sessionId]/page.tsx: core test engine
- src/app/result/[sessionId]/page.tsx: final output
- src/app/api/session/start/route.ts: start session
- src/app/api/session/[id]/event/route.ts: event logging
- src/app/api/session/[id]/finish/route.ts: finish and score
- src/app/api/session/[id]/result/route.ts: fetch result
- src/lib/questions.ts: question bank
- src/lib/types.ts: shared types
- src/lib/scoring.ts: metric aggregation + placeholder probability
- src/lib/session-store.ts: runtime JSON-backed persistence
- src/lib/voice.ts: browser speech synthesis helper

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Quality Checks

```bash
npm run lint
npm run build
```

## Current Storage

Session state is stored as JSON files under .runtime-sessions for MVP stability across route workers.

For production, use PostgreSQL (or equivalent) with Prisma.

## How We Will Add The Remaining 28 Questions

Add entries to src/lib/questions.ts using this shape:

```ts
{
  id: "q10",
  title: "Question 10",
  prompt: "Find the syllable ...",
  instruction: "Click the syllable ... before timer ends.",
  audioText: "Find the syllable ...",
  gridSize: 5,
  targetToken: "...",
  distractorTokens: ["...", "...", "..."],
}
```

### Authoring Rules

- Keep ids sequential and unique.
- Keep audio text short and clear.
- Keep distractors phonologically and orthographically close to target.
- Keep token length consistent with question objective.
- Keep order aligned with your dataset feature mapping.

## Next Steps

1. Add Q18 to Q32 in question bank.
2. Replace placeholder scoring with real model inference endpoint.
3. Move session persistence to database.
4. Add question-bank validator script (ids, token lengths, distractor quality).
