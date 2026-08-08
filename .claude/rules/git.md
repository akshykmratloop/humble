# Git rules (Humble)

- Conventional commits: `<type>(<scope>): <description>`. Scopes: `api`, `web`, `domain`, `database`, `docs`, `infra`, `tooling`.
- `feat:`/`fix:` commits require a green local test suite first. `docs:`/`chore:`/`refactor:`/`style:`/`test:`/`ci:` commits push immediately, no test gate.
- One vertical slice = one or a few atomic logical commits, pushed immediately after — no piling up local commits (global CLAUDE.md §4/§12).
- Never `--force` to `main`. Never `--no-verify`. Never amend a pushed commit.
- Before any `git push` in this repo (a React/Next.js project), run the react-doctor gate per global CLAUDE.md §14 once the frontend exists.
- Remote: `https://github.com/akshykmratloop/humble.git`, default branch `main`.
