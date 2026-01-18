# 10. Exercises & Practice

[← Previous: Content Library](./09-content-library.md) | [Back to Overview](./README.md) | [Next: Analytics & Insights →](./11-analytics-insights.md)

---

## 📋 Overview

Practice exercises for skill building with detailed attempt tracking and progress analytics.

### Tables
- `exercise_types` - Categories like PHONICS, COMPREHENSION, VOCABULARY
- `exercises` - Individual practice questions
- `exercise_progress` - Aggregate statistics per child per type
- `exercise_attempts` - Individual answer attempts

---

## 🗂️ Tables

### exercises
Practice questions with multiple answer types.

**Key Fields:** `question`, `answer_type` (MULTIPLE_CHOICE, TRUE_FALSE, FILL_BLANK), `correct_answer`, `answer_options` (JSON), `difficulty_level`

### exercise_attempts
Tracks every answer attempt for learning analytics.

**Key Fields:** `child_answer`, `is_correct`, `time_seconds`, `from_assignment_id`, `from_session_id`

### exercise_progress
Aggregated stats per child per exercise type.

**Key Fields:** `total_attempts`, `correct_attempts`, `accuracy_rate`, `average_time_seconds`

---

## 🔍 Key Queries

### Get exercise progress summary
```sql
SELECT 
  et.name as exercise_type,
  ep.total_attempts,
  ep.correct_attempts,
  ROUND(ep.accuracy_rate * 100, 1) as accuracy_percentage,
  ROUND(ep.average_time_seconds, 1) as avg_seconds,
  ep.last_attempted_at
FROM exercise_progress ep
JOIN exercise_types et ON et.id = ep.exercise_type_id
WHERE ep.child_id = :child_id
ORDER BY ep.last_attempted_at DESC;
```

### Get recent attempts with results
```sql
SELECT 
  e.question,
  et.name as type,
  ea.child_answer,
  e.correct_answer,
  ea.is_correct,
  ea.time_seconds,
  ea.attempted_at
FROM exercise_attempts ea
JOIN exercises e ON e.id = ea.exercise_id
JOIN exercise_types et ON et.id = e.exercise_type_id
WHERE ea.child_id = :child_id
ORDER BY ea.attempted_at DESC
LIMIT 20;
```

---

[← Previous: Content Library](./09-content-library.md) | [Back to Overview](./README.md) | [Next: Analytics & Insights →](./11-analytics-insights.md)
