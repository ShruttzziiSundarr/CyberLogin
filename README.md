# sso-lab

An open-source, form-driven admin portal for onboarding client applications onto a
[PingFederate](https://www.pingidentity.com/) based identity platform, without hand-clicking
through the PingFederate admin console.

An admin fills in a wizard (OAuth 2.0 / OIDC, or SAML 2.0) and the backend provisions the
right artifact via the PingFederate administrative API — an OAuth client or a SAML SP
connection — and hands back the runtime endpoints the application owner needs.

## Architecture

```
frontend/   React 18 + Vite + TypeScript + Tailwind + React Hook Form/Zod + TanStack Query
backend/    Node.js 20 + Express + TypeScript + Zod + pino
backend/src/pingfederate/   Isolated PingFederate admin API client behind an
                             IdentityProvider interface, so a Keycloak/Okta adapter
                             could be added later without touching routes.
```

The frontend never talks to PingFederate directly and never sees admin credentials.
All privileged calls go through the backend.

## Platform this portal talks to

- **PingFederate** — federation server (IdP, OAuth AS, OIDC provider). The portal calls its
  administrative API (`/pf-admin-api/v1/...`).
- **PingOne MFA** — second factor, invoked through a PingFederate authentication policy.
  The portal never talks to PingOne directly; it only wires PingFederate's policy tree to
  reference an existing PingOne connection.
- **PingDirectory** — user store, represented in PingFederate as an LDAP data store +
  password credential validator. The portal does not create users.

## Local setup

Prerequisites: Docker + Docker Compose, or Node.js 20 for running the pieces natively.

```bash
cp .env.example .env
# edit .env — at minimum set ADMIN_USERNAME/ADMIN_PASSWORD and SESSION_SECRET
# for a real PingFederate, set PF_ADMIN_BASE_URL / PF_ADMIN_USER / PF_ADMIN_PASSWORD

docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api

Running natively instead:

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

### Optional dev IdP

No real PingFederate license? `docker-compose.dev.yml` brings up a Keycloak container as a
stand-in identity provider so you can develop the portal's UI/UX locally.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev-idp up
```

**This is dev-only and not part of the production path.** Keycloak does not implement
PingFederate's admin API (the `X-XSRF-Header`, the exact `/pf-admin-api/v1/*` resource
shapes, etc). The `IdentityProvider` interface in `backend/src/pingfederate/` is written
against the real PingFederate admin API contract; there is no Keycloak adapter yet — the
interface simply leaves the seam for one. For end-to-end testing against real PingFederate
behavior, point `PF_ADMIN_BASE_URL` at an actual PingFederate instance (a free trial /
devops image works) instead.

## Deployment (Render)

Two Render Blueprint options are provided:

- **`render.yaml`** (default) — a single combined service built from the root `Dockerfile`: the Express backend serves both `/api` and the built frontend from one URL. SAML-only — OAuth/OIDC onboarding is off (`FEATURE_OAUTH_ONBOARDING=false`).
- **`render.two-service.yaml`** — the original two-service split (`backend/Dockerfile` + `frontend/Dockerfile` as separate web services), with OAuth/OIDC onboarding enabled alongside SAML.

To deploy the combined blueprint: Render dashboard → New → Blueprint → select this repo and `render.yaml`. After the first deploy, set `SP_BASE_URL` and `FRONTEND_BASE_URL` (both `sync: false`) to the service's own assigned `*.onrender.com` URL — the UI and API share the same origin in this setup.

## Environment variables

See [.env.example](.env.example) for the full list. Highlights:

| Variable | Purpose |
|---|---|
| `PF_ADMIN_BASE_URL` | PingFederate admin API base, e.g. `https://pf.example.com:9999/pf-admin-api/v1` |
| `PF_ADMIN_USER` / `PF_ADMIN_PASSWORD` | Admin API credentials (server-side only, never sent to the browser) |
| `PF_ADMIN_AUTH_MODE` | `basic` (default) or `oauth2` for bearer-token admin auth |
| `PF_TLS_INSECURE` | `true` disables TLS cert verification for the admin API — **local dev only**, logs a loud warning at startup, defaults to `false` |
| `PF_RUNTIME_BASE_URL` | PingFederate runtime host, used to compute endpoints shown to app owners |
| `PD_LDAP_HOST` / `PD_BIND_DN` / `PD_BIND_PASSWORD` / `PD_SEARCH_BASE` | Used only for the optional guided PingDirectory data store creation |
| `FEATURE_MFA_POLICY_WRITE` | Feature flag gating the authentication-policy write path (off by default — see Security model) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Seed account for the portal's own session-based admin login |
| `SESSION_SECRET` | Signs the portal's session cookie |

## Pointing at a real PingFederate

1. Set `PF_ADMIN_BASE_URL` to `https://<your-pf-host>:9999/pf-admin-api/v1`.
2. Set `PF_ADMIN_USER` / `PF_ADMIN_PASSWORD` (or switch to `PF_ADMIN_AUTH_MODE=oauth2` and
   fill in the OAuth token URL/client credentials).
3. If your PF instance uses a self-signed cert and you're only testing locally, set
   `PF_TLS_INSECURE=true` — never do this against a real environment.
4. Field shapes for the admin API differ across PingFederate versions. Before relying on the
   integration in production, check your instance's live interactive docs at
   `https://<pf-host>:9999/pf-admin-api/api-docs` and confirm payload shapes match what's in
   `backend/src/pingfederate/`.
5. Confirm `GET /api/platform/status` in the portal shows your PingDirectory data store,
   password credential validator, PingOne connection, and signing keys as present before
   onboarding apps.

## Security model

- Admin API credentials and LDAP bind credentials live only in backend environment
  variables — never sent to the browser.
- OAuth client secrets are generated server-side and returned to the UI **exactly once**,
  at creation time. They are not stored in plaintext.
- Every portal route except login requires an authenticated admin session (cookie-based).
- Mutating routes are CSRF-protected; onboarding routes are rate-limited.
- Secrets are redacted from logs; request bodies containing secrets are never logged in full.
- TLS verification of the PingFederate admin endpoint defaults to on. It can only be
  disabled with the explicit `PF_TLS_INSECURE=true` flag, which also triggers a startup
  warning.
- **MFA policy wiring is the highest-risk operation in this app.** It mutates
  PingFederate's global authentication policy tree. It is gated behind
  `FEATURE_MFA_POLICY_WRITE` (off by default) and always does a read-current-tree →
  diff → validate → write, logging the before/after at each write.

## Testing

```bash
cd backend && npm test
```

Unit tests cover the PingFederate integration module against a mocked admin API (auth
headers, XSRF header, TLS-insecure behavior, error mapping, one test per resource wrapper).
Integration tests cover at least one full request path per protocol (OAuth and SAML)
through the Express routes.

## Extending to another identity platform

The PingFederate-specific request shaping lives entirely behind the `IdentityProvider`
interface in `backend/src/pingfederate/`. To add a Keycloak or Okta backend, implement the
same interface as a new adapter and wire it in where `PingFederateClient` is currently
instantiated — the routes and frontend don't need to change.

## License

Open source — see repository for license details.
