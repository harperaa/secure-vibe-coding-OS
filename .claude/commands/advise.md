---
allowed-tools: Read(**/*.md), Glob(.claude/skills/**/*.md), Grep(description:*), AskUserQuestion
description: Search skills and lessons before starting new work
---

# Step 1: Understand the User's Goal

Before starting any new work, let's review what you've learned before to avoid repeating mistakes and leverage past successes.

**What are you trying to accomplish?**

Please describe your goal in detail. I'll search through your skills and lessons library to find relevant learnings.

# Step 2: Search Skills and Lessons

Searching the following locations for relevant skills:
- `.claude/skills/lessons/` - Past learnings from previous sessions
- `.claude/skills/security/` - Security implementation patterns
- `.claude/skills/` - All custom skills

Looking for skills related to your goal...

# Step 3: Analyze and Summarize Findings

For each relevant skill found, I will provide:

## Relevant Skills Found

### [Skill Name]
**Location**: `[path/to/skill]`

**What Worked:**
- [Successful approaches from this skill]
- [Effective parameters and configurations]
- [Best practices that proved successful]

**What Failed:**
- [Failed attempts documented]
- [Pitfalls to avoid]
- [Common mistakes and how to prevent them]

**Recommended Parameters:**
- [Specific configuration values]
- [Exact command line flags]
- [Proven settings and options]

**Key Learnings:**
- [Important lessons from this skill]
- [Insights that will help with current goal]

---

## Recommendations

Based on the skills reviewed:

1. **Start with:** [Recommended first approach based on past successes]
2. **Avoid:** [Known pitfalls from failed attempts]
3. **Use these exact parameters:** [Specific values that worked]
4. **Watch out for:** [Common issues encountered]

**Suggested Next Steps:**
1. [Step-by-step plan based on learnings]
2. [...]

---

💡 **Pro Tip:** If no relevant skills are found, this is a great opportunity to document your learnings after completing this task using `/retrospective`
