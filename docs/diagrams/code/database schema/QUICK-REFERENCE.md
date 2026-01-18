# Database Documentation - Quick Reference

## 📂 Documentation Structure

```
database-docs/
├── README.md                          ← START HERE
├── 01-core-reference-data.md         ✅ COMPLETE
├── 02-user-management.md             ✅ COMPLETE
├── 03-children-guardians.md          ✅ COMPLETE
├── 04-testing-assessment.md          ✅ COMPLETE
├── 05-classroom-management.md        📝 TODO
├── 06-assignments-learning.md        📝 TODO
├── 07-sessions-activities.md         📝 TODO
├── 08-games-progress.md              📝 TODO
├── 09-content-library.md             📝 TODO
├── 10-exercises-practice.md          📝 TODO
├── 11-analytics-insights.md          📝 TODO
└── lexora-database-improved.dbml     ← Full schema
```

## 🎯 What's Included

### ✅ Completed Documentation (4 domains)

Each markdown file includes:
- **Overview** - What the domain does
- **Tables** - Complete schema with column descriptions
- **Indexes** - Performance optimization
- **Relationships** - ER diagrams in Mermaid format
- **Business Rules** - Important constraints and logic
- **Common Queries** - Real SQL examples
- **API Examples** - Python code snippets
- **Best Practices** - Dos and don'ts

### 📊 Visual Features

1. **Mermaid Diagrams** - Render automatically on GitHub/GitLab
2. **Syntax Highlighting** - SQL, Python code blocks
3. **Tables** - Clean schema reference
4. **Navigation** - Links between documents

## 🚀 Quick Start

### For Developers
```bash
# Clone repository
git clone <repo-url>
cd docs/database

# Read main overview
cat README.md

# Jump to specific domain
cat 02-user-management.md

# Search for specific table
grep -r "child_guardians" .
```

### For Product/Business Teams
1. Start with [README.md](./README.md) - High-level overview
2. Review the overview diagram
3. Read domain-specific docs for your features
4. Use "Common Queries" sections to understand data access

### For DBAs
1. Review [lexora-database-improved.dbml](./lexora-database-improved.dbml)
2. Check index strategies in each domain doc
3. Review "Performance Considerations" in README
4. Implement migrations based on domain docs

## 📋 Domain Summary

### 1️⃣ Core Reference Data
- **Tables**: 2 main (languages, subscription_plans)
- **Purpose**: Static lookup data
- **Key Queries**: Get active languages, plan features

### 2️⃣ User Management
- **Tables**: 4 (users, user_subscriptions, user_preferences, notifications)
- **Purpose**: Authentication, billing, preferences
- **Key Queries**: Check subscription limits, get unread notifications

### 3️⃣ Children & Guardians
- **Tables**: 4 (children, child_guardians, child_claim_requests, child_reading_preferences)
- **Purpose**: Child profiles and multi-guardian support
- **Key Queries**: Get child's guardians, pending claims

### 4️⃣ Testing & Assessment
- **Tables**: 3 (tests, test_tasks, test_insights)
- **Purpose**: Dyslexia screening (CORE FEATURE)
- **Key Queries**: Test history, progress tracking

### 5️⃣ Classroom Management (TODO)
- **Tables**: classrooms, classroom_enrollments
- **Purpose**: Teacher classroom organization

### 6️⃣ Assignments & Learning (TODO)
- **Tables**: assignments, assignment_submissions
- **Purpose**: Homework and tracking

### 7️⃣ Sessions & Activities (TODO)
- **Tables**: learning_sessions, session_activities
- **Purpose**: Real-time learning tracking

### 8️⃣ Games & Progress (TODO)
- **Tables**: games, game_progress, game_sessions
- **Purpose**: Gamified learning

### 9️⃣ Content Library (TODO)
- **Tables**: content_types, content_items, etc.
- **Purpose**: Reading materials

### 🔟 Exercises & Practice (TODO)
- **Tables**: exercise_types, exercises, exercise_attempts
- **Purpose**: Practice questions

### 1️⃣1️⃣ Analytics & Insights (TODO)
- **Tables**: child_analytics_summary
- **Purpose**: Pre-computed reports

## 🎨 Documentation Features

### Navigation
Every page has:
```
[← Previous] | [Back to Overview] | [Next →]
```

### Consistent Sections
1. Overview
2. Tables (with schemas)
3. Relationships (Mermaid ER diagram)
4. Business Rules
5. Common Queries
6. API Examples
7. Best Practices

### Visual Hierarchy
```
# Domain Name (H1)
## Section (H2)
### Table Name (H3)
#### Subsection (H4)
```

## 💡 How to Use

### Finding Information

**"How do I query a child's tests?"**
→ Go to `04-testing-assessment.md` → "Common Queries" section

**"What are the subscription limits?"**
→ Go to `01-core-reference-data.md` → `subscription_plans` table

**"How does the claim process work?"**
→ Go to `03-children-guardians.md` → `child_claim_requests` workflow

**"What indexes exist?"**
→ Each table section shows its indexes

### Code Examples

All SQL is executable:
```sql
SELECT * FROM tests WHERE child_id = :child_id;
```

All Python is production-ready:
```python
@router.post("/tests")
async def create_test(...):
    # Real FastAPI code
```

## 🔧 Completing the Documentation

To complete the remaining 7 domains, follow this template:

### Domain Documentation Template
```markdown
# XX. Domain Name

[← Previous] | [Overview] | [Next →]

## 📋 Overview
- Purpose
- Tables list
- Key concepts

## 🗂️ Tables
### table_name
- Schema table
- Indexes
- Example data

## 🔗 Relationships
- Mermaid ER diagram

## 🎯 Business Rules
- Constraints
- Workflows

## 🔍 Common Queries
- SQL examples

## 🚀 API Examples
- Python code

## ✅ Best Practices
```

## 📦 Exporting Documentation

### To PDF
```bash
# Using pandoc
for file in *.md; do
  pandoc "$file" -o "${file%.md}.pdf" \
    --from markdown \
    --to pdf \
    --pdf-engine=xelatex
done
```

### To HTML
```bash
# Using markdown-it or similar
for file in *.md; do
  markdown "$file" > "${file%.md}.html"
done
```

### To Confluence/Notion
Copy-paste markdown directly - most platforms support it!

## 🤝 Contributing

When updating schemas:
1. Update `.dbml` file first
2. Update relevant domain documentation
3. Update Mermaid diagrams if relationships change
4. Add migration notes
5. Update this Quick Reference if adding domains

## 📞 Questions?

- **Schema Questions**: Check domain-specific documentation
- **SQL Help**: See "Common Queries" sections
- **Performance**: Review index strategies
- **Missing Info**: File an issue to complete TODO sections

---

**Next Steps**: 
1. Read [README.md](./README.md) for full overview
2. Explore completed domains (01-04)
3. Use as reference when building features
4. Help complete remaining domains (05-11)!
