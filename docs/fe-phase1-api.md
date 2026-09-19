# Phase 1 API

What the client repo can call today. Every path below is relative to `/api/v1` on the API
host, so `/leads` means `http://localhost:8000/api/v1/leads` in local dev.

Phase 1 is: sign in, mint an API key, let machines post leads, read those leads and set
their status. Leads and their field definitions are documented in `fe-lead-fields-api.md`.

## CORS and credentials

- Allowed origins come from `CORS_ALLOWED_ORIGINS` on the API. Local default is
  `http://localhost:4200`.
- The session lives in an HTTP-only cookie, so every browser call needs credentials.
  Angular: `withCredentials: true` on the request or a global interceptor. fetch:
  `credentials: 'include'`.
- Better Auth rejects browser-shaped requests that arrive with no `Origin` header
  (`403`, `MISSING_OR_NULL_ORIGIN`). Browsers set it for you, so this only bites
  scripts and test runners.
- Allowed request headers are `Content-Type` and `Authorization` only. `x-api-key` is
  deliberately not on that list, so a browser cannot send one even by accident. An API
  key is a server-side credential.
- Rate limit: 100 requests per minute per IP, plus Better Auth's own limits on the
  `/auth` routes.

## Auth mode per route

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/auth/sign-up/email` | none |
| POST | `/auth/sign-in/email` | none |
| POST | `/auth/sign-out` | session |
| GET | `/auth/get-session` | session, returns `null` when signed out |
| GET | `/auth/organization/get-full-organization` | session + active org |
| GET | `/users` | session + active org |
| GET | `/users/:id` | session + active org |
| POST | `/api-keys` | session + active org, role `owner` or `admin` |
| GET | `/api-keys` | session + active org, role `owner` or `admin` |
| DELETE | `/api-keys/:id` | session + active org, role `owner` or `admin` |
| GET | `/health` | none |

Lead and lead field routes are listed in `fe-lead-fields-api.md`.

Two auth modes exist and they never mix:

- **Session cookie**: everything a human does in the client.
- **API key**: the `x-api-key: <raw key>` header, used by agents, n8n and Postman. It
  reaches `POST /leads` and the lead reads (`GET /leads`, `GET /leads/:id`,
  `GET /leads/fields`), and those reads take a session as well.

## Session flow

A user belongs to exactly one organization, and every org-scoped route reads the
organization from the session, not from the URL. There is no organization setup step:
sign-up creates the user's organization, named `{name}'s organization`, and every session
from then on carries it as `activeOrganizationId`.

1. `POST /auth/sign-up/email` with `{ name, email, password }`. Signs in as well, and the
   session comes back with an organization already active.
2. `POST /auth/sign-in/email` with `{ email, password }` on later visits. Same thing: the
   organization is already active, nothing to select.
3. `GET /auth/get-session` to read the current user and organization id.
4. `POST /auth/sign-out` clears the cookie.

The client never calls `organization/create` or `organization/set-active`. Creating a
second organization is refused with `403`.

`GET /auth/get-session`:

```json
{
  "session": {
    "id": "ZMg1rvBByjuYmfXtoougT2sNWTJb4kPo",
    "token": "qXahjsp1AfIPhlg9C4DGlMKsTzCCznQG",
    "userId": "RNiaUs5y0jx0yWkxUQbPUgRluomlaqHx",
    "activeOrganizationId": "Hjr9TW3mpsZIFL8VGh5cK28f7mKPcIjA",
    "expiresAt": "2026-09-19T15:40:41.421Z",
    "createdAt": "2026-09-12T15:40:41.421Z",
    "updatedAt": "2026-09-12T15:40:41.538Z",
    "ipAddress": "",
    "userAgent": "Mozilla/5.0"
  },
  "user": {
    "id": "RNiaUs5y0jx0yWkxUQbPUgRluomlaqHx",
    "name": "Ace Owner",
    "email": "owner@example.com",
    "emailVerified": false,
    "image": null,
    "createdAt": "2026-09-12T15:40:41.402Z",
    "updatedAt": "2026-09-12T15:40:41.402Z"
  }
}
```

`GET /auth/organization/get-full-organization` returns the organization itself, if the
client wants to show its name:

```json
{
  "id": "Hjr9TW3mpsZIFL8VGh5cK28f7mKPcIjA",
  "name": "Ace Owner's organization",
  "slug": "ace-owner",
  "logo": null,
  "metadata": null,
  "createdAt": "2026-09-12T15:40:41.526Z",
  "invitations": [],
  "members": [
    {
      "id": "NWtoKSHxAQmm5yKxd1ma1X8nrnd6Spyx",
      "organizationId": "Hjr9TW3mpsZIFL8VGh5cK28f7mKPcIjA",
      "userId": "RNiaUs5y0jx0yWkxUQbPUgRluomlaqHx",
      "role": "owner",
      "createdAt": "2026-09-12T15:40:41.526Z",
      "user": {
        "id": "RNiaUs5y0jx0yWkxUQbPUgRluomlaqHx",
        "name": "Ace Owner",
        "email": "owner@example.com",
        "image": null
      }
    }
  ]
}
```

## API keys

There is no key admin screen. Keys are minted over HTTP from a logged-in session, which
is how Postman and n8n get one. The raw key is shown once, at creation, and is stored
only as a hash afterwards. Lose it and mint a new one.

**`POST /api-keys`** with `{ "name": "postman" }` returns `201`:

```json
{
  "id": "01a09647-2c6d-7431-9dbf-e17853781fb7",
  "name": "postman",
  "keyPrefix": "cms_QK0v4u2s",
  "key": "cms_QK0v4u2sOGF7xRYb5mZ1dJcP8hLtAeNwXi3ubKqSoT4",
  "lastUsedAt": null,
  "revokedAt": null,
  "createdAt": "2026-09-12T15:40:41.966Z"
}
```

`key` appears in this response and nowhere else. `keyPrefix` is the readable stub used to
tell keys apart in a list.

**`GET /api-keys`** returns the same objects without `key`, newest first:

```json
[
  {
    "id": "01a09647-2c6d-7431-9dbf-e17853781fb7",
    "name": "postman",
    "keyPrefix": "cms_QK0v4u2s",
    "lastUsedAt": "2026-09-12T15:40:41.981Z",
    "revokedAt": null,
    "createdAt": "2026-09-12T15:40:41.966Z"
  }
]
```

**`DELETE /api-keys/:id`** revokes a key and returns the revoked record. It is safe to
call twice. A revoked key fails lead ingest with `401`.

## Leads

Machines post and look up leads with an API key, and people read them, edit their values
and set their status with a session. Routes, the `values` shape and the field definitions
behind it are in `fe-lead-fields-api.md`.

## Errors

Every failure uses the same envelope. `message` is a string, or an array of strings for
validation failures.

```json
{
  "statusCode": 400,
  "message": ["property extra should not exist", "values must be an object"],
  "error": "Bad Request",
  "path": "/api/v1/leads",
  "timestamp": "2026-09-12T15:41:04.676Z"
}
```

| Status | When |
| --- | --- |
| `400` | body failed validation, or carried an unknown field |
| `401` | no session on a session route, or a missing, unknown or revoked API key |
| `403` | wrong org role, or a session with no active organization |
| `404` | the record does not exist in the active organization |
| `409` | a lead field key already exists, or a system field delete |
| `429` | rate limited |

`403 Active organization is required` should not appear now that sign-up provisions the
organization. If it does, the session belongs to a user with no membership, and signing
out and back in will not fix it.
