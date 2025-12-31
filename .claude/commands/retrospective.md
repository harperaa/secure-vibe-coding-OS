---
allowed-tools: Read(**/SKILL.md), Write(.claude/skills/lessons/**/SKILL.md), Bash(git checkout:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(gh pr create:*)
description: Save learnings from current session as a new skill
---

# Session Retrospective - Capture Your Learnings

Let me help you document what you learned during this session so you can reference it in future work.

## Step 1: Summarize Key Findings

**Analyzing this conversation to extract:**
- Primary goal and what you were trying to accomplish
- Approaches that worked successfully
- Failed attempts and what went wrong
- Final working solution with exact parameters
- Key insights and lessons learned

## Step 2: Create Skill Documentation

**Creating new skill in:** `.claude/skills/lessons/[topic-name]/`

The skill will include:

### SKILL.md Structure:

```markdown
---
description: [Detailed description with trigger phrases from your conversation - MUST be verbose and specific, include exact keywords and phrases that came up during the session]
triggers:
  - "[Key phrase 1 from conversation]"
  - "[Key phrase 2 from conversation]"
  - "[Key phrase 3 from conversation]"
---

# [Skill Title]

## Goal

[What you were trying to accomplish - specific and measurable]

## Context

[The situation, technologies involved, constraints, and environment]

## What Worked ✅

### Approach
[The successful approach in detail]

### Exact Parameters
```[language]
[Exact code, commands, or configuration that worked]
```

**Key Settings:**
- `parameter_name`: `exact_value` - [Why this value worked]
- `another_param`: `specific_value` - [Reasoning]

### Why It Worked
[Technical explanation of why this approach succeeded]

## Failed Attempts ❌

| Attempt | What We Tried | Why It Failed | Lesson Learned |
|---------|---------------|---------------|----------------|
| 1 | [Specific approach] | [Root cause of failure] | [What to avoid] |
| 2 | [Another approach] | [Why it didn't work] | [Key insight] |
| 3 | [Third attempt] | [Failure reason] | [Takeaway] |

## Lessons Learned 📚

### Key Insights
1. **[Insight 1]**: [Detailed explanation]
2. **[Insight 2]**: [Detailed explanation]
3. **[Insight 3]**: [Detailed explanation]

### Best Practices
- [Specific best practice with reasoning]
- [Another best practice with evidence]
- [Third best practice with explanation]

### Pitfalls to Avoid
- ⚠️ **[Pitfall 1]**: [How to avoid it]
- ⚠️ **[Pitfall 2]**: [Prevention strategy]
- ⚠️ **[Pitfall 3]**: [What to do instead]

## Final Working Solution

### Complete Implementation
```[language]
[Full working code or configuration]
```

### Exact Hyperparameters
- **[Parameter 1]**: `[exact_value]`
  - **Range tested**: [min] to [max]
  - **Optimal value**: `[exact_value]`
  - **Why**: [Reasoning]

- **[Parameter 2]**: `[exact_value]`
  - **Alternatives tried**: [list]
  - **Winner**: `[exact_value]`
  - **Impact**: [Measurable result]

### Verification
[How to verify the solution works]

```bash
[Exact commands to test the solution]
```

**Expected output:**
```
[What success looks like]
```

## Related Skills

- [Related skill 1] - [Why it's relevant]
- [Related skill 2] - [Connection point]

## When to Use This Skill

**Use this when:**
- [Specific scenario 1]
- [Specific scenario 2]
- [Specific scenario 3]

**Don't use this when:**
- [Scenario where this doesn't apply]
- [Alternative approach scenario]

## Quick Reference

```bash
# Copy-paste ready commands
[command 1]
[command 2]
[command 3]
```

## Future Improvements

- [ ] [Potential enhancement]
- [ ] [Area for optimization]
- [ ] [Next iteration idea]

---

**Created**: [Date]
**Session Duration**: [Approximate time]
**Success Rate**: [X/Y attempts succeeded]
```

## Step 3: Create Branch and PR

```bash
# Create feature branch
git checkout -b skill/[topic-name]

# Add the new skill
git add .claude/skills/lessons/[topic-name]/

# Commit with descriptive message
git commit -m "Add lesson: [topic-name]

Documented learnings from session including:
- [Key point 1]
- [Key point 2]
- [Key point 3]

Success rate: [X/Y attempts]
Final solution: [Brief description]"

# Push branch
git push -u origin skill/[topic-name]

# Create PR
gh pr create --title "Lesson: [Topic Name]" --body "$(cat <<'EOF'
## Session Summary
[Brief overview of what was accomplished]

## Key Learnings
- ✅ [What worked]
- ❌ [What failed]
- 💡 [Key insights]

## Skill Location
`.claude/skills/lessons/[topic-name]/SKILL.md`

## Value
This skill will help future sessions by:
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

## Review Checklist
- [ ] Description field is verbose with trigger phrases
- [ ] Failed Attempts table is complete
- [ ] Exact hyperparameters are documented (no vague advice)
- [ ] Code examples are copy-paste ready
- [ ] Lessons learned are actionable

EOF
)"
```

---

## Skill Quality Checklist

Before finalizing, verify:

- ✅ **Description field** includes 5+ specific trigger phrases from conversation
- ✅ **Failed Attempts table** documents at least 2 failures with root causes
- ✅ **Hyperparameters** are EXACT values, not ranges or "tune as needed"
- ✅ **Code examples** are complete and runnable
- ✅ **Lessons learned** are specific and actionable
- ✅ **Success criteria** are measurable
- ✅ **Related skills** are linked for context

---

💡 **Pro Tip:** The more specific and detailed your skill documentation, the more valuable it will be in future sessions. Include exact error messages, specific version numbers, and concrete examples.
