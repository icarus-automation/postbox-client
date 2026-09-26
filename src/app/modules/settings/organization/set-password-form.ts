import { Component, inject, signal } from '@angular/core';
import { apiErrorMessage } from '@core/api/api-error';
import { Auth } from '@core/auth/auth';
import { HlmButton } from '@ui/button';
import { HlmField, HlmFieldError, HlmFieldLabel } from '@ui/field';
import { HlmInput } from '@ui/input';

@Component({
  selector: 'app-set-password-form',
  imports: [HlmButton, HlmField, HlmFieldError, HlmFieldLabel, HlmInput],
  template: `
    <form class="grid gap-3" (submit)="$event.preventDefault(); save()">
      <div>
        <h2 class="text-base">Set a password</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          You can then sign in with your email and this password.
        </p>
      </div>

      <div hlmField class="gap-1.5">
        <label hlmFieldLabel for="new-password">Password</label>
        <input
          hlmInput
          id="new-password"
          type="password"
          autocomplete="new-password"
          [value]="password()"
          (input)="password.set($any($event.target).value)"
        />
        @if (error(); as message) {
          <hlm-field-error>{{ message }}</hlm-field-error>
        } @else {
          <p class="text-xs text-muted-foreground">At least 8 characters.</p>
        }
      </div>

      <button hlmBtn type="submit" [disabled]="password().length < 8 || saving()">Set password</button>
    </form>
  `,
})
export class SetPasswordForm {
  private readonly auth = inject(Auth);

  protected readonly password = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected async save(): Promise<void> {
    if (this.password().length < 8 || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.auth.setPassword(this.password());
    } catch (error) {
      this.error.set(apiErrorMessage(error, 'Could not set the password.'));
      this.saving.set(false);
    }
  }
}
