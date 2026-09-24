# Account

Account lets a person create an organization by signing up, return later by signing in, leave through sign out, and recover a deep link after login. Google sign-in is visible and disabled.

## Sub-features

- `signup-open` opens the create-account card from `/sign-up` and from the sign-in footer.
- `signup-save` creates the account and lands on an empty inbox.
- `signin-open` opens the sign-in card from `/login` and from the sign-up footer.
- `signin-save` signs in and opens `/leads`, or the `returnUrl` when it is a same-origin path.
- `signin-reject` keeps the person on the card and shows `Sign in failed` for bad credentials.
- `signout` asks `Sign out?` and then returns to sign in.
- `google-soon` keeps `Continue with Google` disabled.

## How to get to it (user POV)

- Open `http://localhost:4200/login` while signed out.
- Open `http://localhost:4200/sign-up` while signed out.
- Choose `Create one` on the sign-in card.
- Choose `Sign in` on the create-account card.
- Open a signed-in URL such as `/leads` or `/settings/lead-fields` while signed out, then sign in.
- Choose `Sign out` in the header, then confirm in the dialog.

## Driving it with the Cursor browser

Preconditions:

- Doctor is clean at `http://localhost:4200`.
- cms-api accepts sign-up.
- The Cursor browser is signed out. If `/login` redirects to `/leads`, sign out first.
- The email you will type is unused.

- **Open sign in.** Go to `/login`. Run `browser_navigate` with `url` `http://localhost:4200/login`. The heading is `Sign in to Lead Inbox`. The button `Continue with Google (coming soon)` is present and disabled.
- **Footer to sign up.** Choose `Create one`. Run `browser_click` on the link named `Create one`. The heading becomes `Create account`. The description is `Your account includes an organization and an empty leads list.`
- **Footer back to sign in.** Choose `Sign in`. Run `browser_click` on the link named `Sign in`. The heading is `Sign in to Lead Inbox` again.
- **Google stays off.** On either card, the button `Continue with Google (coming soon)` does not submit and stays disabled.
- **Open sign up.** Go to `/sign-up`. Run `browser_navigate` with `url` `http://localhost:4200/sign-up`.
- **Create account.** Fill name, a unique email, and a password of at least 8 characters. Run `browser_fill` on `Name` with `Verify Owner`, on `Email` with a unique `verify.<stamp>@lead-inbox.test`, and on `Password` with a value of 8 or more characters. Choose `Create account`. Run `browser_click` on the button named `Create account`. The button reads `Creating account` while the request is in flight. Wait until the heading is `Leads (0)` and the empty copy is `No leads yet`. The header screenshot shows that email.
- **Sign out.** Choose `Sign out`, then confirm. Run `browser_click` on the header button named `Sign out`, snapshot, then `browser_click` on the dialog button named `Sign out` under the heading `Sign out?`. The heading is `Sign in to Lead Inbox`.
- **Bad password.** On `/login`, fill the verification email and `wrong-password`. Run `browser_fill` then `browser_click` on `Sign in`. An alert titled `Sign in failed` stays on the card. The heading does not become `Leads`.
- **Sign in.** Fill the verification email and password. Run `browser_fill` then `browser_click` on `Sign in`. The heading is `Leads`.
- **Return URL.** Sign out. Open `http://localhost:4200/settings/lead-fields`. Sign in. Run `browser_navigate` to that path, then sign in. The heading is `Lead fields`, not `Leads`.
- **Proof.** After a successful sign-up, capture the empty inbox. Write `browser_snapshot` to `evidence/account/inbox-after-signup.aria.txt`. Take `inbox-after-signup.png` and copy it into `evidence/account/`. The ARIA file shows `Leads (0)` and `No leads yet`. The screenshot shows the verification email in the header.

## Gotchas

- After navigate, wait for the `h1`. The first snapshot can be an empty document titled `Lead Inbox`.
- A session on `/login` or `/sign-up` redirects to `/leads` with no form. Sign out before proving those cards.
- Two controls read `Sign out`. The header opens the dialog. The dialog footer confirms. Snapshot after the first click.
- `returnUrl` is ignored unless it starts with `/` and not `//`. An external URL must land on `/leads`.
- Sign-up names the organization `{Name}'s organization`. There is no Organization screen yet. Do not look for a picker.
- Field errors stay `hidden` until the control is invalid and touched. Submit once to show `Enter your email.` and friends. A spec that only checks whether the error node exists will pass while the message is still hidden.
- Do not run `account-create` for this feature. That helper skips the form this recipe exists to prove.
- The header email has no ARIA name. The snapshot will not list it. Use the screenshot.
- Wait for `Creating account` to become a `Leads (0)` heading. A snapshot taken during the request is still the sign-up card.
