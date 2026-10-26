import { Component, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCopy } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButton } from '@ui/button';

/**
 * Puts a value on the clipboard. The confirmation is a toast, like every other save, and a
 * failure stays beside the button, because the person has to read it and try again by hand.
 * Clipboard access needs a secure page and a click, which a button gives it.
 */
@Component({
  selector: 'app-copy-button',
  imports: [HlmButton, NgIcon],
  providers: [provideIcons({ lucideCopy })],
  template: `
    <button
      hlmBtn
      type="button"
      variant="outline"
      size="sm"
      [attr.aria-label]="label()"
      (click)="copy()"
    >
      <ng-icon name="lucideCopy" aria-hidden="true" />
      Copy
    </button>
    @if (failed()) {
      <span role="alert" class="ms-2 text-xs text-destructive-ink">
        Could not copy. Select the text and copy it.
      </span>
    }
  `,
  host: { class: 'inline-flex items-center' },
})
export class CopyButton {
  /** What lands on the clipboard. */
  readonly value = input.required<string>();
  /** The button's accessible name, which says what is copied: "Copy integration key". */
  readonly label = input.required<string>();
  /** The toast on success: "Integration key copied". */
  readonly confirmation = input.required<string>();

  protected readonly failed = signal(false);

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.value());
      this.failed.set(false);
      toast.success(this.confirmation());
    } catch {
      this.failed.set(true);
    }
  }
}
