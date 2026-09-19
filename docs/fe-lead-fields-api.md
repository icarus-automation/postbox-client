# Lead fields API

How the client and agents work with leads whose attributes come from field definitions.
Paths are relative to `/api/v1` on the API host. Sign-in, sessions and minting API keys
are in `fe-phase1-api.md`.

## CORS and credentials

- Browser calls ride the HTTP-only session cookie, so send credentials on every call:
  `withCredentials: true` in Angular, `credentials: 'include'` with fetch.
- Allowed origins come from `CORS_ALLOWED_ORIGINS`, local default
  `http://localhost:4200`. Better Auth answers `403` to browser-shaped requests with no
  `Origin` header, which only affects scripts.
- Browsers may send `Content-Type` and `Authorization` only. `x-api-key` is not allowed
  cross-origin, so API keys stay with machines.

## Auth mode per route

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/leads/fields` | session with any org role, or API key |
| POST | `/leads/fields` | session, role `owner` or `admin` |
| PATCH | `/leads/fields/:id` | session, role `owner` or `admin` |
| DELETE | `/leads/fields/:id` | session, role `owner` or `admin` |
| POST | `/leads` | API key only |
| GET | `/leads` | session with any org role, or API key |
| GET | `/leads/:id` | session with any org role, or API key |
| PATCH | `/leads/:id` | session |
| PATCH | `/leads/:id/status` | session |
| PATCH | `/leads/:id/archive` | session |

The three read routes that take either use the session's organization when a session is
present and the key's organization otherwise. Every other route accepts only the
credential listed.

## Field definitions

A field definition describes one lead attribute:

```json
{
  "id": "01a09aa4-d9d6-75d1-81ca-8ede5d7fcb2b",
  "key": "product",
  "label": "Product",
  "type": "select",
  "options": ["POS", "PMS", "Other"],
  "isRequired": true,
  "isReadOnly": false,
  "isSystem": true,
  "position": 1
}
```

| Property | Meaning |
| --- | --- |
| `key` | name used in lead `values`. camelCase, unique per organization, never changes |
| `label` | display name |
| `type` | `text`, `long_text`, `number`, `select`, `url`, `date` or `datetime` |
| `options` | allowed values of a `select` field, `[]` on other types |
| `isRequired` | must be given when a lead is created |
| `isReadOnly` | set by the API and refused in lead `values` |
| `isSystem` | ships with every organization and cannot be deleted |
| `position` | ascending sort key, ties keep creation order |

### System fields

Every organization starts with these, in this order:

| Key | Label | Type | Required | Notes |
| --- | --- | --- | --- | --- |
| `candidate` | Contact | text | yes | name or handle of the person |
| `product` | Product | select | yes | `POS`, `PMS`, `Other` |
| `source` | Source | url | yes | link to the post or comment |
| `signal` | What they said | long_text | yes | what they said that makes them a lead |
| `whyLead` | Why this is a lead | long_text | yes | why the lead is worth a message |
| `status` | Status | select | read-only | `new`, `contacted`, `qualified` |
| `receivedAt` | Received | datetime | read-only | when the API stored the lead |

Labels are what a person sees, keys are what a machine sends. An admin can rename a label,
and the key it carries never changes.

Admins can change the label, position and `isRequired` of the writable system fields, and
the `product` options. `status` and `receivedAt` only take a new label or position.

### Value rules per type

| Type | JSON value | Accepted |
| --- | --- | --- |
| `text` | string | not blank, up to 500 characters |
| `long_text` | string | not blank, up to 5000 characters |
| `number` | number | a JSON number, so `"1200"` is refused |
| `select` | string | exactly one of `options`, case-sensitive |
| `url` | string | `http` or `https` URL, up to 2048 characters |
| `date` | string | `YYYY-MM-DD` |
| `datetime` | string | ISO 8601, system fields only |

### `GET /leads/fields`

`200` with every field in position order. Trimmed to two entries here:

```json
[
  {
    "id": "01a09aa4-d9d6-75d1-81ca-8812b3cf2a35",
    "key": "candidate",
    "label": "Contact",
    "type": "text",
    "options": [],
    "isRequired": true,
    "isReadOnly": false,
    "isSystem": true,
    "position": 0
  },
  {
    "id": "01a09aa4-d9d7-72b6-80a4-e544215ad2ee",
    "key": "status",
    "label": "Status",
    "type": "select",
    "options": ["new", "contacted", "qualified"],
    "isRequired": false,
    "isReadOnly": true,
    "isSystem": true,
    "position": 6
  }
]
```

### `POST /leads/fields`

Adds a custom field after the last one.

```json
{ "key": "dealSize", "label": "Deal size", "type": "number" }
```

```json
{ "key": "tier", "label": "Tier", "type": "select", "options": ["Gold", "Silver"], "isRequired": false }
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `key` | string | yes | lowercase letter first, then letters and digits, max 40 |
| `label` | string | yes | max 80 |
| `type` | string | yes | `text`, `long_text`, `number`, `select`, `url` or `date` |
| `isRequired` | boolean | no | default `false` |
| `options` | string[] | select only | 1 to 100 unique, non-empty, max 80 each |

`201` with the new field:

```json
{
  "id": "01a09aa7-e925-701f-9ee9-d634323fcea9",
  "key": "dealSize",
  "label": "Deal size",
  "type": "number",
  "options": [],
  "isRequired": false,
  "isReadOnly": false,
  "isSystem": false,
  "position": 8
}
```

`409` when the key is taken. `400` for options on a non-select field, or a select field
without them. A required field applies to every lead posted after it, so an agent that
does not send it starts getting `400`.

### `PATCH /leads/fields/:id`

Any of `label`, `isRequired`, `options` and `position`:

```json
{ "label": "Account tier", "options": ["Gold", "Silver", "Bronze"], "position": 2 }
```

`200` with the updated field, `404` outside the organization. `key` and `type` never
change and are refused with `400`, as is `null` on any property. `options` only apply to
select fields, and read-only fields take only `label` and `position`.

Changes affect later writes only, and making a field required leaves existing leads as
they are. Removing a select option retires it: new writes refuse it, while leads that
hold it keep it and still return it. Render a select value missing from `options` as a
legacy value, and add the option back to restore it.

### `DELETE /leads/fields/:id`

Deletes a custom field together with every value leads hold for it. `200` with the deleted
field, `409` for a system field, `404` outside the organization.

## Leads

A lead is an id, a `values` object keyed by field key, an archive flag and timestamps:

```json
{
  "id": "01a09aa8-08c6-7348-a4a9-5c54e89aaa8f",
  "values": {
    "candidate": "Dana Reyes",
    "product": "POS",
    "source": "https://facebook.com/groups/indiefounders/posts/123456",
    "signal": "Asked which POS handles split bills for a 40-seat cafe",
    "whyLead": "Opening a second location next month and comparing POS vendors now.",
    "status": "new",
    "receivedAt": "2026-09-13T12:04:58.694Z",
    "dealSize": 1200
  },
  "isArchived": false,
  "createdAt": "2026-09-13T12:04:58.694Z",
  "updatedAt": "2026-09-13T12:04:58.694Z"
}
```

`values` holds every current field key in position order, with `null` where the lead has
no value. A table can take its columns from `GET /leads/fields` and read each cell from
`values[field.key]`. A deleted field disappears from `values`.

`isArchived` sits beside `values`, not inside it, because archiving is not a stage. A lead
moves through `new`, `contacted` and `qualified`, and archiving takes it out of the inbox
while it keeps the status it reached. Restoring puts it back at that same status.

### Create, machines only

**`POST /leads`** with `x-api-key` and no session. The organization comes from the key.

1. `GET /leads/fields` with the same key.
2. Skip leads already filed: `GET /leads?field=source&value=<url>&limit=1` answers with
   `meta.total` above 0 when one exists.
3. Build `values` from fields with `isReadOnly: false`, including every one with
   `isRequired: true`.
4. Post it.

```
POST /api/v1/leads
x-api-key: <raw key>
content-type: application/json
```

```json
{
  "values": {
    "candidate": "Dana Reyes",
    "product": "POS",
    "source": "https://facebook.com/groups/indiefounders/posts/123456",
    "signal": "Asked which POS handles split bills for a 40-seat cafe",
    "whyLead": "Opening a second location next month and comparing POS vendors now.",
    "dealSize": 1200
  }
}
```

`201` with the lead in the shape above. `status` is always `new`, and a `null` value
counts as leaving the field out. Every problem comes back in one `400`:

```json
{
  "statusCode": 400,
  "message": [
    "values.product must be one of: POS, PMS, Other",
    "values.source must be an http or https URL of at most 2048 characters",
    "values.budget is not a lead field",
    "values.status is read-only"
  ],
  "error": "Bad Request",
  "path": "/api/v1/leads",
  "timestamp": "2026-09-13T12:04:59.292Z"
}
```

A missing required field reads `values.candidate is required`. A body without a `values`
object reads `values must be an object`, and anything next to `values` reads
`property extra should not exist`.

### Read, humans and agents

**`GET /leads`** with the session or `x-api-key`. Newest first.

| Param | Notes |
| --- | --- |
| `page` | default 1 |
| `limit` | default 10, max 50 |
| `status` | one of the status values |
| `archived` | `true` or `false`, default `false` |
| `field`, `value` | exact match on one field, always sent together |

```
{ "data": [lead, ...], "meta": { "total": 1, "page": 1, "limit": 10, "lastPage": 1 } }
```

`archived` picks the list: the inbox by default, the archive with `archived=true`. One
list is never both, so a `status` filter always runs inside the list `archived` chose. Any
other value answers `400` rather than reading as `false`, so a typo never quietly hides the
archive.

`field` takes any field key with `isReadOnly: false`, and filters combine. `value` is
compared as stored, so it is case-sensitive and a URL must match exactly. A number field
takes a numeric string, such as `field=dealSize&value=1200`. A lookup still finds leads
holding a retired select option. An unknown or read-only `field` answers `400`, as does
`field` or `value` sent alone.

```
GET /api/v1/leads?field=source&value=https%3A%2F%2Ffacebook.com%2Fgroups%2Findiefounders%2Fposts%2F123456&limit=1
```

**`GET /leads/:id`** returns one lead, or `404`.

### Edit values, humans only

**`PATCH /leads/:id`** with the session:

```json
{ "values": { "product": "PMS", "dealSize": null } }
```

Only the given keys change, and `null` clears a value. `values` must name at least one
field. Unknown keys, read-only keys and clearing a required field answer `400`. Required
fields the lead lacks are not enforced here, so older leads stay editable after a field
becomes required. Send only the keys that changed, because a retired select option is
refused even when the lead already holds it. `200` with the whole lead and a fresh `updatedAt`, `404` outside the
organization.

### Set status, humans only

**`PATCH /leads/:id/status`** with `{ "status": "contacted" }` answers `200` with the whole
lead. Any status can follow any other. `status` is read-only in `values`, so this route is
the only way to move a lead, and no API key reaches it.

### Archive and restore, humans only

**`PATCH /leads/:id/archive`** with `{ "isArchived": true }` takes a lead out of the inbox,
and `false` puts it back. `200` with the whole lead and a fresh `updatedAt`, `404` outside
the organization. It never touches `status`, so a restored lead comes back at the stage it
left on. Like status, no API key reaches it: an agent files leads, a person decides which
ones leave the inbox.

## Errors

The envelope is the one in `fe-phase1-api.md`. Validation messages come back as an array.

| Status | When |
| --- | --- |
| `400` | body or values failed validation, or a field rule above refused the change |
| `401` | no session or API key, or an unknown or revoked key |
| `403` | session role too low for the route |
| `404` | the field or lead is not in the active organization |
| `409` | the field key already exists, or a system field delete |
