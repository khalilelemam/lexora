# 08. Games & Progress

[← Previous: Sessions & Activities](./07-sessions-activities.md) | [Back to Overview](./README.md) | [Next: Content Library →](./09-content-library.md)

---

## 📋 Overview

Gamified learning with progress tracking across educational games.

### Tables
- `games` - Available educational games
- `game_progress` - Child's overall progress per game
- `game_sessions` - Individual play sessions

---

## 🗂️ Tables

### games
Available educational games with metadata and configuration.

**Key Fields:** `code`, `name`, `max_levels`, `skills_practiced`, `is_premium`

### game_progress
Tracks child's cumulative progress in each game.

**Key Fields:** `current_level`, `highest_level_reached`, `total_score`, `current_streak_days`

### game_sessions
Individual play sessions for detailed tracking.

**Key Fields:** `level_played`, `score`, `accuracy`, `completed`

---

## 🔍 Key Queries

### Get child's game progress
```sql
SELECT 
  g.name,
  gp.current_level,
  gp.highest_level_reached,
  g.max_levels,
  gp.total_score,
  gp.average_accuracy,
  gp.current_streak_days,
  gp.last_played_at
FROM game_progress gp
JOIN games g ON g.id = gp.game_id
WHERE gp.child_id = :child_id
ORDER BY gp.last_played_at DESC;
```

---

[← Previous: Sessions & Activities](./07-sessions-activities.md) | [Back to Overview](./README.md) | [Next: Content Library →](./09-content-library.md)
