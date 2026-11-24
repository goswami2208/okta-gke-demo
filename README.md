# Okta + Angular + Spring Cloud Gateway + DB2 on GCP/GKE

## Architecture

```
Browser ──► https://app.example.com ──► HTTPS LB ──► Cloud Storage bucket (Angular build)
   │
   │  1. Authorization Code + PKCE ──► Okta (login, tokens)
   │
   └─ 2. fetch https://api.example.com/api/items  (Authorization: Bearer <access token>)
              │
        GKE Ingress (HTTPS, managed cert)
              │
        Spring Cloud Gateway pods (HPA 2–8)   validates JWT (issuer, audience, signature via Okta JWKS), CORS, routing
              │   StripPrefix=1  /api/items -> /items
        items-service pods (HPA 2–8)          validates JWT again (defence in depth)
              │   Controller -> Service -> JPA Repository -> Hibernate
              └──► IBM DB2   (schema APP, table ITEMS)
```

Login flow: Angular guard → `signInWithRedirect` → Okta → `/login/callback` → tokens in browser →
interceptor attaches the access token to `/api/**` calls only.

## Okta setup
1. Applications → Create App Integration → **OIDC – Single-Page App**.
2. Sign-in redirect URI: `https://app.example.com/login/callback` (+ `http://localhost:4200/login/callback` for dev).
   Sign-out redirect URI: `https://app.example.com` (+ localhost).
3. Security → API → Trusted Origins: add `https://app.example.com` (and localhost:4200) with **CORS** and **Redirect** enabled.
4. Assign users/groups. Use the `default` authorization server (issuer `https://<org>.okta.com/oauth2/default`, audience `api://default`).
5. Put the issuer + client ID in `frontend/src/environments/environment.ts` and the issuer in `k8s/config.yaml`.

## Run locally
```bash
# DB2 (docker): see schema.sql.reference in items-service/src/main/resources, run it once
export OKTA_ISSUER=https://YOUR_ORG.okta.com/oauth2/default
export DB2_URL=jdbc:db2://localhost:50000/DEMODB DB2_USER=db2inst1 DB2_PASSWORD=...
(cd items-service && SERVER_PORT=8081 mvn spring-boot:run)
(cd gateway       && mvn spring-boot:run)          # :8080, routes to :8081
# Angular: create the workspace once, then drop in this src/
npx @angular/cli@latest new items-ui --routing --style=css --ssr=false --skip-git
cp -r frontend/src/* items-ui/src/ && cp frontend/package.json items-ui/package.json   # or just merge the dependency on @okta/okta-auth-js
cd items-ui && npm i @okta/okta-auth-js && ng serve   # http://localhost:4200
```
(`ng new` replaces my pinned `package.json`/`angular.json`/`tsconfig` with whatever the latest CLI generates, which is the safest way to get "latest Angular".)

## Deploy
Edit variables, then walk through `deploy.sh`. Also create the DB2 secret (command in `k8s/config.yaml`).

## Things to know
- **DB2 is not a managed GCP service.** Pods must reach it over a private path (Cloud VPN/Interconnect to on-prem, or DB2 on a Compute Engine VM in the same VPC). Hikari pool size × max pods must stay under DB2's connection limit (10 × 8 = 80 per service at HPA max).
- Autoscaling needs resource **requests** (set) and metrics-server (built into GKE).
- JWT audience is checked in both tiers; if your Okta access token `aud` differs, change `OKTA_AUDIENCE`.
- Access tokens live in browser storage (okta-auth-js default). If your security team objects, switch to a BFF pattern (gateway does the OAuth2 login with `spring-boot-starter-oauth2-client` + `TokenRelay`, session cookie to browser).
- For production add: Workload Identity + Secret Manager CSI instead of k8s Secret, Cloud Armor on the API LB, NetworkPolicy (only gateway → items-service), PodDisruptionBudgets.
