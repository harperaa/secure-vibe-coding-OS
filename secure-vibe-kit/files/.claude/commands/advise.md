---
allowed-tools: Read(.claude/skills/**/SKILL.md:0-50), AskUserQuestion
description: Search skills and lessons before starting new work using progressive disclosure
---

# IMPORTANT: Progressive Disclosure Pattern

**Use Claude Code's built-in progressive disclosure to find relevant skills efficiently:**

1. Claude will match skills based on the user's goal without reading entire files
2. Present matched skill names to user
3. Ask which skills to explore
4. Read ONLY requested sections (What Worked, Failed Attempts, Parameters, Lessons Learned)
5. Never read full 400-line skill files

**Efficiency Rule**: Aim to read <100 total lines across all skills explored.

---

# Step 1: Understand the User's Goal

Before starting any new work, let's review what you've learned before to avoid repeating mistakes and leverage past successes.

**What are you trying to accomplish?**

Please describe your goal in detail. I'll search through your skills and lessons library to find relevant learnings.

---

# Step 2: Find Relevant Skills Using Progressive Disclosure

**Use Claude Code's built-in skill discovery:**

Ask Claude to identify skills relevant to the user's goal. Claude will use progressive disclosure to match skills from:
- `.claude/skills/lessons/` - Past learnings from previous sessions
- `.claude/skills/security/` - Security implementation patterns
- `.claude/skills/` - All custom skills

**Important**: Do NOT manually Glob/Grep. Claude's built-in skill system will find matches efficiently based on the user's described goal without reading entire files.

---

# Step 3: Present Matches to User

**Present the matched skills found through progressive disclosure:**

```
## 🔍 Found [N] Relevant Skills

Based on your goal, these skills might help:

1. **[skill-name-1]** - [Brief description of what it covers]
2. **[skill-name-2]** - [Brief description of what it covers]
3. **[skill-name-3]** - [Brief description of what it covers]

Would you like me to explore any of these skills in detail?
```

**Note**: At this point, NO files have been read yet - only matched through progressive disclosure.

---

# Step 4: Get User Selection

**Use AskUserQuestion**:

**Question**: "Which skills would you like to explore?"

**Options** (dynamically generated from matches):
1. Skill 1 name
2. Skill 2 name
3. Skill 3 name
4. All of them
5. None - just proceed with my task

**MultiSelect**: true (allow multiple selections)

---

# Step 5: Read ONLY Selected Sections

For each selected skill, **ask the user which sections they need**:

Use AskUserQuestion:

**Question**: "What information do you need from [skill-name]?"

**Options**:
1. Just the summary (What Worked + What Failed)
2. Exact parameters and configurations
3. Full lessons learned
4. Everything

**Then read ONLY those specific sections** - typically 10-30 lines per section instead of 400-line full files.

**Context Target**:
- Option 1: ~10-30 lines
- Option 2: ~5-15 lines
- Option 3: ~10-20 lines
- Option 4: Full file (only if user explicitly requests)

---

# Step 6: Summarize Findings

Present ONLY the sections requested:

```markdown
## 📊 Findings from [Skill Name]

### ✅ What Worked
- [Key point 1]
- [Key point 2]

### ❌ What Failed
- [Failed attempt 1]: [Why] → [Lesson]
- [Failed attempt 2]: [Why] → [Lesson]

### 🔧 Exact Parameters (if requested)
- `param1`: `value` - [Reasoning]
- `param2`: `value` - [Reasoning]

### 💡 Key Learnings (if requested)
- [Insight 1]
- [Insight 2]
```

---

# Step 7: Provide Recommendations

Based ONLY on the selected sections reviewed:

```markdown
## 🎯 Recommendations for Your Task

**Start with**:
- [Recommended approach from "What Worked" sections]

**Avoid**:
- [Pitfalls from "What Failed" sections]

**Use these exact values**:
- [Parameters from selected skills]

**Next Steps**:
1. [Actionable step based on learnings]
2. [...]
```

---

## Context Management Summary

**Efficiency Through Progressive Disclosure**:
- Claude's built-in skill system matches relevant skills WITHOUT reading files
- Only read specific sections the user requests
- Target: <100 total lines read across all skills
- Example: 3 skills × ~30 lines each = ~90 lines (vs 1200+ lines if reading full files)

**Key Principle**: Let Claude's progressive disclosure do the heavy lifting - don't manually search or read entire files.

---

💡 **Pro Tip:** If no relevant skills are found, this is a great opportunity to document your learnings after completing this task using `/retrospective`
