# Login: form login and SSO

The portal can sign users in two ways. Both are in the code, and one setting picks which one `/login` uses.

| Mode | `NEXT_PUBLIC_LOGIN_MODE` | What the user sees |
|---|---|---|
| **Form login** (default) | unset or `form` | Email/username and password form on `/login` |
| **SSO** | `sso` | No form. `/login` sends the browser straight to Keycloak, which returns it to `/auth/callback` |

The switch is in [src/app/(auth)/login/page.tsx](src/app/(auth)/login/page.tsx).

## Switching modes

**Local:** add the line to `.env.local`, then restart `npm run dev`.

```env
# form login (default): leave unset, or
NEXT_PUBLIC_LOGIN_MODE=form
# SSO redirect
NEXT_PUBLIC_LOGIN_MODE=sso
```

**Deployed (Docker / Jenkins):** Next.js writes `NEXT_PUBLIC_*` values into the bundle at **build** time, so setting the variable on the running container has no effect. It has to be set when `npm run build` runs. Use one of these:

- a `.env.production` file in the repo containing `NEXT_PUBLIC_LOGIN_MODE=sso`, or
- `ARG NEXT_PUBLIC_LOGIN_MODE` + `ENV NEXT_PUBLIC_LOGIN_MODE=$NEXT_PUBLIC_LOGIN_MODE` in the Dockerfile before `npm run build`, with the value passed as a Jenkins `--build-arg`.

Today no build passes it, so deployed builds use **form login**.

---

## 1. Form login (default)

### Flow

1. The user enters email/username and password on `/login` ([LoginCard.tsx](src/app/(auth)/login/components/LoginCard.tsx)).
2. The portal calls the backend:

   ```http
   POST /api/v1/da-services/sso/login
   Content-Type: application/json

   { "username": "da-agent@services.com", "password": "…", "key": "agent" }
   ```

   `key` is the IAM login option. It defaults to `agent`; set `NEXT_PUBLIC_IAM_LOGIN_KEY` to change it.
3. The backend signs the user in at IAM / Keycloak and returns:

   ```json
   {
     "data": {
       "access_token": "<Keycloak staff-realm JWT>",
       "csrf_token": "…",
       "user": {
         "user": "63c0…@iam.internal",
         "login_email": "da-agent@services.com",
         "first_name": "DA",
         "last_name": "Agent",
         "roles": ["Development Agent", "Grievance Assisted Submitter"],
         "profiles": { "da_services": { "roles": ["Development Agent"], "scope": { "da_ids": ["123"] } } }
       }
     },
     "message": "Success",
     "status": "success"
   }
   ```

4. The portal calls `GET /api/v1/da-services/me` with `Authorization: Bearer <access_token>` and `X-CSRF-Token: <csrf_token>`. The response gives the role, scope and menu the portal shows.
5. The token pair is kept in the auth store (`localStorage` key `oan-auth`). Every API call then sends it as `Authorization: Bearer …` + `X-CSRF-Token`.

### Session length

- The response sets **no IAM session cookies** (only Frappe's `sid`, `user_id`, …) and contains **no refresh token**.
- The session therefore lasts as long as the access token: until the JWT's `exp`, which is 30 minutes today. After that the "session expired" popup asks the user to sign in again.
- To renew the session without a new sign-in, the backend has to return a `refresh_token` or provide a refresh endpoint. The renewal hook is `refreshSession()` in [session.ts](src/features/auth/session.ts).

### Errors

| Case | What the user sees |
|---|---|
| Wrong email or password (401) | "Email or password is incorrect." |
| Signed in, but `/me` refuses the account (no active RBAC assignment, 401/403) | "Your account has no active role assignment yet. Contact your administrator." |
| `/me` unreachable | Signed in with the name and roles from the login response. `/me` is read again on the next page load |
| Backend unreachable | "Could not reach the server." |

### Mock accounts

The Super Admin demo accounts in [accounts.ts](src/features/auth/accounts.ts) sign in locally with no backend call. This is unchanged, and it works only in form mode.

---

## 2. SSO (Keycloak redirect)

### Flow

1. `/login` renders [AutoKeycloakLogin.tsx](src/app/(auth)/login/components/AutoKeycloakLogin.tsx), which calls `beginKeycloakLogin()` ([keycloak.ts](src/features/auth/keycloak.ts)) at once.
2. The host decides which Keycloak flow runs ([loginProvider.ts](src/lib/loginProvider.ts)):
   - **Host under IAM's cookie domain** (`NEXT_PUBLIC_IAM_COOKIE_DOMAIN`, default `.development.oanstaging.com`): IAM flow. `POST /api/v1/auth/iam/login` returns the Keycloak URL, IAM sets its session cookies, and the `/api/v1` proxy sends them to the backend as Bearer and renews them.
   - **Any other host** (e.g. `da-registry-development.oanstaging.com`, `localhost`): direct Keycloak, authorization code + PKCE with the public client `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID` (default `da_registry`) ([oidc.ts](src/lib/oidc.ts)). The token pair is stored and renewed at Keycloak.
3. Keycloak returns the browser to `/auth/callback` ([KeycloakCallback.tsx](src/app/(auth)/auth/callback/KeycloakCallback.tsx)), which reads `/da-services/me` and opens the dashboard.

### Requirements

- The Keycloak client must list `https://<portal host>/auth/callback` as a Valid Redirect URI and `https://<portal host>` as a Web Origin.
- Optional settings: `NEXT_PUBLIC_KEYCLOAK_URL` (default `https://keycloak.development.oanstaging.com/realms/staff`), `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID`, `NEXT_PUBLIC_IAM_COOKIE_DOMAIN`.
- Host and cookie-domain details for DevOps: [docs/DEVOPS-IAM-LOGIN.md](docs/DEVOPS-IAM-LOGIN.md).

---

## 3. Server settings (both modes)

`.env.local` locally, the container environment when deployed:

| Variable | Purpose |
|---|---|
| `API_BASE_URL` | DA Services backend the `/api/v1/*` proxy forwards to, e.g. `https://da-backend-development.oanstaging.com`, or `http://localhost:8000` for a local backend |
| `CROP_SOWN_BASE_URL` | Optional separate backend for Crop Sown routes |

The proxy is [src/app/api/v1/[...path]/route.ts](src/app/api/v1/[...path]/route.ts). Login routes (`/da-services/sso/login` and others) never get an old session cookie attached as Bearer.

---

## 4. Changes made (2026-11-03)

| File | Change |
|---|---|
| [src/features/auth/login.ts](src/features/auth/login.ts) | `login()` posts `{ username, password, key }` to `/da-services/sso/login`, reads the new response shape (`data.user` is an object), and stores `access_token` + `csrf_token` as a Bearer session whose expiry comes from the JWT's `exp` (`toSsoTokens`) |
| [src/features/auth/session.ts](src/features/auth/session.ts) | A session with no refresh token now ends with the "session expired" popup when its token lapses, instead of failing silently |
| [src/app/api/v1/[...path]/route.ts](src/app/api/v1/[...path]/route.ts) | `/api/v1/da-services/sso/login` added to the proxy's login routes |
| [src/app/(auth)/login/page.tsx](src/app/(auth)/login/page.tsx) | `NEXT_PUBLIC_LOGIN_MODE` chooses form login or SSO |
| [src/app/(auth)/login/components/AutoKeycloakLogin.tsx](src/app/(auth)/login/components/AutoKeycloakLogin.tsx) | SSO redirect screen, restored so that `sso` mode works |
| [src/features/auth/me.test.ts](src/features/auth/me.test.ts) | Tests use the real `sso/login` response shape |

Verified against `da-backend-development`: `sso/login` returns the token, and `/da-services/me` accepts it as Bearer with the CSRF token (role `DA`, `da_id` `123`).
