import { DatePipe, NgComponentOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideEye, lucidePencil, lucideTriangleAlert } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { apiErrorMessage, isNotFound } from '@core/api/api-error';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmBadge } from '@ui/badge';
import { HlmButton } from '@ui/button';
import { HlmDialog, HlmDialogImports } from '@ui/dialog';
import { HlmFieldImports } from '@ui/field';
import { HlmInput } from '@ui/input';
import { HlmSkeleton } from '@ui/skeleton';
import { HlmSpinner } from '@ui/spinner';
import { HlmTextarea } from '@ui/textarea';
import { BLOCK_EDITORS, BLOCK_MENU } from '../blocks/block-editors';
import { ImageSlot } from '../blocks/image-slot';
import {
  NEW_POST_ID,
  statusLabel,
  type BlockKind,
  type EditorPost,
  type MediaRef,
  type SavePostBody,
} from '../blog.types';
import { draftProblem, saveBody } from '../post.document';
import { Posts } from '../services/posts';
import { CategoryPicker } from './category-picker';
import { PostDraft } from './post-draft';
import { TagPicker } from './tag-picker';

@Component({
  selector: 'app-post-editor',
  imports: [
    DatePipe,
    NgComponentOutlet,
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
    HlmTextarea,
    CategoryPicker,
    ImageSlot,
    TagPicker,
  ],
  providers: [
    PostDraft,
    provideIcons({ lucideArrowLeft, lucideEye, lucidePencil, lucideTriangleAlert }),
  ],
  templateUrl: './post-editor.html',
  host: {
    class: 'page-standard',
    '(keydown)': 'shortcut($event)',
    '(window:beforeunload)': 'holdUnload($event)',
  },
})
export class PostEditor {
  /** The `:id` route param, bound by `withComponentInputBinding()`. `new` until the first save. */
  readonly id = input.required<string>();

  private readonly posts = inject(Posts);
  private readonly router = inject(Router);
  protected readonly draft = inject(PostDraft);

  protected readonly editors = BLOCK_EDITORS;
  protected readonly blockMenu = BLOCK_MENU;
  protected readonly statusLabel = statusLabel;

  protected readonly isNew = computed(() => this.id() === NEW_POST_ID);
  protected readonly stored = this.posts.byId(computed(() => (this.isNew() ? '' : this.id())));
  protected readonly previewing = signal(false);
  protected readonly saving = signal(false);
  protected readonly publishing = signal(false);
  protected readonly saveError = signal<string | null>(null);
  /** Said when the API gave the post another link than the one on screen, because it was taken. */
  protected readonly slugNote = signal<string | null>(null);

  private readonly leaveDialog = viewChild<HlmDialog>('leaveDialog');
  private readonly titleBox = viewChild<ElementRef<HTMLInputElement>>('titleBox');
  private answerLeave: ((leave: boolean) => void) | null = null;
  /** Set while the first save moves from `new` to the post's own address. */
  private movingToSaved = false;

  protected readonly notFound = computed(() => isNotFound(this.stored.error()));

  protected readonly errorMessage = computed(() => {
    const error = this.stored.error();
    return error && !isNotFound(error) ? apiErrorMessage(error, 'Could not load this post.') : null;
  });

  protected readonly isLoading = computed(() => this.stored.isLoading() && !this.draft.post());

  private readonly loaded = computed(() => (this.stored.hasValue() ? this.stored.value() : null));

  protected readonly post = this.draft.post;

  protected readonly busy = computed(() => this.saving() || this.publishing());

  protected readonly canvas = computed(() => {
    const preview = this.previewing();
    return this.draft.blocks().map((block, index, all) => ({
      id: block.id,
      kind: block.kind,
      label: BLOCK_EDITORS[block.kind].label,
      first: index === 0,
      last: index === all.length - 1,
      inputs: { blockId: block.id, preview },
    }));
  });

  protected readonly slugHelp = computed(() => {
    const post = this.post();
    if (!post || post.status === 'published') {
      return 'The end of the web address for this post.';
    }
    return post.hasCustomSlug
      ? 'You set this link, so changing the title leaves it alone. Clear it to make it from the title again.'
      : 'Made from the title as you type. Type your own to keep it fixed.';
  });

  constructor() {
    effect(() => {
      if (this.isNew()) {
        untracked(() => this.draft.start());
        return;
      }
      const post = this.loaded();
      if (post) {
        untracked(() => this.draft.load(post));
      }
    });

    // A new post starts at its title.
    afterNextRender(() => {
      if (this.isNew()) {
        this.titleBox()?.nativeElement.focus();
      }
    });
  }

  /** The route guard waits on this. Unsaved changes ask first. */
  canLeave(): boolean | Promise<boolean> {
    const dialog = this.leaveDialog();
    if (this.movingToSaved || !this.draft.dirty() || !dialog) {
      return true;
    }
    return new Promise<boolean>((resolve) => {
      this.answerLeave = resolve;
      dialog.open();
    });
  }

  protected leaveAnswered(answer: unknown): void {
    this.answerLeave?.(answer === 'leave');
    this.answerLeave = null;
  }

  /** Closing the tab or reloading with unsaved changes gets the browser's own question. */
  protected holdUnload(event: BeforeUnloadEvent): void {
    if (this.draft.dirty()) {
      event.preventDefault();
    }
  }

  protected shortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void this.save();
    }
  }

  protected titleInput(event: Event): void {
    this.slugNote.set(null);
    this.draft.setTitle((event.target as HTMLInputElement).value);
  }

  protected slugInput(event: Event): void {
    this.slugNote.set(null);
    this.draft.setSlug((event.target as HTMLInputElement).value);
  }

  protected slugBlur(event: Event): void {
    this.draft.tidySlug();
    // Clearing a link that already followed the title leaves the draft as it was, so the
    // binding never repaints the empty box. Put the link back once the person moves on.
    const box = event.target as HTMLInputElement;
    const slug = this.post()?.slug ?? '';
    if (box.value !== slug) {
      box.value = slug;
    }
  }

  protected excerptInput(event: Event): void {
    this.draft.setExcerpt((event.target as HTMLTextAreaElement).value);
  }

  protected metaTitleInput(event: Event): void {
    this.draft.setMetaTitle((event.target as HTMLInputElement).value);
  }

  protected metaDescriptionInput(event: Event): void {
    this.draft.setMetaDescription((event.target as HTMLTextAreaElement).value);
  }

  protected setCover(media: MediaRef | null): void {
    this.draft.setCoverImage(media);
  }

  protected setSocial(media: MediaRef | null): void {
    this.draft.setOgImage(media);
  }

  protected add(kind: BlockKind): void {
    if (this.draft.blocks().length >= 100) {
      this.saveError.set('A post can have at most 100 sections.');
      return;
    }
    this.saveError.set(null);
    this.draft.add(kind);
  }

  protected move(id: string, direction: -1 | 1): void {
    this.draft.move(id, direction);
  }

  protected remove(id: string): void {
    this.draft.remove(id);
  }

  protected togglePreview(): void {
    this.previewing.update((value) => !value);
  }

  protected async save(): Promise<void> {
    const saved = await this.persist();
    if (saved) {
      toast.success(saved.status === 'published' ? 'Post updated' : 'Draft saved');
    }
  }

  protected async publish(): Promise<void> {
    if (this.publishing()) {
      return;
    }
    // Publish sends the saved post, so save first or the live post would miss this writing.
    const saved = await this.persist();
    if (!saved) {
      return;
    }
    this.publishing.set(true);
    try {
      this.draft.settleStatus(await this.posts.publish(saved.id));
      toast.success('Published');
    } catch (error) {
      this.saveError.set(apiErrorMessage(error, 'Could not publish. Try again.'));
    } finally {
      this.publishing.set(false);
    }
  }

  /** Takes the post off the site and leaves any unsaved writing on screen. */
  protected async unpublish(): Promise<void> {
    const post = this.post();
    if (!post || this.busy()) {
      return;
    }
    this.publishing.set(true);
    this.saveError.set(null);
    try {
      this.draft.settleStatus(await this.posts.unpublish(post.id));
      toast.success('Unpublished');
    } catch (error) {
      this.saveError.set(apiErrorMessage(error, 'Could not unpublish. Try again.'));
    } finally {
      this.publishing.set(false);
    }
  }

  protected reload(): void {
    this.stored.reload();
  }

  private async persist(): Promise<EditorPost | null> {
    const post = this.post();
    if (!post || this.saving()) {
      return null;
    }
    const body = saveBody(post);
    const problem = draftProblem(body);
    if (problem) {
      this.saveError.set(problem);
      return null;
    }
    const isNew = this.isNew();
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const saved = isNew ? await this.posts.create(body) : await this.posts.save(post.id, body);
      this.slugNote.set(takenSlugNote(post, body, saved));
      this.draft.settle(body, saved);
      if (isNew) {
        await this.moveToSaved(saved.id);
      }
      return saved;
    } catch (error) {
      this.saveError.set(apiErrorMessage(error, 'Could not save. Try again.'));
      return null;
    } finally {
      this.saving.set(false);
    }
  }

  /** The address of a new post becomes its own once it is saved, without a history entry. */
  private async moveToSaved(id: string): Promise<void> {
    this.movingToSaved = true;
    try {
      await this.router.navigate(['/blog', id], { replaceUrl: true, queryParamsHandling: 'preserve' });
    } finally {
      this.movingToSaved = false;
    }
  }
}

/** Why the saved link is not the one on screen: another post had it, so the API numbered it. */
function takenSlugNote(post: EditorPost, body: SavePostBody, saved: EditorPost): string | null {
  const shown = body.slug ?? post.slug;
  if (!shown || shown === saved.slug) {
    return null;
  }
  return `Another post already uses ${shown}, so this one is ${saved.slug}.`;
}
