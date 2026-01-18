# 11. Analytics & Insights

[← Previous: Exercises & Practice](./10-exercises-practice.md) | [Back to Overview](./README.md)

---

## 📋 Overview

Pre-computed analytics summaries for fast reporting and dashboard displays. Reduces need for complex real-time aggregation queries.

### Tables
- `child_analytics_summary` - Daily, weekly, monthly activity summaries

---

## 🗂️ Tables

### child_analytics_summary

Pre-computed analytics rolled up by time period (daily, weekly, monthly).

**Schema:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `child_id` | uuid | Child being tracked |
| `period_type` | analytics_period | DAILY, WEEKLY, MONTHLY, YEARLY |
| `period_start` | date | Period start date |
| `period_end` | date | Period end date |
| **Activity Metrics** |
| `total_sessions` | int | Learning sessions count |
| `total_time_minutes` | int | Total active time |
| `activities_completed` | int | Activities finished |
| **Performance Metrics** |
| `average_score` | float | Mean score across activities |
| `average_accuracy` | float | Mean accuracy (0-1) |
| `improvement_rate` | float | Change vs previous period |
| **Content Breakdown** |
| `reading_time_minutes` | int | Time spent reading |
| `games_time_minutes` | int | Time playing games |
| `exercises_time_minutes` | int | Time on exercises |
| **Engagement** |
| `login_days` | int | Days active in period |
| `longest_streak` | int | Consecutive active days |

**Indexes:**
```sql
CREATE INDEX idx_analytics_child ON child_analytics_summary(child_id);
CREATE UNIQUE INDEX idx_analytics_unique_period 
  ON child_analytics_summary(child_id, period_type, period_start);
```

---

## 🎯 Business Rules

1. **Automated Generation**: Summaries generated daily via cron job
2. **Immutable History**: Once created, summaries are not modified (new data creates new periods)
3. **Aggregation Levels**: Daily → Weekly → Monthly → Yearly rollups
4. **Performance**: Reading from summaries is 100x faster than live aggregation

---

## 🔍 Key Queries

### Get weekly progress for last 8 weeks
```sql
SELECT 
  period_start,
  period_end,
  total_time_minutes,
  total_sessions,
  average_score,
  reading_time_minutes,
  games_time_minutes,
  exercises_time_minutes,
  login_days,
  improvement_rate
FROM child_analytics_summary
WHERE child_id = :child_id
  AND period_type = 'WEEKLY'
ORDER BY period_start DESC
LIMIT 8;
```

### Compare months year-over-year
```sql
SELECT 
  EXTRACT(MONTH FROM period_start) as month,
  EXTRACT(YEAR FROM period_start) as year,
  total_time_minutes,
  average_score,
  activities_completed
FROM child_analytics_summary
WHERE child_id = :child_id
  AND period_type = 'MONTHLY'
  AND period_start >= CURRENT_DATE - INTERVAL '24 months'
ORDER BY period_start;
```

### Get current week summary
```sql
SELECT *
FROM child_analytics_summary
WHERE child_id = :child_id
  AND period_type = 'WEEKLY'
  AND period_start <= CURRENT_DATE
  AND period_end >= CURRENT_DATE;
```

---

## 🚀 Generation Script

**Daily Cron Job (runs at 1 AM):**
```sql
-- Generate yesterday's daily summary
INSERT INTO child_analytics_summary (
  child_id, period_type, period_start, period_end,
  total_sessions, total_time_minutes, activities_completed,
  average_score, average_accuracy,
  reading_time_minutes, games_time_minutes, exercises_time_minutes,
  login_days, longest_streak
)
SELECT 
  c.id,
  'DAILY',
  CURRENT_DATE - 1,
  CURRENT_DATE - 1,
  COUNT(DISTINCT ls.id),
  SUM(sa.time_spent_seconds) / 60,
  COUNT(sa.id) FILTER (WHERE sa.completed_at IS NOT NULL),
  AVG(sa.score),
  AVG(sa.accuracy),
  SUM(sa.time_spent_seconds) FILTER (WHERE sa.activity_type = 'READING') / 60,
  SUM(sa.time_spent_seconds) FILTER (WHERE sa.activity_type = 'GAME') / 60,
  SUM(sa.time_spent_seconds) FILTER (WHERE sa.activity_type = 'EXERCISE') / 60,
  1, -- login_days (if any activity, they logged in)
  1  -- will be calculated separately for streaks
FROM children c
LEFT JOIN learning_sessions ls ON ls.child_id = c.id
  AND DATE(ls.started_at) = CURRENT_DATE - 1
LEFT JOIN session_activities sa ON sa.session_id = ls.id
GROUP BY c.id
HAVING COUNT(DISTINCT ls.id) > 0;  -- Only create if had activity
```

---

## ✅ Best Practices

1. **Background Processing**: Generate summaries in background jobs, not during user requests
2. **Cache Invalidation**: If data changes, regenerate affected summaries
3. **Retention**: Keep daily summaries for 90 days, weekly for 2 years, monthly forever
4. **Dashboard Speed**: Always query summaries for dashboards, never aggregate live data
5. **Comparison Queries**: Use summaries for period-over-period comparisons

---

## 📊 Analytics Use Cases

**Parent Dashboard:**
- Weekly progress chart (8 weeks)
- Month-over-month improvement
- Activity breakdown pie chart
- Streak tracking

**Teacher Dashboard:**
- Classroom average scores by week
- Student engagement heatmap
- Performance trends

**Admin Analytics:**
- Platform-wide usage statistics
- Content popularity by age group
- Feature adoption rates

---

[← Previous: Exercises & Practice](./10-exercises-practice.md) | [Back to Overview](./README.md)
