# Lexora Database - Split ERD Diagrams

## 📋 Overview

The complete Lexora database has been **split into 10 focused ERD diagrams** - one for each domain. This makes it much easier to:
- **Explain** each section independently
- **Understand** specific features without cognitive overload
- **Present** to stakeholders (show only relevant parts)
- **Design** new features within a domain
- **Onboard** new team members progressively

---

## 📂 Split Diagrams

Each `.dbml` file can be copied directly to [dbdiagram.io](https://dbdiagram.io/d) to visualize.

| # | Domain | File | Tables | Purpose |
|---|--------|------|--------|---------|
| 1 | **Core Reference Data** | `01-core-reference-data.dbml` | 6 | Lookup tables: languages, plans, games, content types |
| 2 | **User Management** | `02-user-management.dbml` | 4 | Users, subscriptions, notifications, preferences |
| 3 | **Children & Guardians** | `03-children-guardians.dbml` | 4 | Child profiles, guardians, claims, reading prefs |
| 4 | **Testing & Assessment** | `04-testing-assessment.dbml` | 2 | Dyslexia tests and tasks (CORE FEATURE) |
| 5 | **Classroom Management** | `05-classroom-management.dbml` | 2 | Teacher classrooms and enrollments |
| 6 | **Assignments & Learning** | `06-assignments-learning.dbml` | 2 | Teacher assignments and submissions |
| 7 | **Sessions & Activities** | `07-sessions-activities.dbml` | 2 | Learning sessions with mixed activities |
| 8 | **Game Progress** | `08-game-progress.dbml` | 1 | Educational game progress tracking |
| 9 | **Content Library** | `09-content-library.dbml` | 3 | Reading materials and categorization |
| 10 | **Exercises & Practice** | `10-exercises-practice.dbml` | 2 | Practice exercises and progress |

---

## 🎯 How to Use These Diagrams

### For Presentations
**Show only relevant diagrams to your audience:**

```
Presenting to Product Team about testing feature?
→ Show: 04-testing-assessment.dbml

Discussing classroom features with teachers?
→ Show: 05-classroom-management.dbml + 06-assignments-learning.dbml

Onboarding new developer to content management?
→ Show: 09-content-library.dbml
```

### For Documentation
**Embed diagrams in your docs:**

1. Copy `.dbml` file content
2. Paste into dbdiagram.io
3. Export as PNG/SVG
4. Add to your documentation

### For Development
**Use as reference when building features:**

```python
# Working on assignment submission API?
# Reference: 06-assignments-learning.dbml

@router.post("/assignments/{id}/submit")
async def submit_assignment(...):
    # Check the ERD for table structure
    # assignment_completion table has:
    # - assignment_id
    # - child_id
    # - completed_at
    # - score
    # - time_spent_seconds
```

### For Database Design
**Focus on one domain at a time:**

```sql
-- Adding new feature to classroom domain?
-- Reference: 05-classroom-management.dbml

-- See that classroom has:
-- - join_code (unique)
-- - is_active (boolean)
-- - teacher_id (FK to user)

-- And classroom_enrollment tracks:
-- - enrolled_at
-- - unenrolled_at (null = still active)
```

---

## 🔗 Cross-Domain Relationships

Some tables appear in multiple diagrams as **reference tables**:

### Frequently Referenced Tables

**`user` (User Management)**
- Referenced in: Children & Guardians, Testing, Classroom, Assignments, Sessions, Content, Exercises
- Why: Users create/own/conduct activities across all domains

**`child` (Children & Guardians)**
- Referenced in: Testing, Classroom, Assignments, Sessions, Games, Exercises
- Why: Children are the main subjects performing activities

**`language` (Core Reference Data)**
- Referenced in: Children, Classroom, Content, Exercises
- Why: Language selection affects available content

**`game`, `content`, `exercise_type` (Core Reference Data)**
- Referenced in: Assignments, Sessions
- Why: These are the activity types that can be assigned or included in sessions

### How to Handle References

In the split diagrams, reference tables are shown **simplified**:

```dbml
// In 04-testing-assessment.dbml
Table user {
  id uuid [pk]
  name varchar [not null]
  
  Note: 'Reference only - from User Management'
}
```

This indicates:
- ✅ The full definition is in another diagram (02-user-management.dbml)
- ✅ Only essential fields shown for clarity
- ✅ Relationships still visible

---

## 📖 Explanation Flow (Recommended Order)

### For Complete Understanding
Go through diagrams in this order:

1. **01-core-reference-data.dbml** - Foundation (lookup tables)
2. **02-user-management.dbml** - Who uses the system
3. **03-children-guardians.dbml** - Who we're helping
4. **04-testing-assessment.dbml** - Core feature (dyslexia screening)
5. **05-classroom-management.dbml** - How teachers organize
6. **06-assignments-learning.dbml** - What teachers assign
7. **07-sessions-activities.dbml** - How children learn
8. **08-game-progress.dbml** - Gamification tracking
9. **09-content-library.dbml** - Reading materials
10. **10-exercises-practice.dbml** - Practice questions

### For Feature-Specific Learning
Jump directly to relevant diagrams:

**Building parent dashboard?**
→ 03 (Children) + 04 (Testing) + 07 (Sessions) + 08 (Games)

**Building teacher portal?**
→ 05 (Classroom) + 06 (Assignments) + 04 (Testing)

**Building content management?**
→ 09 (Content) + 10 (Exercises)

---

## 🎨 Visual Tips for dbdiagram.io

### Viewing in dbdiagram.io

1. **Copy file content** from any `.dbml` file
2. **Paste into** [dbdiagram.io](https://dbdiagram.io/d)
3. **Auto-layout**: Use the "Auto arrange" button for clean layout
4. **Export**: Download as PNG, SVG, or PDF

### Customizing Colors

You can add color groups in dbdiagram.io:

```dbml
// Add to the bottom of any diagram
TableGroup "Core Tables" {
  user
  child
}

TableGroup "Activity Tables" {
  assignment
  assignment_completion
}
```

### Adding Notes

Each diagram includes inline notes:
- Table notes explain purpose
- Column notes explain usage
- Workflow sections explain business logic

---

## 💡 Best Practices

### When Presenting
1. **Start with context**: Show overview first, then dive into specific domain
2. **One diagram at a time**: Don't show all 10 at once
3. **Explain relationships**: Point out FKs and how tables connect
4. **Use examples**: "When a teacher creates an assignment..."

### When Documenting
1. **Embed diagrams**: Visual reference in docs
2. **Link to dbdiagram.io**: Let people explore interactively
3. **Include workflows**: Explain the process flow
4. **Show sample data**: Real examples help understanding

### When Developing
1. **Pin relevant diagram**: Keep it visible while coding
2. **Check constraints**: Note unique indexes, FKs
3. **Understand enums**: Know valid values before querying
4. **Follow naming**: Match table/column names in code

---

## 🔄 Keeping Diagrams Updated

When modifying the database:

1. **Update the appropriate `.dbml` file**
2. **Update cross-references** if adding/removing relationships
3. **Test in dbdiagram.io** to ensure it renders correctly
4. **Update related documentation** in the docs folder
5. **Export new visuals** for embedding

---

## 📦 Complete Package Structure

```
erd-diagrams/
├── README.md (this file)
├── 01-core-reference-data.dbml
├── 02-user-management.dbml
├── 03-children-guardians.dbml
├── 04-testing-assessment.dbml
├── 05-classroom-management.dbml
├── 06-assignments-learning.dbml
├── 07-sessions-activities.dbml
├── 08-game-progress.dbml
├── 09-content-library.dbml
└── 10-exercises-practice.dbml
```

---

## 🚀 Quick Start Examples

### Example 1: Explain Testing Feature to Product Manager

**Files to use:** `04-testing-assessment.dbml`

**Presentation flow:**
1. Open diagram in dbdiagram.io
2. Point to `test` table: "This stores each dyslexia screening test"
3. Point to `test_task` table: "Each test has 3 reading tasks"
4. Explain workflow (included in diagram notes)
5. Show sample data in table notes

### Example 2: Onboard Developer to Classroom Feature

**Files to use:** `05-classroom-management.dbml` + `06-assignments-learning.dbml`

**Presentation flow:**
1. Show `05-classroom-management.dbml`:
   - How teachers create classrooms
   - How students enroll via join_code
2. Show `06-assignments-learning.dbml`:
   - How teachers assign work
   - How students submit
3. Connect the two: assignments belong to classrooms

### Example 3: Design New Analytics Feature

**Files to use:** Multiple domains as needed

**Design flow:**
1. Identify which tables you need data from
2. Open relevant diagrams
3. Map relationships between tables
4. Plan JOIN queries based on FK relationships
5. Ensure all needed data is available

---

## ✅ Benefits of Split Diagrams

✅ **Reduced Complexity** - 6-10 tables per diagram vs 30+ in full schema
✅ **Focused Discussions** - Talk about one domain at a time
✅ **Easier Onboarding** - Learn system piece by piece
✅ **Better Presentations** - Show only what matters to audience
✅ **Clear Boundaries** - Understand domain separation
✅ **Faster Reference** - Find relevant tables quickly
✅ **Independent Updates** - Modify one domain without confusion

---

## 🤝 Contributing

When adding new tables:
1. Determine which domain it belongs to
2. Add to appropriate `.dbml` file
3. Update cross-references if needed
4. Test rendering in dbdiagram.io
5. Update this README if adding new domain

---

**Next Steps:**
1. Open any `.dbml` file
2. Copy content to https://dbdiagram.io/d
3. Explore the visualization!
