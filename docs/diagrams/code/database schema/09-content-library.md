# 09. Content Library

[← Previous: Games & Progress](./08-games-progress.md) | [Back to Overview](./README.md) | [Next: Exercises & Practice →](./10-exercises-practice.md)

---

## 📋 Overview

Manages reading materials (stories, articles, poems) with categorization, approval workflow, and reading history.

### Tables
- `content_types` - Categories like STORY, ARTICLE, POEM
- `content_categories` - Tags like ANIMALS, SCIENCE, HISTORY
- `content_items` - Actual reading materials
- `content_category_links` - Many-to-many mapping
- `content_reading_history` - Track what children read

---

## 🗂️ Tables

### content_items
Reading materials with difficulty levels and approval status.

**Key Fields:** `title`, `body`, `difficulty_level` (1-5), `status` (PENDING/APPROVED/REJECTED), `word_count`, `is_premium`

### content_reading_history
Tracks reading activity and completion.

**Key Fields:** `time_spent_seconds`, `completion_percentage`, `was_completed`, `rating` (1-5 stars)

---

## 🔍 Key Queries

### Get approved content for child's age
```sql
SELECT 
  ci.id,
  ci.title,
  ci.difficulty_level,
  ct.name as content_type,
  ci.word_count,
  ci.cover_image_url
FROM content_items ci
JOIN content_types ct ON ct.id = ci.content_type_id
WHERE ci.language_id = :language_id
  AND ci.status = 'APPROVED'
  AND ci.reading_age_min <= :child_age
  AND ci.reading_age_max >= :child_age
  AND (ci.is_premium = false OR :has_premium_access = true)
ORDER BY ci.difficulty_level, ci.title;
```

### Get child's reading history
```sql
SELECT 
  ci.title,
  crh.last_read_at,
  crh.completion_percentage,
  crh.time_spent_seconds / 60 as minutes_read,
  crh.rating
FROM content_reading_history crh
JOIN content_items ci ON ci.id = crh.content_id
WHERE crh.child_id = :child_id
ORDER BY crh.last_read_at DESC
LIMIT 20;
```

---

[← Previous: Games & Progress](./08-games-progress.md) | [Back to Overview](./README.md) | [Next: Exercises & Practice →](./10-exercises-practice.md)
