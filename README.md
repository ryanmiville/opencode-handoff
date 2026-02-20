# opencode-handoff

A plugin + command that compacts the current session with goal-focused context, then immediately starts working on that goal.

## Install

```sh
curl -fsSL https://raw.githubusercontent.com/ryanmiville/opencode-handoff/main/install | bash
```

Installs:
- `handoff.ts` to `~/.config/opencode/plugins/`
- `handoff.md` to `~/.config/opencode/commands/`

Respects `$XDG_CONFIG_HOME`.

## Usage

`/handoff <goal>`

**Example:**

`/handoff check if this bug exists anywhere else in the codebase`
