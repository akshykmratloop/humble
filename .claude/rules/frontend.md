# Frontend rules (Humble — apps/web)

- Next.js App Router, JavaScript (no TS), Tailwind CSS, shadcn/ui restyled to `docs/03-design-system.md` tokens, Framer Motion for the signature sequences (§2.6), Lucide icons, React Hook Form + Zod for form UX, TanStack Query for server state.
- Loading skeletons: `boneyard-js` exclusively (user global mandate) — no `animate-pulse`, no `react-loading-skeleton`, no shadcn `<Skeleton>`.
- Fixed app shell: document (`html, body`) never scrolls; exactly one scroll region per axis inside `MobileShell`/`DesktopShell` (user global mandate — see that file for the full CSS pattern). Never `min-height: 100vh` on a shell wrapping a scroll area.
- Mobile-first; visually verify every screen at 390×844, 375×812, 430×932, 768×1024, 1440×900 before marking it done (`docs/10-testing-strategy.md` §6).
- No generic AI-SaaS UI patterns (sidebar+dashboard-cards, purple gradients, "Welcome back, {name}").
- Respect `prefers-reduced-motion` on every dramatic animation (Humble Match reveal, streak counter).
- Run `npx react-doctor@latest . --fail-on error --offline` before every push once this app has a `package.json` with `react` (global CLAUDE.md §14).
