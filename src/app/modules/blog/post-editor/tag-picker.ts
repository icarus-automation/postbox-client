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
 * The post's tags, as chips. Typing finds a tag, and a name nobody has used yet is offered as
 * a new tag, saved the moment it is picked. The post hears about its tags once every new one
 * is saved, so it never holds a tag without an id.
 */
@Component({
  selector: 'app-tag-picker',
  imports: [HlmComboboxImports, HlmLabel],
  templateUrl: './tag-picker.html',
  host: { class: 'grid gap-1.5' },
})
export class TagPicker {
  readonly tags = input<TermRef[]>([]);
  readonly tagsChange = output<TermRef[]>();

  private readonly terms = inject(BlogTerms);
  private readonly saving = new Set<TermRef>();

  protected readonly inputId = `post-tags-${nextId++}`;
  protected readonly tagList = this.terms.all(() => 'tag');
  protected readonly options = computed(() => (this.tagList.hasValue() ? this.tagList.value() : []));
  protected readonly value = linkedSignal<TermRef[]>(() => this.tags());
  protected readonly search = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly adding = computed(() => this.value().some(isNewTerm));
  protected readonly creator = computed(() => {
    const name = newTermName(this.search(), this.options());
    return name ? newTerm(name) : null;
  });
  protected readonly termName = termName;
  protected readonly sameTerm = sameTerm;

  protected pick(picked: TermRef[] | null | undefined): void {
    this.value.set(picked ?? []);
    this.error.set(null);
    for (const term of this.value()) {
      if (isNewTerm(term) && !this.saving.has(term)) {
        void this.add(term);
      }
    }
    this.announce();
  }

  private async add(term: TermRef): Promise<void> {
    this.saving.add(term);
    try {
      const created = await this.terms.create('tag', term.name);
      this.tagList.update((list) => withTerm(list ?? [], created));
      this.value.update((tags) => {
        const next = tags.map((tag) => (tag === term ? termRef(created) : tag));
        return next.filter((tag, index) => next.findIndex((other) => sameTerm(other, tag)) === index);
      });
    } catch (error) {
      this.value.update((tags) => tags.filter((tag) => tag !== term));
      this.error.set(apiErrorMessage(error, `Could not add ${term.name}. Try again.`));
    } finally {
      this.saving.delete(term);
    }
    this.announce();
  }

  private announce(): void {
    if (!this.adding()) {
      this.tagsChange.emit(this.value().map(termRef));
    }
  }
}
