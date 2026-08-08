# Testing rules (Humble)

Full strategy: `docs/10-testing-strategy.md`. Summary enforcement rules:

- Real Postgres + Redis via testcontainers for integration tests. Never mock the database.
- Every mutating endpoint: success + validation boundaries + 401/403/404/409/500 + injection-payload boundary tests.
- `invariants.spec` (one test per INV-# in `docs/09-threat-model.md`) must stay green at all times; touching Messaging, Safety, Payments, or Game requires re-running it before commit.
- Kill Streak abuse-simulation suite must stay green whenever the Game module changes.
- No UI feature is "done" without the Visual QA loop (`docs/10-testing-strategy.md` §6) actually executed via the browser tool against a running dev server — not inferred from source.
- Every fixed bug gets a named regression test.
