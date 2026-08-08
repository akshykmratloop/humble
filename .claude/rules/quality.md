# Quality rules (Humble)

- JavaScript only, no TypeScript, per explicit product-owner instruction. Use JSDoc + Zod where a type contract would otherwise help a reader.
- Source files ≤200 lines, functions ≤40 lines, components ≤150 lines (global CLAUDE.md §3/§10).
- Module boundaries (`docs/04-domain-model.md` §1) enforced: no cross-module Prisma repository imports.
- No comments explaining what code does; comments only for non-obvious why (a redesign rationale should link to the relevant ADR instead of restating it).
- No premature abstraction for post-MVP mechanics (Shields/Berserker/Power-ups/Takeover) — their schema exists (`docs/07-database-design.md`) but implementation waits for its roadmap slice.
