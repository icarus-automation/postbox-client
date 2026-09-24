# Lead fields

Lead fields is the settings list of what a lead holds. Every org starts with built-in fields. A person adds a custom field at the end through a dialog. This screen does not rename, reorder, or delete.

## Sub-features

- `fields-open` reaches the list from Settings and from the sidebar path.
- `fields-list` shows built-in rows with type names, required, and keys, plus Built-in and Automatic badges.
- `fields-add-open` opens the Add field dialog from `Add field`.
- `fields-add-save` appends the field and announces `Added {label}.`
- `fields-add-cancel` closes the dialog without a new row.
- `fields-key-from-label` fills Key from Label until the person types a key of their own.

## How to get to it (user POV)

- Choose `Settings` in the footer nav, then the `Lead fields` card.
- On a phone-sized viewport, choose the header icon `Settings`, then `Lead fields`.
- Open `/settings/lead-fields` while signed in.
- Choose `Back to settings` to return to `/settings`.

## Driving it with the Cursor browser

Preconditions:

- Doctor is clean at `http://localhost:4200`.
- A verification account exists via `account-create`, and you are signed in as that user.
- You have not added a field named `Budget` to this org yet.

- **Settings index.** Open `/settings`. Run `browser_navigate` with `url` `http://localhost:4200/settings`. Heading `Settings`. General has `Organization` with badge `Soon` and no link. Leads has a link `Lead fields`.
- **Open the list.** Choose `Lead fields`. Run `browser_click` on the link named `Lead fields`. Heading `Lead fields`. `Back to settings` is present. Table `Lead fields` includes Contact, Product, Source, What they said, Why this is a lead, Status, Received. Contact shows `Built-in`. Status and Received show `Built-in` and `Automatic`. Type cells are `Text`, `Select`, `URL`, `Long text`, `Date and time`, never `long_text`. Keys `candidate`, `product`, `source`, `signal`, `whyLead`, `status`, `receivedAt` are visible as code.
- **Open add.** Choose `Add field`. Run `browser_click` on the button named `Add field`. Snapshot the document. Heading `Add field`. Type reads `Text`.
- **Key follows label.** Fill Label `Budget`. Run `browser_fill` on `Label` with `Budget`. Key becomes `budget` without typing in Key.
- **Own key.** Change Key to `dealSize`. Run `browser_fill` on `Key` with `dealSize`. Changing Label after that must not overwrite `dealSize`.
- **Cancel.** Choose `Cancel`. Run `browser_click` on `Cancel`. The dialog closes. The table has no Budget row. The status line is empty.
- **Add a text field.** Open Add field again. Label `Budget`, leave Type `Text`, leave required off, leave Key `budget`. Choose the dialog's `Add field`. Run `browser_click` on that submit button. The dialog closes. The table ends with Budget, Type `Text`, Required `No`, Key `budget`. The status line is `Added Budget.`
- **Add a select.** Open Add field. Label `Tier`, Type `Select`. After choosing Type, snapshot, then fill Options with two lines `Gold` and `Silver`. Submit. The row is Tier, Type `Select`, Key `tier`. Options do not appear under Type in the table.
- **Proof.** Capture the list after Budget is added. Write `browser_snapshot` to `evidence/lead-fields/list-after-add.aria.txt` and `browser_take_screenshot` to `evidence/lead-fields/list-after-add.png`. The artifacts show the built-in rows, Budget, and `Added Budget.`

## Gotchas

- The Type select stores `long_text` and shows `Long text`. Assert the closed name, not the stored key.
- Option lists are portaled. Open Type, then read `[data-slot="select-item"]` from the document.
- Advanced is a heading over Key, always visible, not a disclosure. Do not look for a toggle.
- The form works outside a dialog in unit tests. In this app it is inside the dialog. Look for it in the document after `Add field`.
- `hlmDialogTitle` is not on this heading. The dialog is named by `aria-labelledby="add-lead-field-heading"`.
- There is no rename, delete, or reorder control here. Those happen over the API. Do not fail the proof because they are missing.
- Organization is `Soon` and has no link. That card is the expected shape, not a broken Settings page.
- Adding the same key twice is refused. Use a unique label, or a unique Key under Advanced.
