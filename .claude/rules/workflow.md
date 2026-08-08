# Workflow rules (Humble)

Follow the global SPEC → PLAN → EXECUTE → VERIFY → COMMIT loop for every feature slice in `docs/11-implementation-roadmap.md`.

- Read `PLAN.md` and `TASKS.md` at the start of any work session in this repo; pick up at the first ⬜ item.
- Multi-file changes go through Plan Mode before code is written, per global CLAUDE.md §2/§7 — except where the user has explicitly authorized autonomous continuation through an approved roadmap (as in the current build mandate); in that mode, still write the plan for each slice into `PLAN.md`/an ADR before implementing it, just don't block on a separate approval round-trip for items already decided in `docs/`.
- One vertical slice at a time. Don't start Slice N+1 until Slice N's tests are green and pushed.
- Ambiguities resolvable from `docs/*` or an existing ADR: decide and proceed, document the decision inline (comment only if non-obvious) or as a new ADR if it's architecturally significant. Ambiguities that are genuine product calls with no basis in the docs: ask the user.
