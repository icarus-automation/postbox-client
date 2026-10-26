import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import {
  FormField,
  FormRoot,
  type TreeValidationResult,
  form,
  maxLengthError,
  required,
  requiredError,
  validate,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucidePlus } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { apiErrorMessage } from '@core/api/api-error';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmBadge } from '@ui/badge';
import { HlmButton } from '@ui/button';
import { CopyButton } from '@ui/copy-button';
import { HlmDialog, HlmDialogImports } from '@ui/dialog';
import { HlmFieldImports } from '@ui/field';
import { HlmInput } from '@ui/input';
import { HlmSkeleton } from '@ui/skeleton';
import { HlmSpinner } from '@ui/spinner';
import { HlmTableImports } from '@ui/table';
import { ApiKeys } from '../services/api-keys';
import type { ApiKeySummary, CreatedApiKey } from './api-keys.types';

/** The API refuses longer names. */
const NAME_MAX_LENGTH = 100;

/**
 * Keeps the raw key out of the list, which outlives the dialog that shows it. It names each
 * field it keeps, so a field added to the response later never rides along by accident.
 */
function withoutKey(created: CreatedApiKey): ApiKeySummary {
  return {
    id: created.id,
    name: created.name,
    keyPrefix: created.keyPrefix,
    lastUsedAt: created.lastUsedAt,
    revokedAt: created.revokedAt,
    createdAt: created.createdAt,
  };
}

/**
 * Settings, Advanced. The organization's admin API keys, for servers and agents that file drafts
 * and read leads. They are server-only, and the screen says so. A new key's value is shown
 * once, in the dialog that made it. Owners and admins only.
 */
@Component({
  selector: 'app-api-keys-settings',
  imports: [
    DatePipe,
    FormField,
    FormRoot,
    RouterLink,
    NgIcon,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmBadge,
    HlmButton,
    HlmDialogImports,
    HlmFieldImports,
    HlmInput,
    HlmSkeleton,
    HlmSpinner,
    HlmTableImports,
    CopyButton,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucidePlus })],
  templateUrl: './api-keys-settings.html',
  host: { class: 'page-wide' },
})
export class ApiKeysSettings {
  private readonly apiKeys = inject(ApiKeys);
  private readonly createDialog = viewChild.required<HlmDialog>('createDialog');
  private readonly revokeDialog = viewChild.required<HlmDialog>('revokeDialog');

  protected readonly list = this.apiKeys.all();

  protected readonly rows = computed(() => (this.list.hasValue() ? this.list.value() : []));

  protected readonly errorMessage = computed(() => {
    const error = this.list.error();
    return error ? apiErrorMessage(error, 'Could not load the admin API keys.') : null;
  });

  protected readonly skeletonRows = Array.from({ length: 3 }, (_, index) => index);

  /** The key just made, held only while the create dialog shows it. */
  protected readonly created = signal<CreatedApiKey | null>(null);
  protected readonly createError = signal<string | null>(null);

  protected readonly target = signal<ApiKeySummary | null>(null);
  protected readonly revoking = signal(false);
  protected readonly revokeError = signal<string | null>(null);

  private readonly draft = signal({ name: '' });

  protected readonly nameForm = form(
    this.draft,
    (path) => {
      required(path.name, { message: 'Enter a name.' });
      validate(path.name, ({ value }) =>
        value().trim() === '' ? requiredError({ message: 'Enter a name.' }) : undefined,
      );
      validate(path.name, ({ value }) =>
        value().trim().length > NAME_MAX_LENGTH
          ? maxLengthError(NAME_MAX_LENGTH, {
              message: `Use ${NAME_MAX_LENGTH} characters or fewer.`,
            })
          : undefined,
      );
    },
    { submission: { action: () => this.create() } },
  );

  protected startCreate(): void {
    this.created.set(null);
    this.createError.set(null);
    this.nameForm().reset({ name: '' });
    this.createDialog().open();
  }

  protected startRevoke(key: ApiKeySummary): void {
    this.target.set(key);
    this.revokeError.set(null);
    this.revokeDialog().open();
  }

  protected async confirmRevoke(): Promise<void> {
    const target = this.target();
    if (!target || this.revoking()) {
      return;
    }
    this.revoking.set(true);
    this.revokeError.set(null);
    try {
      const revoked = await this.apiKeys.revoke(target.id);
      this.list.update((list) => (list ?? []).map((key) => (key.id === revoked.id ? revoked : key)));
      this.revokeDialog().close();
      toast.success(`Revoked ${target.name ?? 'the key'}`);
    } catch (error) {
      this.revokeError.set(apiErrorMessage(error, 'Could not revoke the key. Try again.'));
    } finally {
      this.revoking.set(false);
    }
  }

  private async create(): Promise<TreeValidationResult> {
    this.createError.set(null);
    try {
      const created = await this.apiKeys.create(this.draft().name.trim());
      this.list.update((list) => [withoutKey(created), ...(list ?? [])]);
      this.created.set(created);
    } catch (error) {
      this.createError.set(apiErrorMessage(error, 'Could not create the key. Try again.'));
    }
    return undefined;
  }
}
