# Leads inbox

The inbox lists the organization's leads, newest first, with tabs for status and a separate archive, a column picker, and paging. Columns and labels come from the lead fields, not from hardcoded keys.

## Sub-features

- `inbox-empty` shows `No leads yet` for a new org with no rows.
- `inbox-list` shows a table named `Leads` whose first column links by the Contact name.
- `inbox-filter-status` filters with `All`, `New`, `Contacted`, and `Qualified` through `?status=`.
- `inbox-filter-archive` opens Archived through `?archived=true` and drops `status`.
- `inbox-columns` opens the Columns popover, toggles a field, and can reset.
- `inbox-page` shows Previous and Next when the list is longer than one page.

## How to get to it (user POV)

- Sign in, which lands on `/leads`.
- Choose `Leads` in the main nav.
- Choose the `Lead Inbox` brand link.
- Open `/leads`, `/leads?status=new`, `/leads?status=contacted`, `/leads?status=qualified`, or `/leads?archived=true`.
- Choose a status tab or `Archived` on the inbox itself.

## Driving it with the Cursor browser

Preconditions:

- Doctor is clean at `http://localhost:4200`.
- A verification account exists via `node .cursor/skills/verify-lead-inbox/scripts/verify.mjs account-create`.
- You are signed in as that user. The header shows its email.
- For list, filter, columns, and paging proofs, a lead exists via `node .cursor/skills/verify-lead-inbox/scripts/verify.mjs seed-lead`. Read `candidate` from `.run/lead.json`.
- For `inbox-empty` only, use a fresh account and do not seed.

- **Empty inbox.** With no seeded lead, open `/leads`. Run `browser_navigate` with `url` `http://localhost:4200/leads`. Heading `Leads (0)`. Copy `No leads yet` and `New leads appear here, newest first.` No table named `Leads`.
- **Seeded list.** After `seed-lead`, reload `/leads`. Run `browser_navigate` with `url` `http://localhost:4200/leads`. Heading includes `Leads (` and a count. Table `Leads` has a link named the seeded `candidate`. Default columns are the short fields, so Contact, Product, Status, and Received show. Source and the long text fields do not, until Columns includes them.
- **Open a lead.** Choose the Contact link. Run `browser_click` on the link named the seeded candidate. The lead heading is that name. The URL is `/leads/<id>` with the list's query string preserved.
- **All and New.** From `/leads`, choose `New`. Run `browser_click` on the link named `New` in `Filter leads by status`. The URL has `status=new`. `New` has `aria-current="page"`. The seeded lead stays, because machines file status `new`.
- **Empty status.** Choose `Contacted`. Run `browser_click` on `Contacted`. Copy `No leads with this status` and `Set a lead's status to Contacted to see it here.`
- **Archive tab.** Choose `Archived`. Run `browser_click` on `Archived`. The URL has `archived=true` and no `status`. Copy `No archived leads` until a lead is archived. `Archived` has `aria-current="page"`.
- **Back to All.** Choose `All`. Run `browser_click` on `All`. The URL is `/leads` with those filters gone.
- **Columns.** Choose `Columns`. Run `browser_click` on the button named `Columns`. Snapshot the document. Tick `Source`. Run `browser_click` on the checkbox labelled `Source`. The table gains a Source column whose cell reads the host, such as `example.com`. Choose `Reset columns`. Run `browser_click` on `Reset columns`. Source leaves the default table.
- **Proof.** Capture the seeded inbox on All. Write `browser_snapshot` to `evidence/leads-inbox/list.aria.txt` and `browser_take_screenshot` to `evidence/leads-inbox/list.png`. The artifacts show `Leads`, the filter nav, and the seeded candidate.

## Gotchas

- The table waits on field definitions. A `?status=` value that is not one of the status options is treated as no filter. Wait for the tabs before asserting the list.
- Archived is a second list, not a status. Picking it drops `status`. Picking a status drops `archived`.
- Column picks live in this browser under `localStorage` key `leadColumns`. A leftover pick from an earlier run changes the default table. If `Reset columns` is present at the start, use it before proving defaults.
- A link cell is named after the host, not `Open`. Detail spells the full URL.
- Paging uses 20 rows per page. One seeded lead will not show Previous or Next. Do not call paging verified unless `lastPage` is above 1.
- Loading uses `aria-label="Leads, loading"`. Wait for `Leads` without `, loading` before asserting rows.
- Do not create a lead in the UI. There is no such control. Use `seed-lead`.
