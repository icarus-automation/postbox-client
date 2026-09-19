import { Directive } from '@angular/core';
import { HlmLabel } from '@ui/label';
import { classes } from '@ui/utils';

@Directive({
	selector: '[hlmFieldLabel],hlm-field-label',
	hostDirectives: [HlmLabel],
	host: { 'data-slot': 'field-label' },
})
export class HlmFieldLabel {
	constructor() {
		// Edited: the invalid cue upstream puts on the whole field belongs on the label alone,
		// in the ink token, so it does not tint the value the person typed.
		classes(() => [
			'group-data-[matches-spartan-invalid=true]/field:text-destructive-ink',
			'has-data-checked:bg-primary/5 has-data-checked:border-primary/30 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10 gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border *:data-[slot=field]:p-3 group/field-label peer/field-label flex w-fit',
			'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
		]);
	}
}
