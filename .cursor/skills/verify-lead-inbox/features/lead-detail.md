# Lead detail

Lead detail is the record: what they said, the facts, a status select, value edits, and archive. There is no card around the passages. Status is a field in the details rail. Archive is an action, not a stage.

## Sub-features

- `detail-open` opens a lead from the inbox and returns with `Back to leads`.
- `detail-read` shows narrative passages, a details rail of held values, and a count of empty fields.
- `detail-source` offers `Open source` named after the field, with the host in the screen-reader text.
- `detail-status` saves a new status as soon as it is picked and toasts `Status saved`.
- `detail-edit` saves changed values from `Edit details` and toasts `Changes saved`.
- `detail-archive` asks first, then moves the lead to Archived without changing status.
- `detail-restore` restores in one click from the archived strip.

## How to get to it (user POV)

- Choose the Contact link in the inbox table.
- Open `/leads/<id>` while signed in, including with the list's `status` or `archived` query still on the URL.
- Choose `Back to leads` to return to that list.

## Driving it with the Cursor browser

Preconditions:

- Doctor is clean at `http://localhost:4200`.
- A verification account exists via `account-create`, and you are signed in as that user.
- A lead exists via `seed-lead`. Open it from `/leads` by the `candidate` in `.run/lead.json`.

- **Open from the list.** On `/leads`, choose the candidate link. Run `browser_click` on that link. The heading is the candidate. `Back to leads` is present. The URL keeps the list query string.
- **Read the record.** `What they said` and `Why this is a lead` are headings over the seeded passages. The details rail is named `Details`. Product is `POS`. Status is a badge next to the title and a select labelled `Status` in the rail. The footer line includes `Updated` and the lead id. There is no `Not set` row for empty custom fields.
- **Open source.** Choose `Open source`. The control is a link named `Open source` with extra text `(example.com, opens in a new tab)` when the seeded source host is example.com. Do not treat the new tab as the proof. The name and host on this page are the proof. Leave the Lead Inbox tab selected.
- **Change status.** Open the Status select in the details rail. Run `browser_click` on the button labelled `Status`, snapshot the document, then `browser_click` on `[data-slot="select-item"]` named `Contacted`. The title badge reads `Contacted`. A toast reads `Status saved`.
- **Confirm status in the list.** Choose `Back to leads`, then `Contacted`. Run `browser_click` on `Back to leads`, then on `Contacted`. The lead is in that list and not in `New`.
- **Edit a value.** Open the lead, choose `Edit`. Run `browser_click` on `Edit`. The heading `Edit details` appears. Change Product. Run `browser_click` on the button labelled `Product`, snapshot, then on `PMS`. Choose `Save changes`. Run `browser_click` on `Save changes`. A toast reads `Changes saved`. The details rail shows `PMS`.
- **No changes.** Choose `Edit`, then `Save changes` without edits. Run those clicks. A toast reads `No changes` and the form closes.
- **Archive.** Choose `Archive`. Run `browser_click` on `Archive`. Snapshot. The dialog heading is `Archive this lead?`. Choose `Archive lead`. Run `browser_click` on `Archive lead`. The strip `This lead is archived.` appears with `Restore`. There is no success toast.
- **Confirm archive in the list.** Choose `Back to leads`. The All list no longer has this candidate. Choose `Archived`. The candidate is there, still `Contacted`.
- **Restore.** Open the archived lead, choose `Restore`. Run `browser_click` on `Restore`. The strip is gone. `Archive` is back. All lists the lead again at Contacted.
- **Proof.** Capture the open record after the status save and before archive. Write `browser_snapshot` to `evidence/lead-detail/contacted.aria.txt` and `browser_take_screenshot` to `evidence/lead-detail/contacted.png`. The artifacts show the candidate, badge `Contacted`, passages, and `Open source`.

## Gotchas

- Status saves on pick. There is no Save next to the select. The header control is a badge, not the editor.
- Archive does not toast. The strip and the Archived tab are the proof. Restore does not ask.
- Edit sends only changed keys. A retired select option is shown disabled. Do not re-select it.
- Long text under 24 characters with no line break sits in Details, not as a passage. Seeded `signal` and `whyLead` are long enough to be sections.
- Overlapping saves: a status response may not rewrite values you just edited. If you prove both, wait for each toast or strip before starting the next.
- `Open source` is named after the field label, lowercased. If someone renamed the field, the button text follows the label. The host is still in the screen-reader text.
- Select options are portaled. A snapshot taken before open will not list `Contacted`.
- Failures stay in alerts on the page. A toast means the save landed.
