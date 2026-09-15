# Git Setup — Report

Read-only audit of Git configuration for this machine and this repo, taken 2026-09-12. Nothing was changed while producing this report.

---

## What you have configured

### Scopes and files

| Scope | File | Contents |
|---|---|---|
| System | `/opt/homebrew/etc/gitconfig` (Homebrew git) | `credential.helper=osxkeychain` |
| Global | `~/.gitconfig` | Identity, 28 aliases, pager, pull/rebase/merge policy |
| Local | `.git/config` (this repo) | Standard init defaults, `origin` remote, `main` tracking |
| Worktree | — | None (single worktree, no extensions) |

### Identity and policy (global)

- `user.name` = `Yue Zhou@Paraflux`, `user.email` = `yue@paraflux.ca`
- `init.defaultBranch = main`
- `pull.rebase = true` **and** `pull.ff = only` — pulls rebase; fast-forward-only as backstop
- `merge.tool = vimdiff`, `merge.conflictStyle = diff3`, `mergetool.prompt = false`, `mergetool.keepBackup = false`
- `core.pager = delta` — **delta 0.18.2 installed** via Homebrew and wired as the pager (running with all-default settings; no `[delta]` section, no `interactive.diffFilter`)

### Aliases (28, all global)

**Shortcuts:** `st` (colored `status -sb`), `ci` (commit), `l` (oneline log), `lg` (colored graph log), `a` (`add .`), `unstage` (`reset HEAD --`), `bra` (`branch -a`), `sw` (switch), `gbrv` (`branch -r -v`), `fa` (`fetch --all`), `d` (diff), `conflicts` (unmerged file list), `theirs`/`ours` (conflict side checkout), `newonmain`/`mytodo` (ahead/behind vs origin/main), `mt`/`mtall` (mergetool).

**Rebase suite** — defaults to `origin/dev` when no branch argument is given: `rb` (fetch + rebase with progress messages), `rbi` (interactive), `rbs` (auto-stash around rebase), `rbonto`, `rbabort`, `rbcont` (stages everything then continues).

**Bigger shell aliases:** `grab` (fetch a remote branch, conflict-check, stash, switch/create — well guarded), `news` (recent commits across top remote branches), `swc` (switch-and-create, delegates to `~/.git-swc.sh` — file exists and is executable).

**Shadowing:** none of the alias names collide with real git builtins — nothing shadows an actual command. Two flags instead: `a = add .` stages *everything* untracked wholesale (easy to sweep junk into a commit), and `rb`/`rbi`/`rbs`/`rbonto` default to `origin/dev` — **this repo's mainline is `main`**, so use e.g. `git rb main` here or the default silently targets a branch that doesn't exist.

### Conditional includes

None — no `includeIf` directives in `~/.gitconfig`, no extra config files pulled in.

### Checklist

| Setting | Value |
|---|---|
| `core.pager` | `delta` |
| `core.excludesFile` | not set |
| `core.hooksPath` | not set |
| `init.defaultBranch` | `main` |
| `pull.rebase` | `true` |
| `pull.ff` | `only` |
| `merge.conflictStyle` | `diff3` |
| `rerere.enabled` | not set |
| `diff.tool` | not set |
| `merge.tool` | `vimdiff` |
| `push.default` | not set (git default: `simple`) |
| `fetch.prune` | not set |
| `commit.gpgsign` | not set |
| `user.signingkey` | not set |

### Global ignores / hooks

- No `core.excludesFile`, and no `~/.gitignore_global` exists — machine-level junk (`.DS_Store` etc.) is only ignored where a repo's own `.gitignore` says so. This repo ignores `node_modules/`, `.env.local`, `.auth-keys.json` — but **not** `.DS_Store`, `dist/` (currently committed), or `tsconfig.tsbuildinfo` (currently committed).
- Hooks: `.git/hooks/` contains only the `.sample` templates — **no active hooks** in this repo, and no global `core.hooksPath`.

### This repo

- Local config: nothing beyond init defaults + remote/branch tracking.
- Remote: `origin` → `https://github.com/AmirZhou/optimist-hub.git` (fetch & push; credentials via osxkeychain).
- Worktrees: one — `/Users/yuezhou/projs/optimist-hub` on `main`.

---

## What's notably absent (worth considering)

1. **`fetch.prune`** — with `fa = fetch --all` in regular use, deleted remote branches linger in `origin/*` and clutter `bra`/`gbrv`. One line: `git config --global fetch.prune true`.
2. **`rerere.enabled`** — you rebase heavily (six rebase aliases). Rerere remembers conflict resolutions and auto-reapplies them on repeated rebases of the same patches; it's the single highest-value setting for this workflow. `git config --global rerere.enabled true`.
3. **A global excludes file** — `.DS_Store` will keep showing up as untracked on macOS. `git config --global core.excludesFile ~/.gitignore_global` with `.DS_Store` (and `.DS_Store?`) inside covers every repo at once.
4. **`dist/` and `tsconfig.tsbuildinfo` in this repo's `.gitignore`** — both are build outputs and both are currently committed; every `npm run build` dirties the tree. (Removing them from tracking is a repo change, not just config — flagged here for awareness.)
5. **`diff.tool`** — you have `merge.tool = vimdiff` but no diff tool, so `git difftool` doesn't work; setting `diff.tool = vimdiff` (or pointing both at delta/vimdiff deliberately) completes the pair your `mt` alias implies.
6. **Commit signing** (`commit.gpgsign`, `user.signingkey`, `gpg.format = ssh`) — optional; matters if you want verifiable authorship on GitHub (would show "Verified").

Not worth adding: `push.default` (the `simple` default is already right), conditional includes (single work profile), hooks (nothing in your workflow needs them yet), and extra diff pagers beyond delta (already installed).
