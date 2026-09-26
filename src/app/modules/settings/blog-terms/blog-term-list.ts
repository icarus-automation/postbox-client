import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal, viewChild } from '@angular/core';
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
import { Auth } from '@core/auth/auth';
import { editorRole } from '@core/auth/auth.types';
import { BlogTerms } from '@core/blog-terms/blog-terms';
import type { Term, TermKind } from '@core/blog-terms/blog-terms.types';
import { slugify } from '@core/blog-terms/slug';
import { withTerm } from '@core/blog-terms/term-list';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmButton } from '@ui/button';
import { HlmDialog, HlmDialogImports } from '@ui/dialog';
import { HlmFieldImports } from '@ui/field';
import { HlmInput } from '@ui/input';
import { HlmSkeleton } from '@ui/skeleton';
import { HlmSpinner } from '@ui/spinner';
import { HlmTableImports } from '@ui/table';

/** The API refuses longer names. */
const NAME_MAX_LENGTH = 80;

interface KindCopy {
  title: string;
  noun: string;
  plural: string;
  intro: string;
  /** What deleting one does to the posts that use it. */
  afterDelete: (postCount: number) => string;
}

const COPY: Record<TermKind, KindCopy> = {
  category: {
    title: 'Categories',
    noun: 'category',
    plural: 'categories',
    intro:
      'Topics that group your posts. A post has one category at most, and your site can list the posts in each.',
    afterDelete: (postCount) =>
      postCount === 0
        ? 'No posts use it.'
        : `${countOf(postCount)} in it ${postCount === 1 ? 'stays' : 'stay'} on your blog, without a category.`,
  },
  tag: {
    title: 'Tags',
    noun: 'tag',
    plural: 'tags',
    intro:
      'Keywords that label your posts. A post can have as many tags as it needs, and your site can list the posts with each.',
    afterDelete: (postCount) =>
      postCount === 0
        ? 'No posts use it.'
        : `${countOf(postCount)} with it ${postCount === 1 ? 'stays' : 'stay'} on your blog, without this tag.`,
  },
};

/**
 * The organization's categories or tags, whichever the route names. Anyone can see how many
 * posts use each. Owners and admins add, rename and delete them. Deleting one never deletes
 * a post.
 */
@Component({
  selector: 'app-blog-term-list',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    NgIcon,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmButton,
    HlmDialogImports,
    HlmFieldImports,
    HlmInput,
    HlmSkeleton,
    HlmSpinner,
    HlmTableImports,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucidePlus })],
  templateUrl: './blog-term-list.html',
  host: { class: 'page-standard' },
})
export class BlogTermList {
  /** From the route's data. */
  readonly kind = input.required<TermKind>();

  private readonly terms = inject(BlogTerms);
  private readonly auth = inject(Auth);

  private readonly nameDialog = viewChild.required<HlmDialog>('nameDialog');
  private readonly deleteDialog = viewChild.required<HlmDialog>('deleteDialog');

  protected readonly copy = computed(() => COPY[this.kind()]);
  protected readonly list = this.terms.all(this.kind);

  protected readonly rows = computed(() => {
    const kind = this.kind();
    if (!this.list.hasValue()) {
      return [];
    }
    return this.list.value().map((term) => ({
      term,
      // The post list reads the same filter from its query string.
      postsQuery: kind === 'category' ? { category: term.slug } : { tag: term.slug },
      posts: countOf(term.postCount),
    }));
  });

  protected readonly canManage = computed(() => {
    const workspace = this.auth.workspace();
    return !!workspace && !!editorRole(workspace.role);
  });

  protected readonly errorMessage = computed(() => {
    const error = this.list.error();
    return error ? apiErrorMessage(error, `Could not load ${this.copy().plural}.`) : null;
  });

  protected readonly skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  /** The one the open dialog is about. Null while the name dialog adds a new one. */
  protected readonly target = signal<Term | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly nameError = signal<string | null>(null);

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
      validate(path.name, ({ value }) =>
        value().trim() !== '' && !slugify(value())
          ? { kind: 'slug', message: 'Use at least one letter or number.' }
          : undefined,
      );
    },
    { submission: { action: () => this.saveName() } },
  );

  /** The link part the name makes, shown as the person types. */
  protected readonly nameSlug = computed(() => slugify(this.nameForm.name().value()));

  protected startAdd(): void {
    this.openNameDialog(null);
  }

  protected startRename(term: Term): void {
    this.openNameDialog(term);
  }

  protected startDelete(term: Term): void {
    this.target.set(term);
    this.deleteError.set(null);
    this.deleteDialog().open();
  }

  protected async confirmDelete(): Promise<void> {
    const target = this.target();
    if (!target || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.terms.delete(this.kind(), target.id);
      this.list.update((list) => (list ?? []).filter((term) => term.id !== target.id));
      this.deleteDialog().close();
      toast.success(`Deleted ${target.name}`);
    } catch (error) {
      this.deleteError.set(apiErrorMessage(error, 'Could not delete it. Try again.'));
    } finally {
      this.deleting.set(false);
    }
  }

  private openNameDialog(term: Term | null): void {
    this.target.set(term);
    this.nameError.set(null);
    this.nameForm().reset({ name: term?.name ?? '' });
    this.nameDialog().open();
  }

  private async saveName(): Promise<TreeValidationResult> {
    const target = this.target();
    const name = this.draft().name.trim().replace(/\s+/g, ' ');
    this.nameError.set(null);
    try {
      const saved = target
        ? await this.terms.rename(this.kind(), target.id, name)
        : await this.terms.create(this.kind(), name);
      this.list.update((list) => withTerm(list ?? [], saved));
      this.nameDialog().close();
      toast.success(target ? `Renamed to ${saved.name}` : `Added ${saved.name}`);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        return [
          {
            fieldTree: this.nameForm.name,
            kind: 'taken',
            message: apiErrorMessage(error, 'Another one already has this name.'),
          },
        ];
      }
      this.nameError.set(apiErrorMessage(error, 'Could not save it. Try again.'));
    }
    return undefined;
  }
}

function countOf(postCount: number): string {
  return `${postCount} ${postCount === 1 ? 'post' : 'posts'}`;
}
