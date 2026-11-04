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
| `npm run dev:sso` | Dev server over HTTPS, for the staff sign-in (see below) |
| `npm run build` | Production build |
| `npm run lint` | ESLint, including the folder rules |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest, `src/**/*.test.ts`) |
| `npm run check` | lint + typecheck + tests; CI runs this plus `build` on every PR |

Where code belongs, the import rules, styling tokens and the open state-management decision are described in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Staff sign-in (Keycloak through the staff IAM)

`/login` sends the browser to Keycloak. The backend starts the sign-in (`POST /api/v1/auth/iam/login`), Keycloak
returns to the staff IAM, and the IAM lands the browser back on this app with its token cookies set on the shared
parent domain `development.oanstaging.com`. The app therefore has to be served under that domain, in development too.

Routes in this app: `/api/auth/iam/login` (starts the sign-in, redirects to Keycloak), `/api/auth/iam/complete`
(where the IAM lands the browser), `/api/auth/iam/session` (reads the IAM cookies on the server) and `/login/iam`
(loads `/da-services/me` and stores the session). Every API call of an IAM session carries the Bearer token and the
`X-CSRF-Token` header; the token lives 5 minutes on dev and is refreshed through `POST /api/v1/auth/refresh`.

### Locally

1. `npm run dev:sso` (HTTPS on port 3000; the first run downloads mkcert and writes `certificates/`, gitignored).
2. Open Chrome with the hostname mapped to this machine and the self-signed certificate accepted:

   ```powershell
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" `
     --user-data-dir="$env:TEMP\oan-sso-profile" `
     --host-resolver-rules="MAP da-local.development.oanstaging.com 127.0.0.1" `
     --ignore-certificate-errors `
     https://da-local.development.oanstaging.com:3000/login
   ```

3. Sign in on Keycloak. You land on `/dashboard`; the DA Registry screens (Agents, My Teams, Profile, Assignments,
   bulk import) work because the backend forwards your own staff token to the registry.

- The password form is still there at `/login?local=1`.
- `NEXT_PUBLIC_IAM_LOGIN_KEY` picks the backend login option (default `agent`).
- The backend must list this app's origin in that option's `return_origins`; the dev backends already allow
  `https://da-local.development.oanstaging.com:3000`.
- Opened as plain `localhost`, the sign-in ends with "did not complete": the IAM's cookies never reach localhost.
