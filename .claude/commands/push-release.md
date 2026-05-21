---
allowed-tools: Bash(git tag:*), Bash(git log:*), Bash(git diff:*), Bash(git push:*), Bash(gh release:*), Bash(cd secure-vibe-kit*), Bash(npm version*), Bash(npm publish*), Bash(node secure-vibe-kit*), Bash(cat secure-vibe-kit*), Read(**/SKILL.md), Read(**/README.md), Read(**/*.md), AskUserQuestion
description: Create and push a new release with automatic versioning and high-quality changelog generation
---

# Push Release - Automated Release Management

Automate the entire release process including versioning, changelog generation, git tagging, and GitHub release creation.

---

## Step 1: Check Working Directory Status

**CRITICAL**: Ensure working directory is clean before creating a release.

```bash
git status
```

**If there are uncommitted changes:**

```
⚠️  WARNING: You have uncommitted changes!

Changes not staged for commit:
  modified:   src/some-file.ts

🛑 STOP: Please commit all changes before creating a release.

A release should be a clean snapshot of committed work.

Please commit your changes first:
  git add .
  git commit -m "Your commit message"

Then run /push-release again.
```

**Exit if working directory is dirty. Do not proceed.**

---

**If working directory is clean:**

```
✅ Working directory is clean. Proceeding with release...
```

Continue to Step 2.

---

## Step 2: Determine Current Version

Get the latest version tag:

```bash
git tag --sort=-v:refname | head -n 1
```

**Parse the version:**
- If no tags exist: Current version is `v0.0.0`
- If tags exist: Extract version number (e.g., `v2.0.0` → major=2, minor=0, patch=0)

**Show current version:**
```
📍 Current Version: v2.0.0
```

---

## Step 3: Ask User for Release Type

Use AskUserQuestion:

**Question**: "What type of release is this?"

**Header**: "Release Type"

**Options**:

1. **Major Release (vX.0.0)**
   - Breaking changes
   - Major new features
   - Significant architecture changes
   - Example: v2.0.0 → v3.0.0

2. **Minor Release (v2.X.0)**
   - New features (backwards compatible)
   - Enhancements to existing features
   - New commands or skills
   - Example: v2.0.0 → v2.1.0

3. **Patch Release (v2.0.X)**
   - Bug fixes
   - Documentation updates
   - Minor improvements
   - Example: v2.0.0 → v2.0.1

**multiSelect**: false

---

## Step 4: Calculate New Version

Based on user selection:

**Major Release:**
- Increment major version
- Reset minor and patch to 0
- Example: v2.3.5 → v3.0.0

**Minor Release:**
- Keep major version
- Increment minor version
- Reset patch to 0
- Example: v2.3.5 → v2.4.0

**Patch Release:**
- Keep major and minor versions
- Increment patch version
- Example: v2.3.5 → v2.3.6

**Display new version:**
```
🚀 New Version: v2.1.0
```

---

## Step 5: Collect Commits Since Last Release

Get all commits since the last release tag:

```bash
git log v2.0.0..HEAD --oneline --no-merges
```

**If no commits since last release:**
```
⚠️  No commits since last release v2.0.0

Cannot create a new release without changes.

Please make some commits first, then run /push-release again.
```

**Exit if no commits.**

---

**If commits exist:**

```
📝 Commits since v2.0.0:

232f30d Improve /advise and /retrospective efficiency with progressive disclosure
0e82ea7 Enhance retrospective command with git status check and skill updates
2100324 Update retrospective command to ask user for workflow preference
```

Continue to Step 6.

---

## Step 6: Analyze Changes and Generate Changelog

**Analyze commits to extract:**

1. **Major Features** - What big things were added?
2. **Improvements** - What was enhanced?
3. **Bug Fixes** - What was fixed?
4. **Breaking Changes** - What requires user action?
5. **Files Changed** - What files were added, modified, deleted, renamed?

**Read relevant files to understand context:**
- Check README.md for feature descriptions
- Check modified command files for new functionality
- Check skill files for new capabilities

**Generate structured changelog following this format:**

```markdown
## [Emoji] [Release Title]

[1-2 sentence summary of what this release brings]

### Major Features (if any)

- **Feature Name**: Description
  - Sub-point with details
  - Another sub-point

### Improvements (if any)

- **Area Improved**: What changed and why it's better
- **Another Improvement**: Details

### Bug Fixes (if any)

- Fixed [specific issue]
- Resolved [another issue]

### Breaking Changes (if applicable for major releases)

⚠️ **Action Required:**

- **Change 1**: What users need to do
- **Change 2**: Migration steps

### What's Included

This release includes [N] commits:
- `[hash]`: [commit message]
- `[hash]`: [commit message]

**Files Changed:**
- ➕ Added: [list of new files]
- ➖ Deleted: [list of removed files]
- 🔄 Renamed: [old] → [new]
- ✏️ Updated: [list of modified files]

---

## 📥 How to Update

### For New Users

\`\`\`bash
git clone https://github.com/harperaa/secure-vibe-coding-OS.git
cd secure-vibe-coding-OS
npm install
\`\`\`

### For Existing Users (Template Forks)

**Option 1: Pull ONLY This Release**

\`\`\`bash
git fetch template --tags
git cherry-pick [commit-hash] [commit-hash] [...]
git push origin main
\`\`\`

**Option 2: Merge Everything**

\`\`\`bash
git fetch template --tags
git merge v[X.Y.Z]
git push origin main
\`\`\`

**Option 3: Use Pull Commands**

\`\`\`bash
/pull-repo-safe
# Follow on-screen instructions
\`\`\`

---

## 🔄 Upgrade Notes (if applicable)

[Any special instructions for upgrading]

---

**[Closing statement relevant to the release]**
```

**Key Principles for Changelog Quality:**

1. **Use proper markdown formatting**
   - All code in backticks or code blocks
   - File names in backticks
   - Commands in bash code blocks
   - Output in plain code blocks

2. **Be specific and actionable**
   - Exact file names and paths
   - Concrete examples
   - Clear benefits

3. **Use emojis strategically**
   - 🧠 for learning/intelligence features
   - ⚡ for performance improvements
   - 🔒 for security features
   - 🔄 for workflow changes
   - ✨ for new features
   - 🐛 for bug fixes
   - 📚 for documentation
   - ⚠️ for breaking changes

4. **Include metrics when available**
   - "13x more efficient"
   - "Reduced from 1200 to 90 lines"
   - "3-5x faster"

5. **Provide update paths**
   - Cherry-pick specific commits
   - Full merge option
   - Built-in command option

---

## Step 7: Show Preview and Get Approval

**Display the generated changelog to the user:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RELEASE PREVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Version: v2.1.0
Type: Minor Release
Commits: 3
Files Changed: 5

CHANGELOG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Full generated changelog here]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Ask for approval:**

Use AskUserQuestion:

**Question**: "Proceed with creating this release?"

**Header**: "Confirm Release"

**Options**:

1. **Yes, create release** - Proceed with tagging and publishing
2. **Edit changelog first** - Let me modify the changelog before publishing
3. **Cancel** - Don't create the release

**multiSelect**: false

---

## Step 8A: If User Chooses "Yes, create release"

Proceed directly to Step 9.

---

## Step 8B: If User Chooses "Edit changelog first"

**Provide the changelog as editable text:**

```
I'll create a draft of the changelog. Please review and let me know what changes you'd like.

Current changelog:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Full changelog text]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What would you like to change?
```

**Wait for user edits, then proceed to Step 9.**

---

## Step 8C: If User Chooses "Cancel"

```
❌ Release cancelled.

No tags or releases were created.
```

**Exit the command.**

---

## Step 9: Bump the app version on `main`

> **Branch model (read this first).** `secure-vibe-kit/` does NOT live on `main`.
> `main` is the clean product template that people clone — it must stay free of the
> kit. The npm package lives on the long-lived **`kit`** branch and is rebuilt from
> `main` at release time in Step 13. Here on `main` we only bump the **app** version
> (root `package.json`); the kit's own `package.json` is bumped on the `kit` branch
> in Step 13. Keep both equal to the release version so `npm view` and the GitHub
> release page tell the same story.

Bump the root `package.json` to the release version (X.Y.Z, no "v"). Use
`npm pkg set` — do NOT use `npm version major/minor/patch`.

```bash
npm pkg set version="X.Y.Z"
git add package.json
git commit -m "chore: bump to X.Y.Z for release"
git push origin main
```

This is the commit the tag will point to in Step 10. (There is nothing kit-related
to commit on `main` — that happens on the `kit` branch in Step 13.)

---

## Step 10: Create Git Tag

Create an annotated tag with the version:

```bash
git tag -a v2.1.0 -m "Release v2.1.0"
```

**Verify tag was created:**

```bash
git tag --list v2.1.0
```

**Show confirmation:**
```
✅ Created tag: v2.1.0
```

---

## Step 11: Push Tag to Remote

Push the tag to the remote repository:

```bash
git push origin v2.1.0
```

**Show confirmation:**
```
✅ Pushed tag to origin
```

---

## Step 12: Create GitHub Release

Create the GitHub release with the generated changelog:

```bash
gh release create v2.1.0 \
  --title "v2.1.0: [Release Title]" \
  --notes "[Full changelog in proper markdown format]"
```

**IMPORTANT**: Ensure the changelog uses proper markdown formatting:
- Bash commands in `bash` code blocks
- Output in plain code blocks
- File names in backticks
- No text accidentally rendered as headers

**Show confirmation with URL:**
```
✅ Created GitHub release: https://github.com/harperaa/secure-vibe-coding-OS/releases/tag/v2.1.0
```

---

## Step 13: Build and publish secure-vibe-kit from the `kit` branch

`secure-vibe-kit/` lives ONLY on the long-lived `kit` branch (see the Step 9 branch
model). Build it fresh from the `main` you just released, then publish.

> **CRITICAL — never `git merge main` into `kit`.** `main` carries the commit that
> removed `secure-vibe-kit/`; a merge would delete it on `kit` too. Always refresh
> with a **pathspec overlay** (`git checkout main -- .`), which writes only the paths
> that exist in `main` and never deletes `kit`-only files like `secure-vibe-kit/`.

**Step 13A: Build the kit from the released `main`** (you run these):

```bash
git checkout kit
git checkout main -- .                          # overlay main's tree — NOT a merge
./secure-vibe-kit/scripts/sync-from-source.sh   # files/ <- main's .claude/**, workflows, scripts
# If main's CLAUDE.md changed, manually update secure-vibe-kit/files/CLAUDE.md
#   (do NOT copy project-specific lines — see the sync script's closing note)
( cd secure-vibe-kit && npm pkg set version="X.Y.Z" )
git add -A
git commit -m "chore(kit): build vX.Y.Z from main"
git push origin kit
```

**Step 13B: Publish to npm** (interactive — the USER runs these; do NOT run them
yourself, both require a browser/OTP):

```
📦 secure-vibe-kit is built on the `kit` branch at version X.Y.Z.

  ! npm whoami                         # if 401: ! npm login
  ! npm publish ./secure-vibe-kit
  ! npm view secure-vibe-kit versions --json
```

**Wait for the user to confirm the publish succeeded.**

**Step 13C: Return to `main`** so the working tree is back on the product branch:

```bash
git checkout main
# git leaves empty secure-vibe-kit/ dirs behind after the kit→main switch.
# They're untracked and never part of main — remove the skeleton so main looks clean.
rm -rf secure-vibe-kit
```

Do NOT let an npm publish failure block the release — the `main` tag and GitHub
release (Steps 10–12) are the primary deliverables.

---

## Step 14: Summary

Display final summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 RELEASE COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Version: v2.1.0
Type: Minor Release
Commits: 3 commits included
Tag: Created and pushed (on main)
Release: Published on GitHub (from main)
Kit: rebuilt from main on the `kit` branch
npm: secure-vibe-kit@[version] published

📦 Release URL:
https://github.com/harperaa/secure-vibe-coding-OS/releases/tag/v2.1.0

📦 npm package:
https://www.npmjs.com/package/secure-vibe-kit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next Steps:
- Share the release with your team
- Update documentation if needed
- Announce in relevant channels
- Monitor for any issues

🚀 Great work on shipping v2.1.0!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Error Handling

### If Git Tag Already Exists

```
❌ Error: Tag v2.1.0 already exists

This version has already been released.

Options:
1. Delete the existing tag and recreate it (dangerous!)
   git tag -d v2.1.0
   git push origin :refs/tags/v2.1.0

2. Create a patch release instead (v2.1.1)

3. Cancel and investigate

What would you like to do?
```

### If GitHub Release Creation Fails

```
❌ Error: Failed to create GitHub release

The tag was created locally and pushed to GitHub.
However, the GitHub release creation failed.

You can create it manually:
1. Visit: https://github.com/harperaa/secure-vibe-coding-OS/releases/new
2. Select tag: v2.1.0
3. Copy the changelog from above
4. Publish the release

Or try again:
gh release create v2.1.0 --title "v2.1.0: [Title]" --notes "[Changelog]"
```

### If No GitHub CLI Installed

```
❌ Error: GitHub CLI (gh) not installed

The tag has been created and pushed successfully.

To complete the release:

Option 1: Install GitHub CLI
  brew install gh  # macOS
  # or visit: https://cli.github.com

Then run:
  gh release create v2.1.0 --title "v2.1.0: [Title]" --notes "[Changelog]"

Option 2: Create release manually
  Visit: https://github.com/harperaa/secure-vibe-coding-OS/releases/new
  Select tag: v2.1.0
  Add the changelog and publish
```

---

## Best Practices

**For Major Releases (vX.0.0):**
- Include comprehensive changelog
- Document all breaking changes
- Provide migration guide
- List deprecated features
- Update main documentation

**For Minor Releases (vX.Y.0):**
- Highlight new features clearly
- Show improvements and enhancements
- Include usage examples
- Reference related documentation

**For Patch Releases (vX.Y.Z):**
- List specific bugs fixed
- Note any behavior changes
- Keep changelog concise
- Reference issue numbers if applicable

**Changelog Quality Checklist:**
- ✅ Proper markdown formatting (code blocks, backticks)
- ✅ Specific and actionable descriptions
- ✅ Concrete examples and metrics
- ✅ Clear update instructions
- ✅ Commit hashes included
- ✅ Files changed documented
- ✅ Breaking changes highlighted
- ✅ Benefits clearly stated

---

## Example Release Types

### Major Release Example (v3.0.0)

```markdown
## 🚀 Major Release: Complete Security Overhaul

Complete rewrite of security architecture with new authentication system.

⚠️ **BREAKING CHANGES** - Action required for all users

### Breaking Changes

- **Authentication System**: Migrated from custom auth to Clerk
  - Action: Update environment variables
  - Action: Run migration script: `npm run migrate-auth`

- **API Routes**: All routes now require authentication
  - Action: Update frontend to include auth headers

[Rest of changelog...]
```

### Minor Release Example (v2.1.0)

```markdown
## ✨ New Features: Advanced Rate Limiting

Added sophisticated rate limiting system with customizable rules.

### Major Features

- **Dynamic Rate Limiting**: Configure limits per endpoint
- **IP-based Tracking**: Automatic IP detection and blocking
- **Dashboard UI**: Visual rate limit monitoring

[Rest of changelog...]
```

### Patch Release Example (v2.0.1)

```markdown
## 🐛 Bug Fixes: CSRF Token Validation

Fixed critical CSRF validation issue affecting form submissions.

### Bug Fixes

- Fixed CSRF token validation order (must validate before parsing)
- Resolved session timeout on long-running operations
- Corrected error messages for better debugging

[Rest of changelog...]
```

---

💡 **Pro Tip**: High-quality changelogs help users understand what changed, why it matters, and how to upgrade. Invest time in writing clear, specific, actionable release notes.
