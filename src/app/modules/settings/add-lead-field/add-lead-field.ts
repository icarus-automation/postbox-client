import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import {
  FormField,
  FormRoot,
  type TreeValidationResult,
  form,
  maxLengthError,
  pattern,
  required,
  requiredError,
  validate,
} from '@angular/forms/signals';
import { apiErrorMessage } from '@core/api/api-error';
import { LeadFields } from '@core/lead-fields/lead-fields';
import {
  CUSTOM_FIELD_TYPES,
  type CustomFieldType,
  type LeadField,
  type NewLeadField,
} from '@core/lead-fields/lead-fields.types';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmButton } from '@ui/button';
import { HlmCheckbox } from '@ui/checkbox';
import { HlmDialogFooter, HlmDialogHeader } from '@ui/dialog';
import { HlmField, HlmFieldDescription, HlmFieldError, HlmFieldLabel } from '@ui/field';
import { HlmInput } from '@ui/input';
import { HlmLabel } from '@ui/label';
import { HlmSelectImports } from '@ui/select';
import { HlmSpinner } from '@ui/spinner';
import { HlmTextarea } from '@ui/textarea';
import {
  FIELD_KEY_MAX_LENGTH,
  FIELD_KEY_PATTERN,
  FIELD_LABEL_MAX_LENGTH,
  FIELD_TYPE_LABELS,
  keyFromLabel,
  optionsProblem,
  parseOptions,
} from '../lead-field-rules';

/** What the form holds. Options arrive as one block of text, one per line. */
interface DraftField {
  label: string;
  key: string;
  type: CustomFieldType;
  options: string;
  isRequired: boolean;
}

const EMPTY: DraftField = { label: '', key: '', type: 'text', options: '', isRequired: false };

/**
 * Adds a custom field. It fills the Add field dialog, and the API puts the field after the
 * last one. The dialog names itself after this form's heading rather than the other way
 * round, so the form stands on its own outside a dialog.
 */
@Component({
  selector: 'app-add-lead-field',
  imports: [
    FormField,
    FormRoot,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmButton,
    HlmCheckbox,
    HlmDialogFooter,
    HlmDialogHeader,
    HlmField,
    HlmFieldDescription,
    HlmFieldError,
    HlmFieldLabel,
    HlmInput,
    HlmLabel,
    HlmSelectImports,
    HlmSpinner,
    HlmTextarea,
  ],
  templateUrl: './add-lead-field.html',
  host: { class: 'block' },
})
export class AddLeadField {
  /** Keys already in use, so a clash shows before the API refuses it. */
  readonly takenKeys = input<readonly string[]>([]);
  /** The field as the API saved it. */
  readonly added = output<LeadField>();
  /** Nothing was added and the dialog should go away. */
  readonly dismissed = output<void>();

  private readonly leadFields = inject(LeadFields);

  protected readonly types = CUSTOM_FIELD_TYPES.map((value) => ({ value, label: FIELD_TYPE_LABELS[value] }));

  /** What the closed Type control reads. Without it, it shows the raw key, such as long_text. */
  protected readonly typeLabel = (value: CustomFieldType): string =>
    FIELD_TYPE_LABELS[value] ?? String(value);

  protected readonly error = signal<string | null>(null);

  /** Set once the person types their own key. Clearing the key hands it back to the label. */
  private readonly keyEdited = signal(false);

  private readonly draft = signal<DraftField>({ ...EMPTY });

  protected readonly form = form(
    this.draft,
    (path) => {
      required(path.label, { message: 'Enter a label.' });
      // A label of only spaces is no label either.
      validate(path.label, ({ value }) =>
        value().trim() === '' ? requiredError({ message: 'Enter a label.' }) : undefined,
      );
      // Checked rather than capped with `maxLength`, because the native attribute it sets
      // would cut a pasted label without saying so.
      validate(path.label, ({ value }) =>
        value().length > FIELD_LABEL_MAX_LENGTH
          ? maxLengthError(FIELD_LABEL_MAX_LENGTH, {
              message: `Use ${FIELD_LABEL_MAX_LENGTH} characters or fewer.`,
            })
          : undefined,
      );

      // Declared worst-first: the field shows the first error it holds.
      required(path.key, { message: 'Enter a key.' });
      validate(path.key, ({ value }) =>
        this.takenKeys().includes(value())
          ? { kind: 'taken', message: 'Another field already uses this key.' }
          : undefined,
      );
      validate(path.key, ({ value }) =>
        value().length > FIELD_KEY_MAX_LENGTH
          ? maxLengthError(FIELD_KEY_MAX_LENGTH, {
              message: `Use ${FIELD_KEY_MAX_LENGTH} characters or fewer.`,
            })
          : undefined,
      );
      pattern(path.key, FIELD_KEY_PATTERN, {
        message: 'Start with a lowercase letter, then use only letters and digits.',
      });

      // Options apply only to select fields, so this rule reads the type as well.
      validate(path.options, ({ value, valueOf }) => {
        if (valueOf(path.type) !== 'select') {
          return undefined;
        }

        const problem = optionsProblem(parseOptions(value()));
        return problem ? { kind: 'options', message: problem } : undefined;
      });
    },
    {
      submission: {
        action: () => this.create(),
      },
    },
  );

  protected readonly isSelect = computed(() => this.form.type().value() === 'select');

  constructor() {
    // The key follows the label until the person types their own, and follows it again
    // the moment they clear it.
    effect(() => {
      const generated = keyFromLabel(this.form.label().value());
      if (this.keyEdited()) {
        return;
      }

      untracked(() => this.form.key().value.set(generated));
    });
  }

  protected keyTyped(event: Event): void {
    this.keyEdited.set((event.target as HTMLInputElement).value !== '');
  }

  private async create(): Promise<TreeValidationResult> {
    const draft = this.draft();
    const field: NewLeadField = {
      key: draft.key,
      label: draft.label.trim(),
      type: draft.type,
      isRequired: draft.isRequired,
      ...(draft.type === 'select' ? { options: parseOptions(draft.options) } : {}),
    };

    this.error.set(null);

    try {
      const saved = await this.leadFields.create(field);
      this.form().reset({ ...EMPTY });
      this.keyEdited.set(false);
      this.added.emit(saved);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        // The API got there first, so the key is the problem, not the form.
        return [
          {
            fieldTree: this.form.key,
            kind: 'taken',
            message: 'Another field already uses this key.',
          },
        ];
      }

      this.error.set(apiErrorMessage(error, 'Could not add this field. Try again.'));
    }

    return undefined;
  }
}
