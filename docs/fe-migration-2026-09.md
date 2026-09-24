# Client migration, September 2026

What changed in the API and what the client repo has to do about it. Everything here
shipped together. `fe-phase1-api.md` and `fe-lead-fields-api.md` are the current
contracts; this file is only the diff and the reason for it.

Paths are relative to `/api/v1`.

## At a glance

| Change | Client impact |
| --- | --- |
| `GET /users` and `GET /users/:id` removed | **Breaking.** Move to Better Auth member endpoints |
| API key `id` is no longer a UUID | Breaking only if the client parses or validates it |
| API key `key` is longer | Breaking only if the client caps the field length |
| `name` and `keyPrefix` typed nullable on key responses | Type-level only, never null in practice |
| `DELETE /api-keys/:id` revocation time | Now stable across repeat calls |
| Everything about leads and lead fields | **No change** |
| Session, sign-up, sign-in, cookies, CORS | **No change** |

If the client does not read `/users` and does not validate the shape of an API key id,
nothing needs to change.

## 1. `/users` is gone

`GET /api/v1/users` and `GET /api/v1/users/:id` now return `404`. They duplicated
membership data Better Auth already serves, so they were removed rather than kept in sync.

**Use instead:**

```
GET /api/v1/auth/organization/list-members
GET /api/v1/auth/organization/get-full-organization
```

Both need the session cookie and an active organization, same as before. `list-members`
takes `limit`, `offset`, `sortBy`, `sortDirection`, and `userId` to fetch one person.

**The shape is different.** The old route returned users directly:

```json
[
  {
    "id": "RNiaUs5y...",
    "name": "Ace Owner",
    "email": "owner@example.com",
    "emailVerified": false,
    "image": null,
    "createdAt": "2026-09-12T15:40:41.402Z",
    "updatedAt": "2026-09-12T15:40:41.402Z"
  }
]
```

Better Auth returns memberships with the user nested:

```json
{
  "members": [
    {
      "id": "NWtoKSHx...",
      "organizationId": "Hjr9TW3m...",
      "userId": "RNiaUs5y...",
      "role": "owner",
      "createdAt": "2026-09-12T15:40:41.526Z",
      "user": {
        "id": "RNiaUs5y...",
        "name": "Ace Owner",
        "email": "owner@example.com",
        "image": null
      }
    }
  ],
  "total": 1
}
```

Notes for whoever does the migration:

- The outer `id` is the **membership** id, not the user id. Use `userId` or `user.id`
  wherever the old code used `id`.
- `role` is now available without a second call, which the old route never gave you.
- `emailVerified` and the user's own `createdAt` / `updatedAt` are **not** in this shape.
  Check whether any screen actually used them. If one does, say so and the API can expose
  it deliberately rather than by accident.
- One user belongs to one organization, so `total` is 1 today. Do not build on that.

## 2. API keys are issued by Better Auth now

The `/api-keys` routes, their request bodies and their response fields are unchanged. What
changed is who generates the values behind them.

- **`id` is no longer a UUID.** It is a 32-character opaque string such as
  `aQ8Lm2VtRk7sYw3ZpNc1XdF6hJ0bGuTe`. Any UUID regex, `uuid` pipe, or column formatter
  pointed at this field has to go. Treat it as an opaque string.
- **`key` is longer.** Still prefixed `cms_`, now followed by 64 characters instead of 43.
  Anything with a fixed-width input, a truncating column or a length check needs room.
- **`keyPrefix` is unchanged in meaning**: the first 12 characters of the raw key,
  e.g. `cms_JgzbfLra`, for telling keys apart in a list.
- **`name` and `keyPrefix` are typed `string | null`.** The plugin underneath permits
  null; this API requires a name and always stores the prefix, so they are never null on
  a key this API minted. Widen the type, do not add empty-state UI for it.
- **Revoking twice is now stable.** The second `DELETE /api-keys/:id` returns the same
  `revokedAt` as the first instead of moving it. If any screen re-sent the delete to be
  safe, it no longer corrupts the displayed time.

Existing keys already in use keep working. The stored digest was re-encoded in place
during the migration, so no key needs reissuing.

Better Auth also mounts its own key routes at `/auth/api-key/*`. Ignore them. `/api-keys`
stays the supported contract.

## 3. Nothing changed for leads

`POST /leads`, `GET /leads`, `GET /leads/:id`, `PATCH /leads/:id`,
`PATCH /leads/:id/status`, `PATCH /leads/:id/archive` and every `/leads/fields` route
behave exactly as `fe-lead-fields-api.md` describes. The archive stays its own axis, a
restored lead comes back at the stage it left on, and an API key still cannot move a
status or archive a lead.

One internal change worth knowing: a duplicate lead field key is now caught by the
database rather than a lookup before the insert. The response is the same `409` with the
same `Lead field {key} already exists` message, and two clients racing on the same key can
no longer both succeed.

## 4. Nothing changed for auth

Sign-up, sign-in, sign-out, `get-session`, the HTTP-only session cookie, `withCredentials`,
the allowed origins and the allowed request headers are all as documented. Sign-up still
provisions the organization and the session still carries `activeOrganizationId` with no
setup step.

## Checklist for the client repo

- [ ] Delete the `/users` API calls and whatever service wraps them.
- [ ] Repoint member lists at `list-members` or `get-full-organization`.
- [ ] Map `id` to `userId` / `user.id` at the call sites that showed a user id.
- [ ] Confirm no screen needs `emailVerified` or user timestamps. Report it if one does.
- [ ] Remove UUID validation or formatting on API key `id`.
- [ ] Give the raw key field room for `cms_` plus 64 characters.
- [ ] Widen the API key `name` and `keyPrefix` types to allow null.
- [ ] Re-run whatever e2e or contract tests the client has.
