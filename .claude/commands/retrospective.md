---
allowed-tools: Read(**/SKILL.md), Write(.claude/skills/lessons/**/SKILL.md), Edit(.claude/skills/**/SKILL.md), Glob(.claude/skills/**/*.md), Bash(git status:*), Bash(git checkout:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git merge:*), Bash(gh pr create:*), AskUserQuestion
description: Save learnings from current session as a new skill and update related existing skills
---

# Session Retrospective - Capture Your Learnings

Let me help you document what you learned during this session so you can reference it in future work.

## Step 0: Check Working Directory Status

**IMPORTANT**: Before creating a retrospective, ensure your working directory is clean.

### Check for Unstaged Changes

```bash
git status
```

**If there are unstaged or uncommitted changes:**

```
⚠️  WARNING: You have uncommitted changes in your working directory!

Changes not staged for commit:
  modified:   src/some-file.ts
  modified:   lib/another-file.ts

Untracked files:
  new-feature.ts

🛑 STOP: Please commit or stash your changes before running retrospective.

Why? The retrospective will create a clean commit containing ONLY:
- Your new lesson documentation
- Updates to existing skills (if any)

Mixing this with other work makes the history unclear and harder to review.

Please do one of the following:

Option A: Commit your current work
  git add .
  git commit -m "Your work description"

Option B: Stash your changes temporarily
  git stash push -m "WIP: saving before retrospective"
  # After retrospective is done, restore with:
  # git stash pop

Then run /retrospective again.
```

**Exit retrospective - do not proceed.**

---

**If working directory is clean:**

```
✅ Working directory is clean. Proceeding with retrospective...
```

Continue to Step 1.

---

## Step 1: Choose Workflow

**ASK THE USER:** How would you like to save your learnings?

Use AskUserQuestion to present these options:

**Question**: "How would you like to save this lesson?"

**Options**:

1. **Direct to Main** (Recommended for solo developers)
   - Quick and simple
   - Commit directly to main branch
   - Lesson immediately available
   - No PR review needed

2. **Branch + Pull Request** (Recommended for teams)
   - Create feature branch
   - Push and create PR for review
   - Team can review before merging
   - Better for collaborative projects

**Based on their choice, proceed with the corresponding workflow in Step 5.**

## Step 2: Summarize Key Findings

**Analyzing this conversation to extract:**
- Primary goal and what you were trying to accomplish
- Approaches that worked successfully
- Failed attempts and what went wrong
- Final working solution with exact parameters
- Key insights and lessons learned

## Step 3: Create Skill Documentation

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

## Step 4: Identify and Update Existing Skills

**IMPORTANT**: Before committing the new lesson, analyze whether existing skills should be updated based on what you learned.

### 4.1: Scan Existing Skills

Search for related skills in:
- `.claude/skills/security/*/SKILL.md` - Security implementation skills
- `.claude/skills/*/SKILL.md` - Other skills
- Exclude: `.claude/skills/lessons/` (those are past lessons)

Look for skills related to:
- The technologies you worked with (e.g., CSRF, rate limiting, Clerk, Convex)
- The problem you solved (e.g., authentication, validation, error handling)
- The patterns you used (e.g., middleware, wrappers, hooks)

### 4.2: Analyze What Should Be Updated

For each related skill, determine if you should add:

**Failed Attempts:**
- Did you discover a new way things can fail?
- Should this be added to the skill's "Failed Attempts" table?
- Example: "Tried Redis for rate limiting but too complex for this use case"

**Better Parameters:**
- Did you find more optimal values than what's documented?
- Example: Skill says "5-10 requests/min", you found 5 works best

**New Best Practices:**
- Did you discover a best practice not in the skill?
- Example: "Always set CLERK_WEBHOOK_SECRET in Convex dashboard, not .env.local"

**Pitfalls to Avoid:**
- Did you hit a gotcha that's not documented?
- Example: "Webhook signature validation fails if body is parsed before validation"

**Updated Code Examples:**
- Is there a better implementation than what's shown?
- Example: More robust error handling, better TypeScript types

### 4.3: Present Proposed Updates to User

Create a summary of proposed updates:

```markdown
## 📊 Proposed Updates to Existing Skills

Based on your session learnings, the following skills should be updated:

### 1. csrf-protection/SKILL.md

**Proposed Changes:**

**Add to Failed Attempts:**
| Attempt | What We Tried | Why It Failed | Lesson Learned |
|---------|---------------|---------------|----------------|
| X | Validating CSRF after body parsing | Signature mismatch | Always validate before parsing |

**Update Best Practices Section:**
- Add: "Validate CSRF token before any body parsing to prevent signature errors"

**Update Code Example:**
\`\`\`typescript
// BEFORE (in skill):
export const POST = withCsrf(handler);

// AFTER (your better version):
export const POST = async (req: NextRequest) => {
  // Validate CSRF before parsing
  const csrfValid = await validateCsrf(req);
  if (!csrfValid) return unauthorizedResponse();

  return withCsrf(handler)(req);
};
\`\`\`

**Reasoning:** Your session revealed that parsing body before CSRF validation causes failures.

---

### 2. rate-limiting/SKILL.md

**Proposed Changes:**

**Update Exact Parameters Section:**
- Change: "5-10 requests per minute"
- To: "5 requests per minute (optimal based on production testing)"
- Add: "Testing showed 10 req/min allowed some abuse patterns"

**Add to Lessons Learned:**
- "Start with conservative limits (5 req/min) and increase based on monitoring, not the reverse"

**Reasoning:** Your testing found specific optimal values that improve the skill's guidance.

---

Total Skills to Update: 2
Total Changes: 5

Would you like to apply these updates? (yes/no)
```

### 4.4: Get User Permission

Use AskUserQuestion:

**Question:** "Should we update existing skills based on your learnings?"

**Options:**
1. **Yes, update all** - Apply all proposed changes
2. **Let me review** - Show me each change for individual approval
3. **No, just create the lesson** - Skip updating existing skills

### 4.5: Apply Updates (If Approved)

If user approves:

**For "Yes, update all":**
- Apply all proposed changes to existing skills
- Include updated skills in the git commit
- Commit message includes both new lesson AND skill updates

**For "Let me review":**
- Walk through each proposed change
- Ask yes/no for each one
- Apply approved changes
- Include in git commit

**For "No, just create the lesson":**
- Skip to Step 5 with only the new lesson

### 4.6: Update Commit Message

If skills were updated, enhance the commit message:

```bash
git commit -m "Add lesson: [topic-name] and update related skills

New Lesson:
- Created: .claude/skills/lessons/[topic-name]/SKILL.md
- Documented: [brief summary]

Updated Existing Skills:
- csrf-protection: Added failed attempt, updated best practices
- rate-limiting: Updated optimal parameters based on testing

Session learnings:
- [Key point 1]
- [Key point 2]
- [Key point 3]

Success rate: [X/Y attempts]
Final solution: [Brief description]"
```

---

## Step 5: Save to Git Repository

### Workflow A: Direct to Main

```bash
# Add the new lesson and any updated existing skills
git add .claude/skills/lessons/[topic-name]/
git add .claude/skills/security/**/SKILL.md  # If security skills were updated
git add .claude/skills/**/SKILL.md          # If other skills were updated

# Commit with descriptive message
git commit -m "Add lesson: [topic-name] and update related skills

New Lesson:
- Created: .claude/skills/lessons/[topic-name]/SKILL.md
- Documented learnings from session

Updated Existing Skills:
- [skill-name]: [what was updated]
- [skill-name]: [what was updated]

Session learnings:
- [Key point 1]
- [Key point 2]
- [Key point 3]

Success rate: [X/Y attempts]
Final solution: [Brief description]"

# Push to main
git push origin main
```

**Result:** Lesson AND skill improvements immediately available in main branch

### Workflow B: Branch + Pull Request

```bash
# Create feature branch
git checkout -b skill/[topic-name]

# Add the new lesson and any updated existing skills
git add .claude/skills/lessons/[topic-name]/
git add .claude/skills/security/**/SKILL.md  # If security skills were updated
git add .claude/skills/**/SKILL.md          # If other skills were updated

# Commit with descriptive message
git commit -m "Add lesson: [topic-name] and update related skills

New Lesson:
- Created: .claude/skills/lessons/[topic-name]/SKILL.md
- Documented learnings from session

Updated Existing Skills:
- [skill-name]: [what was updated]
- [skill-name]: [what was updated]

Session learnings:
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

## New Lesson Created
**Location:** `.claude/skills/lessons/[topic-name]/SKILL.md`

**Contains:**
- Detailed session retrospective
- Failed attempts with root causes
- Exact parameters that worked
- Lessons learned for future reference

## Existing Skills Updated

**Skills improved by this session:**
- **[skill-name]**: [what was updated - e.g., "Added failed attempt, updated best practices"]
- **[skill-name]**: [what was updated - e.g., "Updated optimal parameters based on testing"]

## Value
This update will help future sessions by:
- [Benefit 1 from new lesson]
- [Benefit 2 from skill improvements]
- [Benefit 3 from compound learning]

## Review Checklist

**New Lesson:**
- [ ] Description field is verbose with trigger phrases
- [ ] Failed Attempts table is complete
- [ ] Exact hyperparameters are documented (no vague advice)
- [ ] Code examples are copy-paste ready
- [ ] Lessons learned are actionable

**Skill Updates:**
- [ ] Relevant existing skills were analyzed
- [ ] Updates improve skill accuracy with real-world data
- [ ] Changes are specific and actionable
- [ ] Existing skill quality maintained

EOF
)"

# After PR is reviewed and approved, merge it:
# gh pr merge --squash
# git checkout main
# git pull
```

**Result:** Lesson available after PR review and merge

---

## Skill Quality Checklist

Before finalizing, verify:

**New Lesson:**
- ✅ **Description field** includes 5+ specific trigger phrases from conversation
- ✅ **Failed Attempts table** documents at least 2 failures with root causes
- ✅ **Hyperparameters** are EXACT values, not ranges or "tune as needed"
- ✅ **Code examples** are complete and runnable
- ✅ **Lessons learned** are specific and actionable
- ✅ **Success criteria** are measurable
- ✅ **Related skills** are linked for context

**Existing Skills Updates:**
- ✅ **Analyzed** related skills for potential updates
- ✅ **Identified** which skills benefit from session learnings
- ✅ **Proposed** specific changes (failed attempts, parameters, best practices)
- ✅ **Got user permission** before updating existing skills
- ✅ **Updated commit message** to reflect both lesson and skill updates

---

💡 **Pro Tip:** The more specific and detailed your skill documentation, the more valuable it will be in future sessions. Include exact error messages, specific version numbers, and concrete examples.

## 🔄 Feedback Loop

This retrospective process creates a **compound learning system**:

1. **New Lesson Created** → Documents your specific experience
2. **Existing Skills Updated** → Improves general best practices with real-world findings
3. **Future Sessions** → Benefit from both the lesson AND improved skills
4. **Continuous Improvement** → Skills get more accurate and comprehensive over time

**Example Impact:**
- Session 1: Discover CSRF validation order matters → Create lesson + Update csrf-protection skill
- Session 2: Someone else uses csrf-protection skill → Avoids your mistake immediately
- Session 3: You use /advise before CSRF work → Find both the lesson AND updated skill
- Result: Team knowledge compounds, mistakes aren't repeated, development accelerates

**Key Principle:** Your learnings don't just help YOU later - they improve the shared knowledge base for everyone using this system.
