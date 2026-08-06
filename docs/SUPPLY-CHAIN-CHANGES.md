# What changed, and why

A plain-language guide to the supply-chain protections in this template.
Written for people cloning this repo — no security background needed.

---

## What happened

On August 4, 2026, someone stole the GitHub account of a developer who maintains
a popular npm package called `keyv`. They added malicious code to it and
published a new version.

Anyone who ran `npm install` and picked up that version had their passwords and
access keys stolen. The attack then used *those* stolen keys to poison hundreds
more packages automatically. Over 860 packages in total.

**This project was not affected.** But it's worth understanding why, because the
reason is the whole lesson.

---

## The thing most people don't realize

This project asks for **64** packages. npm actually installs **754**.

The other 690 come along for the ride — packages our packages depend on, and
packages *those* depend on. `keyv` was one of them. Nobody chose it. Nobody had
heard of it. It was here because ESLint uses it to cache results.

**You cannot review 754 packages.** So the goal isn't "inspect everything." It's
"make it hard for a bad package to get in, and limit the damage if one does."

---

## What changed

### 1. A 7-day waiting period on new packages

We refuse to install any package version published in the last week.

The poisoned `keyv` was caught and pulled within a day. Waiting a week means the
internet finds the problem before we do.

This already existed — we just made sure it can't be silently skipped.

### 2. We now require Node 24

**This is the one thing you have to do.**

That waiting period only works on newer versions of npm, and Node 24 is what
includes it. If you're on Node 20 or 22, the install will now **stop and tell
you** instead of quietly installing with no protection.

### 3. Packages can no longer run code during install unless we approved them

Some packages run a script the moment you install them — before you've run any
of your own code. That's exactly how this attack worked: it added a
`"preinstall"` line to every package it poisoned.

We checked which packages do that here. It's only **three**. We read what each
script actually does, and approved them **by exact version** — so a future
version of an approved package has to be re-reviewed before it's trusted.

Anything not on that list is now **blocked**, not warned about:

```
npm error code ESTRICTALLOWSCRIPTS
npm error 1 package(s) have install scripts not covered by allowScripts:
npm error   some-package@1.2.3
```

If you add a dependency that needs an install script, you'll see that message.
Read the script, then run `npm approve-scripts <package>`. Never approve blind
with `--all` — the whole point is that someone looked.

### 4. Updates to your Claude commands now show you a diff first

`/pull-commands` and `/pull-agents` used to overwrite your files with whatever
was on the internet, no questions asked.

This attack specifically planted files inside AI coding tools. So now you see
exactly what's changing and approve it before anything is written.

### 5. Our automated build has fewer keys to steal

The build robot used to have permission to write to the repo. It only ever needed
to read. Now that's all it can do.

---

## What you need to do

**Upgrade to Node 24.** That's it.

```bash
nvm install 24
nvm use 24
npm install
```

If you skip it, `npm install` will fail with a clear message telling you why.
That's intentional — a security control that fails silently is worse than no
control at all, because you'd believe you were protected when you weren't.

---

## If you ever need to bypass the waiting period

Occasionally a genuine security fix is newer than 7 days old and you need it now:

```bash
npm install some-package@latest --min-release-age=0
```

Use it deliberately, for one command, when you know why. It's an escape hatch,
not a default.

---

## The honest summary

You can't personally vet 754 packages, so we stopped pretending that's the plan.

Instead: slow down what gets in, limit what's allowed to run, and shrink what a
stolen key would reach.

---

## Full list of changes (for reference)

Every file we touched and why. You don't need to memorize this — it's here so
you can see what a real hardening pass looks like.

| File | Change | Why |
|---|---|---|
| `package.json` | `engines`: Node `>=24.15.0 <26`, npm `>=11.10.0` | npm 11.10 is the first version that honors the waiting period. Node 20/22 ship npm 10.x, so they physically can't. The `<26` ceiling stops our host silently jumping to a brand-new Node the day it ships. |
| `.npmrc` | `engine-strict=true` | Makes the line above a hard stop. Without it, an old npm prints a warning and installs anyway — you'd think you were protected when you weren't. |
| `package.json` | `allowScripts` — 3 entries, pinned to exact versions | Records which packages may run code at install time. Pinned so a *new* version of an approved package has to be re-reviewed. |
| `.npmrc` | `strict-allow-scripts=true` | Turns that list into a hard block rather than a warning. Verified: removing an entry fails the install with `ESTRICTALLOWSCRIPTS`. Needs npm ≥ 11.16; older npm ignores it safely, so it's enforced locally and in CI, advisory on Vercel until their builder updates. |
| `.claude/commands/dependency-incident.md` | New `/dependency-incident` command | Triage for "was a compromised package ever in this repo?" — read-only, writes a report, hands off to `/rotate`. |
| `.github/workflows/ci.yml` | Node 20 → 24 | Same reason as above: our build needs an npm that honors the waiting period. |
| `.github/workflows/ci.yml` | `permissions: contents: read` | The build robot could write to the repo. It only ever needed to read. This attack spreads by stealing exactly that kind of access. |
| `.github/workflows/*.yml` | Actions pinned to exact commit IDs | A version tag can be silently repointed at new code. A commit ID can't. |
| `.github/workflows/ci.yml` | Added `npm ls --all` | Fails the build if the installed packages don't match the lockfile — an unexpected package showing up is itself a warning sign. |
| `scripts/security-check.sh` | `--production` → `--omit=dev`, added tree check, added a "limits" note | The old flag was deprecated. The note explains where each check *stops* — see below. |
| `.claude/commands/pull-commands.md` | Shows the incoming diff, asks before writing | It used to overwrite blindly. This attack planted files in AI coding tools, so blind updates are the exact risk. |
| `.claude/commands/pull-agents.md` | Same, plus flags changes to what an agent is allowed to do | An agent quietly gaining permission to run shell commands is the change worth catching. |
| `README.md` | Removed "⚠️ Force overwrites" | It was documented as a feature. It shouldn't be one. |

### What we deliberately did NOT do

Knowing where a control *stops* matters as much as having it.

- **`npm audit signatures`** — this checks that packages are cryptographically
  signed. It would **not** have caught this attack. The attacker pushed code to
  the real repository and cut a real release, so the poisoned packages were
  properly signed. Every check passed. We left it out rather than let it look
  like protection it isn't.

- **`npm audit`** alone — it only finds *already-known* problems. On day one of
  a new attack it finds nothing. Useful, but not for this.

- **npm 12** — it blocks install scripts by default, which is the direction
  we're heading. But no version of Node ships it yet, so requiring it would
  break every build. The approved list above is the groundwork; switching is a
  small step later instead of a risky one now.

- **Blocking network access during builds** — a good idea that needs testing
  first. Done carelessly it breaks the build in ways that look like a bug.

## If a package you use gets compromised: `/dependency-incident`

There's a command for this. Run it when you hear that a package has been hacked
and you want to know whether it affected you.

```
/dependency-incident keyv
```

It answers one question — **were we hit, and how badly?** — and it does that by
gathering evidence, not guessing:

1. **Are we using it right now?** Checks the lockfile, including the ~690
   packages you never chose. Matches on name *and* version, because "we have
   `keyv`" and "we have the *bad* `keyv`" are very different findings.
2. **Did we ever use it?** Searches your git history. This is the one people
   miss: a poisoned version can be installed and then removed by a later update.
   Your project looks clean today, but the credentials were already taken.
3. **Did anything get left behind?** These attacks plant files in `.claude/`,
   `.github/workflows/`, and `.vscode/` so they survive after the package is
   gone. It looks for anything modified in the exposure window.
4. **What could have been stolen?** Lists your credentials as *exposed*,
   *likely exposed*, or *not present* — with the reasoning for each.
5. **Writes a report** to `docs/incidents/` so you have a record.

**It never changes anything.** No rotating, no deleting, no reinstalling. It
reads, reports, and then asks whether you want to run `/rotate` — which is the
command that actually fixes things.

That split is deliberate. Panicking and rotating everything is its own kind of
outage. Find out what happened first.
