---
name: stash
description: Save uncommitted work to a temporary stash so you can switch context, pull updates, or start something else — then restore it later. Also handles listing, applying, and dropping stash entries. Use when a developer needs to temporarily shelve work, says "save my work temporarily", "I need to switch branches", "stash this", "put this aside", or wants to restore stashed changes.
---

# Stash — Temporarily Shelve Work

Save work-in-progress without committing it, or restore previously stashed work.

## Instructions

**Determine action from $ARGUMENTS:**

---

### If $ARGUMENTS is empty or "save" → Stash current changes

**Step 1 — Check there is something to stash**
Run: `git status --porcelain`
If clean: "Nothing to stash — working tree is clean." Stop.

**Step 2 — Stash with an auto-generated label**
Run: `git branch --show-current`
Run: `git stash push -u -m "WIP: <branch-name> - $(date '+%H:%M %b %d')"`
The `-u` flag includes untracked (new) files.

**Step 3 — Confirm**
```
✓ Changes stashed
  Label: WIP: feat/your-branch - 14:32 Jan 15

Restore with: /stash pop
List all stashes: /stash list
```

---

### If $ARGUMENTS is "pop" or "restore" → Restore most recent stash

**Step 1 — Check stash exists**
Run: `git stash list`
If empty: "No stashed changes to restore." Stop.

**Step 2 — Show what will be restored**
Run: `git stash show -p stash@{0} --stat`
Display the file list.

**Step 3 — Pop the stash**
Run: `git stash pop`

If conflicts on pop:
> "⚠️  Stash conflicts with current changes in these files:"
Run: `git diff --name-only --diff-filter=U`
Instruct: "Resolve the conflicts, then run: `git stash drop` to remove the stash entry."

**Step 4 — Confirm**
Run: `git status`
"✓ Stash restored — changes are back in your working tree."

---

### If $ARGUMENTS is "list" → Show all stash entries

Run: `git stash list`

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STASH LIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [0]  WIP: feat/auth - 14:32 Jan 15       ← most recent
  [1]  WIP: feat/dashboard - 09:15 Jan 14
  [2]  WIP: fix/redirect - 16:00 Jan 13

To restore:  /stash pop         (most recent)
             /stash pop 1       (specific index)
To remove:   /stash drop 0
```

---

### If $ARGUMENTS is "pop N" → Restore stash entry at index N

Run: `git stash show -p stash@{N} --stat`
Run: `git stash pop stash@{N}`

---

### If $ARGUMENTS is "drop N" → Delete a stash entry

Show entry first: `git stash show stash@{N} --stat`
Ask: "Delete stash entry [N]? This cannot be undone. (yes/no)"
If yes: `git stash drop stash@{N}`

---

### If $ARGUMENTS is "clear" → Delete ALL stash entries

Run: `git stash list` — show count.
Ask: "Delete all <N> stash entries permanently? (yes/no)"
If yes: `git stash clear`
"✓ All stash entries cleared."

$ARGUMENTS
