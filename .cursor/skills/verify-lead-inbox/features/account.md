# Account

Sign-up is Google only. Sign-in keeps email and password beside Continue with Google. A signed-in user with no organization lands on Create your organization and cannot open the app until that workspace exists. The shell then shows the organization name and logo.

## Sub-features

- `signup-open` opens `/sign-up` with only Continue with Google.
- `signin-open` opens the sign-in card from `/login` and from the sign-up footer.
- `signin-save` signs in and opens `/leads`, or `/create-organization` when the user has no organization, or the `returnUrl` when it is a same-origin path and the user already has an organization.
- `signin-reject` keeps the person on the card and shows `Sign in failed` for bad credentials.
- `signout` asks `Sign out?` and then returns to sign in.
- `google-button` shows an enabled `Continue with Google` on both cards.

## How to get to it (user POV)

- Open `http://localhost:4200/login` while signed out.
- Open `http://localhost:4200/sign-up` while signed out.
- Choose `Create one` on the sign-in card.
- Choose `Sign in` on the create-account card.
- Open a signed-in URL such as `/leads` while signed out, then sign in.
- Choose `Sign out` in the header, then confirm in the dialog.

## Driving it with the Cursor browser

Preconditions:

- Doctor is clean at `http://localhost:4200`.
- cms-api is running and email sign-up is disabled.
- The Cursor browser is signed out. If `/login` redirects to `/leads` or `/create-organization`, sign out first.
- A verification email and password already exist from `account-create` when the step says to sign in. Do not type the everyday account.

- **Open sign in.** Go to `/login`. Run `browser_navigate` with `url` `http://localhost:4200/login`. The heading is `Sign in to Lead Inbox`. `Continue with Google` is present. Email and Password fields are present.
- **Footer to sign up.** Choose `Create one`. Run `browser_click` on the link named `Create one`. The heading becomes `Create account`. There is no email field and no password field.
- **Footer back to sign in.** Choose `Sign in`. Run `browser_click` on the link named `Sign in`. The heading is `Sign in to Lead Inbox` again.
- **Open sign up.** Go to `/sign-up`. Run `browser_navigate` with `url` `http://localhost:4200/sign-up`. The only button is `Continue with Google`.
- **Bad password.** On `/login`, fill the verification email and `wrong-password`. Run `browser_fill` then `browser_click` on `Sign in`. An alert titled `Sign in failed` stays on the card. The heading does not become `Leads`.
- **Sign in.** Fill the verification email and password from `account-create`. Run `browser_fill` then `browser_click` on `Sign in`. The heading is `Leads`. The header brand is the organization name.
- **Return URL.** Sign out. Open `http://localhost:4200/settings/lead-fields`. Sign in. Run `browser_navigate` to that path, then sign in. The heading is `Lead fields`, not `Leads`.
- **Proof.** After a successful sign-in, capture the empty inbox. Write `browser_snapshot` to `evidence/account/inbox-after-signin.aria.txt`. Take `inbox-after-signin.png` and copy it into `evidence/account/`. The ARIA file shows `Leads (0)` and `No leads yet`. The screenshot shows the organization name in the header.

## Gotchas

- Continue with Google leaves the app for Google. This recipe does not finish that round trip. A real OAuth client is required, and the local callback is `http://localhost:8000/api/v1/auth/callback/google`.
- After navigate, wait for the `h1`. The first snapshot can be an empty document titled `Lead Inbox`.
- A session on `/login` or `/sign-up` redirects. An admitted user goes to `/leads`. A user with no organization goes to `/create-organization`. Sign out before proving those cards.
- Two controls read `Sign out`. The header opens the dialog. The dialog footer confirms. Snapshot after the first click.
- `returnUrl` is ignored unless it starts with `/` and not `//`. An external URL must land on `/leads`. A user with no organization still goes to `/create-organization` instead of the return URL.
- Field errors stay `hidden` until the control is invalid and touched. Submit once to show `Enter your email.` and friends. A spec that only checks whether the error node exists will pass while the message is still hidden.
- Do not run `account-create` during the sign-up card proof. That helper does not use the form. Use it beforehand when a later step needs an email and password.
- The header email has no ARIA name. The snapshot will not list it. Use the screenshot.
- The workspace slug cannot be changed after create. Organization settings shows it as text.
