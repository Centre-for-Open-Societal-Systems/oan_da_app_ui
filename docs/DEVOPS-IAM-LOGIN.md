# DA Portal: deployment requirements for IAM (Keycloak) login

**Audience:** DevOps / platform team.
**App:** `oan_da_app_ui` (Next.js), Helm release `registry-frontend`, chart `/home/ubuntu/da/helm/charts/da-app` on the DA node, deployed by `Jenkinsfile`.
**Status (updated):** login now works on `https://da-registry-development.oanstaging.com` without a host change. Hosts outside IAM's cookie domain (`NEXT_PUBLIC_IAM_COOKIE_DOMAIN`, default `.development.oanstaging.com`) sign in with direct Keycloak (authorization code + PKCE, public client `da_registry`, `src/lib/loginProvider.ts` + `src/lib/oidc.ts`); the token is sent as `Authorization: Bearer`. Hosts under that domain keep the IAM cookie flow described below. Keycloak client `da_registry` must keep `https://da-registry-development.oanstaging.com/auth/callback` as a Valid Redirect URI and `https://da-registry-development.oanstaging.com` as a Web Origin. The host move in section 3.1 remains optional (it switches the portal back to the IAM cookie flow).

---

## 1. How the login works (the OAN standard)

The portal signs in exactly like the other OAN portals (grievance UI, crop / farmer / livestock registry staff UIs):

1. `/login` calls `POST /api/v1/auth/iam/login` (oan_auth_service on the DA Services backend) with login option `agent`.
2. The browser goes to Keycloak (`keycloak.development.oanstaging.com`, realm `staff`, client `staff-portal`) and the user signs in.
3. Keycloak returns to IAM (`https://staff-iam.development.oanstaging.com/auth/callback`). IAM exchanges the code and sets its session cookies **on IAM's cookie domain `.development.oanstaging.com`**:
   `X-Access-Token` (HttpOnly), `X-ID-Token`, `X-Session-Id`, `X-CSRF-Token`.
4. IAM sends the browser to the portal's `return_url`, `https://<portal host>/auth/callback`.
5. From then on the browser sends IAM's cookies with every call to the portal's own `/api/v1/*`. The portal's server-side proxy turns them into `Authorization: Bearer …` + `X-CSRF-Token` for the DA Services backend, and renews an expired token through `POST /api/v1/auth/refresh`.

The browser only sends a cookie to hosts inside the cookie's domain. **The portal therefore has to be served on a host under `.development.oanstaging.com`.** The crop registry repo states the same rule (`cropsown-regsitry/docs/dashboard-delivery.md`: *"verify … that the configured public host is under the IAM cookie domain"*), and it is served at `crop-registry.development.oanstaging.com`.

## 2. Why it fails today

| | Host | Under `.development.oanstaging.com`? |
|---|---|---|
| IAM (sets the cookies) | `staff-iam.development.oanstaging.com` | yes |
| Crop registry staff UI | `crop-registry.development.oanstaging.com` | yes |
| **DA portal (today)** | `da-registry-development.oanstaging.com` | **no.** It is a sibling of `development.oanstaging.com` (dash, not dot). |

After a successful Keycloak sign-in the portal shows:

> Keycloak signed you in, but IAM's session cookie did not reach this portal. …

In DevTools → Network, `/api/v1/da-services/me` has no `X-Access-Token` in its `Cookie` request header.

## 3. Required changes

### 3.1 Serve the portal on a host under `.development.oanstaging.com` (DevOps)

**Where things are today** (checked 2026-11-03):

| Name | DNS | What answers |
|---|---|---|
| `da-registry-development.oanstaging.com` (portal today) | A record → `65.0.132.192`, the DA node | Next.js pod of Helm release `registry-frontend`, namespace `develop`, chart `/home/ubuntu/da/helm/charts/da-app` |
| `*.development.oanstaging.com` (wildcard) | → `13.201.58.55`, the shared dev cluster | nginx 1.24 + Istio (`istio-system/development` gateway). Crop registry, IAM and Keycloak are here. |

A new name under `.development.oanstaging.com` therefore lands on the shared dev cluster by default, not on the DA node. Pick **one** option:

**Option A: route on the shared dev gateway to the DA node (no DNS or Helm change)**
On the shared dev cluster (`13.201.58.55`), add a route for `da-portal.development.oanstaging.com` that proxies to the DA portal:
- nginx `server` block (or an Istio `ServiceEntry` + `VirtualService` on `istio-system/development`) for host `da-portal.development.oanstaging.com`;
- upstream `https://da-registry-development.oanstaging.com` (or `65.0.132.192`), sending `Host: da-registry-development.oanstaging.com` upstream, with `X-Forwarded-Host` / `X-Forwarded-Proto` set to the public host;
- TLS: the existing `*.development.oanstaging.com` certificate covers it;
- pass `Set-Cookie` and `Cookie` headers through unchanged.

**Option B: serve the new name directly from the DA node**
1. DNS: an explicit A record `da-portal.development.oanstaging.com → 65.0.132.192`. It overrides the wildcard.
2. TLS certificate for that host on the DA node's ingress.
3. Helm: add the host to the ingress of release `registry-frontend` in namespace `develop` (see step 3 below).

Either way:

1. **Choose the host.** `da-registry.development.oanstaging.com` is already taken by another app (title "Development agent registry", redirects to `/en/login`). Suggested: **`da-portal.development.oanstaging.com`**. Any free `*.development.oanstaging.com` name works.
2. **DNS and TLS** for the new host, the same way the other `*.development.oanstaging.com` hosts are set up (shared `istio-system/development` gateway or the existing ingress and its certificate).
3. **Route the host to the portal**: the `registry-frontend` Service in namespace `develop`, port 3000. Change the host in the release's ingress / VirtualService values.
   - The Jenkins deploy runs `helm upgrade … --reuse-values`, which keeps the current ingress host. The host must be changed **once in the release values** (`helm upgrade registry-frontend <chart> -n develop --reuse-values --set …host…`, or edit the values file the chart is installed from). Jenkins does not do this.
   - The old host can keep pointing at the same Service during the switch.
4. Do the same for staging when it is set up: the staging portal host must be under **IAM's cookie domain for staging**. Confirm that domain with whoever runs IAM staging.

### 3.2 Keycloak and IAM: no change needed

- **Keycloak:** none. The login uses the existing `staff` realm and the `staff-portal` client, whose redirect URI is IAM's own callback, not the portal.
- **IAM / oan_auth_service:** none. The current code does not keep a list of allowed return origins. `iam_login` only checks that `return_url` is an absolute http(s) URL (`oan_auth_service/api/v1/auth.py`, `iam_tokens.start_login`: *"IAM does not check `return_url`; the gateway decides who may call this"*). The **OAN IAM Service** doctype has no such field. The portal's new host is accepted as is.

> Security note for the backend team: because of the above, `POST /api/v1/auth/iam/login` accepts any `return_url` (`https://evil.example.com/auth/callback` was accepted in a test on 2026-11-03). Per the code comment, restricting callers is the gateway's job.

### 3.3 Backend URL in the running container (fixed in this repo)

The portal's `/api/v1` proxy reads `API_BASE_URL` **at runtime**. The Docker image used to set it only in the build stage, so the live proxy fell back to `http://127.0.0.1:8200`:

```
GET https://da-registry-development.oanstaging.com/api/v1/da-services/me
→ 502 {"message":"Could not reach the server."}
```

The `Dockerfile` now also sets `API_BASE_URL` in the runtime stage, from the same `--build-arg` Jenkins already passes (`Jenkinsfile`, `apiBaseUrl` per branch). Alternatively, or as an override, set the pod env var in the Helm values:

| Variable | develop value | Notes |
|---|---|---|
| `API_BASE_URL` | `https://da-backend-development.oanstaging.com` | Required. DA Services backend, including oan_auth_service (`/api/v1/auth/*`). |
| `CROP_SOWN_BASE_URL` | *(unset)* | Optional. Only if Crop Sown routes must go to a different backend. |

`IAM_BASE_URL` is no longer used and can be removed.

### 3.4 Application side (app team, after 3.1)

- `Jenkinsfile` → `targets.develop.verifyUrl` = `https://<new host>/login`, so the post-deploy check hits the new host.
- No code change and no rebuild for the host itself: the portal uses the browser's own origin for `return_url`.

## 4. Verification

Run after 3.1 to 3.3 are done (replace the host):

```bash
H=https://da-portal.development.oanstaging.com

# Portal is served on the new host
curl -sk -o /dev/null -w "%{http_code}\n" $H/login                 # 200

# The /api/v1 proxy reaches the backend (401 from the backend, NOT 502)
curl -sk $H/api/v1/da-services/me                                  # {"message":"Authentication failed",...}

# IAM accepts the new return_url
curl -sk -X POST -H 'Content-Type: application/json' \
  -d "{\"key\":\"agent\",\"return_url\":\"$H/auth/callback\"}" \
  $H/api/v1/auth/iam/login                                         # "status": "success", data.redirect_url = Keycloak
```

In a browser:

1. Open `https://<new host>/login`. It redirects to the Keycloak login form.
2. Sign in with a staff user that has a DA Services role and an active DA RBAC assignment.
3. You land on `/dashboard`.
4. DevTools → Network → any `/api/v1/da-services/...` request → Request headers → `Cookie` contains `X-Access-Token=…`, and the response is `200`.

## 5. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "IAM's session cookie did not reach this portal", no `X-Access-Token` in the `Cookie` header | Portal host is not under IAM's cookie domain | 3.1 |
| `/login` shows "return_url is not allowed" | `return_url` is not an absolute https URL (the portal must be opened on its https host) | 3.1 |
| `/api/v1/...` answers `502 {"message":"Could not reach the server."}` | `API_BASE_URL` missing in the running pod | 3.3 (rebuild with the fixed Dockerfile, or set the pod env) |
| `/api/v1/...` answers `401` **with** `X-Access-Token` in the `Cookie` header | The user has no DA Services role or no active DA RBAC assignment (the backend's `check_da_assignment`) | Assign the role in Keycloak / the DA RBAC Assignment |
| Jenkins `Verify` stage fails after the switch | `verifyUrl` still points at the old host | 3.4 |

## 6. Rollback

Point the ingress / VirtualService back to `da-registry-development.oanstaging.com` (or keep both hosts during the switch). Login only works on the host under the cookie domain. Nothing else depends on the host.

## 7. Contacts / references

- Portal code: `src/app/api/v1/[...path]/route.ts` (cookie → Bearer proxy, token renewal), `src/lib/iam.ts`, `src/features/auth/keycloak.ts`.
- IAM / oan_auth_service: `github.com/Centre-for-Open-Societal-Systems/oan_auth_service` (`api/middleware.py`, `api/iam_tokens.py`).
- DA Services backend: `DA-services-backend/docs/da-registry-integration.md` (the user's staff IAM Bearer + CSRF are forwarded to the DA Registry).
- Same pattern: `oan_grievance_ui` (`src/lib/iamSession.ts`, `src/lib/proxyHeaders.ts`), `cropsown-regsitry` (`docs/new-dev-routing.md`).
