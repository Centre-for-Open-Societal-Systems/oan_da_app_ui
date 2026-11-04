This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Tech Stack

### Core framework
- **[Next.js](https://nextjs.org) 16.3.5** — App Router (`src/app`), with route groups `(auth)` and `(dashboard)`
- **[React](https://react.dev) 19.2.8** + React DOM
- **[TypeScript](https://www.typescriptlang.org) 5**

### Styling
- **[Tailwind CSS](https://tailwindcss.com) v4** — imported in `src/app/globals.css`; brand tokens (e.g. `--color-brand-green`, `--color-brand-gold`) are defined via `@theme inline`
- **PostCSS** via `@tailwindcss/postcss`
- **[clsx](https://github.com/lukeed/clsx)** + **[tailwind-merge](https://github.com/dcastil/tailwind-merge)** for conditional / merged class names
- Plain CSS for small custom pieces (e.g. the green scrollbar in `globals.css`)
- Markup is written as JSX/TSX — there are no standalone `.html` files

### State management
- **[Zustand](https://zustand.docs.pmnd.rs) 5** for global state (`src/store`)
- React Context for scoped state (`src/contexts`)

### Tooling
- **ESLint 9** with `eslint-config-next` and `eslint-plugin-boundaries` (folder rules)
- **Vitest** for unit tests
- Fonts loaded through `next/font` (Inter and Geist Mono)

### Not yet in the project
- Backend / API layer (`src/app/api` route handlers and `src/proxy.ts` are not scaffolded yet)
- UI component library — components in `src/components/ui` are hand-built
- Data-fetching or form libraries

## Getting Started

Requires Node 24.

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint, including the folder rules |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest, `src/**/*.test.ts`) |
| `npm run check` | lint + typecheck + tests; CI runs this plus `build` on every PR |

Where code belongs, the import rules, styling tokens and the open state-management decision are described in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
