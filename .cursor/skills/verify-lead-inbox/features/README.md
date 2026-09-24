# Lead Inbox verification map

This directory is the maintained source for verifying the user-facing behavior of Lead Inbox. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- cms-api is on `http://localhost:8000` with `CORS_ALLOWED_ORIGINS` including `http://localhost:4200`.
- Lead Inbox is on `http://localhost:4200`. Launch with `node .cursor/skills/verify-lead-inbox/scripts/verify.mjs launch`.
- `node .cursor/skills/verify-lead-inbox/scripts/verify.mjs doctor` reports the expected URL, API health, and CORS.
- Drive only in the Cursor IDE browser. Do not use the user's Chrome profile.
- Use a verification account, never the owner's everyday login. Create it in the browser for the account feature, or with `account-create` for the others.
- Never bind a second client port. CORS will refuse it.
- Never kill an adopted client on cleanup.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors or DOM position.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser actions through the Cursor IDE browser tools named in each step.
- After opening a dialog, select, or popover, snapshot the document. Those layers are portaled.
- Restore nothing on cms-api that belongs to another org. Verification orgs are disposable. Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with Lead Inbox identifiable.
- Mutation proof includes a second user-facing view of the saved value.
- Leads are created with `seed-lead`, which calls `POST /leads` with an API key. That is the product path. The UI has no create action.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with the Cursor browser` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Account](./account.md) covers sign up, sign in, sign out, return URLs, and the disabled Google button.
- [Leads inbox](./leads-inbox.md) covers the empty inbox, the table, status tabs, the archive tab, columns, and paging.
- [Lead detail](./lead-detail.md) covers reading a lead, changing status, editing values, archive, restore, and opening the source.
- [Lead fields](./lead-fields.md) covers the field list and adding a custom field.
