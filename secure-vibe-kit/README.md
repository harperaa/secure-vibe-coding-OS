# secure-vibe-kit

Security-first Claude Code agents, commands, skills, and CI workflows — installable into any project with a single command.

## What's included

| Folder | Contents |
|--------|----------|
| `.claude/agents/` | Security assessment agents (orchestrator, scanner, tracer, reporter, threat modeler) |
| `.claude/commands/` | 30+ slash commands for git workflow, CI, deployment, security scanning |
| `.claude/skills/` | Security implementation skills, awareness training, prompt engineering guides, lessons library |
| `.github/workflows/` | CI pipeline (lint, test, security audit, build) + Claude Code review automation |
| `scripts/timestamp-helper.sh` | Consistent timestamp generation used by security agents |
| `CLAUDE.md` | Git conventions, branch rules, commit format, slash command reference, security reminders |

## Quick start

```bash
# Install into your existing project
cd your-project
npx secure-vibe-kit init

# Update to latest version anytime
npx secure-vibe-kit update

# Check what's installed
npx secure-vibe-kit status
```

## Commands

### `init`

First-time installation. Copies all files and appends a marker-delimited block to your `CLAUDE.md`.

If `.claude/agents/` already exists, it will warn you and suggest `update` instead (use `--force` to override).

### `update`

Refreshes all files to the latest version. Directories using `replace` mode are wiped and recopied fresh. The `CLAUDE.md` marker block is found and replaced in-place — your custom content outside the markers is preserved.

### `status`

Shows which components are currently installed in the project.

## Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would be written without making changes |
| `--skip-claude-md` | Skip the CLAUDE.md merge step |
| `--force` | Overwrite without confirmation prompts |

## How CLAUDE.md merge works

The kit wraps its content in HTML comment markers:

```markdown
<!-- BEGIN secure-vibe-kit -->
[kit content here]
<!-- END secure-vibe-kit -->
```

- **`init`**: Appends the block to the end of your existing `CLAUDE.md` (or creates the file)
- **`update`**: Finds and replaces the existing block, leaving your custom content untouched

## Copy modes

| Target | Mode | Behavior |
|--------|------|----------|
| `.claude/agents/` | replace | Deletes and recreates the entire directory |
| `.claude/commands/` | replace | Deletes and recreates the entire directory |
| `.claude/skills/` | replace | Deletes and recreates the entire directory |
| `.github/workflows/` | merge | Copies kit workflows without deleting your own |
| `scripts/timestamp-helper.sh` | file | Single file copy, preserves other scripts |

## Maintainer workflow

To sync the latest files from the parent repo:

```bash
cd secure-vibe-kit
./scripts/sync-from-source.sh
```

Then bump the version in `package.json` and publish:

```bash
npm version patch
npm publish
```

## License

MIT
