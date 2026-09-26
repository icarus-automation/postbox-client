import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { apiErrorMessage } from '@core/api/api-error';
import { BlogTerms } from '@core/blog-terms/blog-terms';
import type { TermRef } from '@core/blog-terms/blog-terms.types';
import { withTerm } from '@core/blog-terms/term-list';
import { HlmComboboxImports } from '@ui/combobox';
import { HlmLabel } from '@ui/label';
import { isNewTerm, newTerm, newTermName, sameTerm, termName, termRef } from './term-choice';

let nextId = 0;

/**
 * The post's one category. Typing finds one, and a name nobody has used yet is offered as a
 * new category, saved the moment it is picked.
 */
@Component({
  selector: 'app-category-picker',
  imports: [HlmComboboxImports, HlmLabel],
  templateUrl: './category-picker.html',
  host: { class: 'grid gap-1.5' },
})
export class CategoryPicker {
  readonly category = input<TermRef | null>(null);
  readonly categoryChange = output<TermRef | null>();

  private readonly terms = inject(BlogTerms);

  protected readonly inputId = `post-category-${nextId++}`;
  protected readonly categories = this.terms.all(() => 'category');
  protected readonly options = computed(() =>
    this.categories.hasValue() ? this.categories.value() : [],
  );
  protected readonly value = linkedSignal<TermRef | null>(() => this.category());
  protected readonly search = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly adding = computed(() => {
    const value = this.value();
    return !!value && isNewTerm(value);
  });
  protected readonly creator = computed(() => {
    const name = newTermName(this.search(), this.options());
    return name ? newTerm(name) : null;
  });
  protected readonly termName = termName;
  protected readonly sameTerm = sameTerm;

  protected pick(picked: TermRef | null | undefined): void {
    this.value.set(picked ?? null);
    this.error.set(null);
    if (picked && isNewTerm(picked)) {
      void this.add(picked);
      return;
    }
    this.categoryChange.emit(picked ? termRef(picked) : null);
  }

  private async add(term: TermRef): Promise<void> {
    try {
      const created = await this.terms.create('category', term.name);
      this.categories.update((list) => withTerm(list ?? [], created));
      // A later pick wins over a category that was still being saved.
      if (this.value() === term) {
        this.categoryChange.emit(termRef(created));
      }
    } catch (error) {
      if (this.value() === term) {
        this.value.set(this.category());
      }
      this.error.set(apiErrorMessage(error, `Could not add ${term.name}. Try again.`));
    }
  }
}
