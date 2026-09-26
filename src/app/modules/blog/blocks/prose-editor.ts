import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBold,
  lucideItalic,
  lucideLink,
  lucideList,
  lucideListOrdered,
  lucideQuote,
} from '@ng-icons/lucide';
import { Editor, type JSONContent } from '@tiptap/core';
import Blockquote from '@tiptap/extension-blockquote';
import Bold from '@tiptap/extension-bold';
import BulletList from '@tiptap/extension-bullet-list';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Italic from '@tiptap/extension-italic';
import Link from '@tiptap/extension-link';
import ListItem from '@tiptap/extension-list-item';
import OrderedList from '@tiptap/extension-ordered-list';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { HlmButton } from '@ui/button';
import { HlmInput } from '@ui/input';
import { HlmPopoverImports } from '@ui/popover';
import type { ProseDoc } from '../blog.types';

let nextLinkId = 0;

const EXTENSIONS = [
  Document,
  Paragraph,
  Text,
  Bold,
  Italic,
  Link.configure({
    openOnClick: false,
    autolink: false,
    protocols: ['http', 'https'],
    defaultProtocol: 'https',
  }),
  BulletList,
  OrderedList,
  ListItem,
  HardBreak,
  Blockquote,
];

interface Marks {
  bold: boolean;
  italic: boolean;
  link: boolean;
  bullet: boolean;
  ordered: boolean;
  quote: boolean;
}

@Component({
  selector: 'app-prose-editor',
  imports: [NgIcon, HlmButton, HlmInput, HlmPopoverImports],
  providers: [
    provideIcons({ lucideBold, lucideItalic, lucideLink, lucideList, lucideListOrdered, lucideQuote }),
  ],
  templateUrl: './prose-editor.html',
})
export class ProseEditor {
  /**
   * Read once, when the editor mounts. Writing each keystroke back into this input
   * would reset the caret.
   */
  readonly doc = input.required<ProseDoc>();
  readonly label = input('Text');
  readonly docChange = output<{ doc: ProseDoc; html: string }>();

  private readonly surface = viewChild.required<ElementRef<HTMLDivElement>>('surface');
  protected readonly linkId = `prose-link-${nextLinkId++}`;
  private editor: Editor | null = null;
  private linkRange: { from: number; to: number } | null = null;

  protected readonly ready = signal(false);
  protected readonly linkHref = signal('');
  protected readonly linkError = signal<string | null>(null);
  protected readonly marks = signal<Marks>({
    bold: false,
    italic: false,
    link: false,
    bullet: false,
    ordered: false,
    quote: false,
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const initial = this.doc();
      let ignore = true;
      const editor = new Editor({
        element: this.surface().nativeElement,
        extensions: EXTENSIONS,
        content: initial as JSONContent,
        editorProps: {
          attributes: {
            class: 'post-prose min-h-24 px-3 py-2 outline-none',
            role: 'textbox',
            'aria-multiline': 'true',
            'aria-label': this.label(),
          },
        },
        onUpdate: ({ editor: current }) => {
          if (ignore) {
            return;
          }
          this.docChange.emit({ doc: current.getJSON() as ProseDoc, html: current.getHTML() });
          this.sync();
        },
        onSelectionUpdate: () => this.sync(),
      });
      ignore = false;
      this.editor = editor;
      this.ready.set(true);
      this.sync();
      destroyRef.onDestroy(() => editor.destroy());
    });
  }

  protected run(action: 'bold' | 'italic' | 'bullet' | 'ordered' | 'quote'): void {
    const editor = this.editor;
    if (!editor) {
      return;
    }
    const chain = editor.chain().focus();
    if (action === 'bold') chain.toggleBold();
    else if (action === 'italic') chain.toggleItalic();
    else if (action === 'bullet') chain.toggleBulletList();
    else if (action === 'ordered') chain.toggleOrderedList();
    else chain.toggleBlockquote();
    chain.run();
  }

  protected rememberLink(): void {
    const editor = this.editor;
    if (!editor) {
      return;
    }
    const { from, to } = editor.state.selection;
    this.linkRange = { from, to };
    const current = editor.getAttributes('link')['href'];
    this.linkHref.set(typeof current === 'string' ? current : '');
    this.linkError.set(null);
  }

  protected linkInput(event: Event): void {
    this.linkHref.set((event.target as HTMLInputElement).value);
  }

  protected applyLink(): void {
    const editor = this.editor;
    const range = this.linkRange;
    if (!editor || !range) {
      return;
    }
    if (range.from === range.to) {
      this.linkError.set('Select the words you want to link.');
      return;
    }
    const href = webAddress(this.linkHref());
    if (!href) {
      this.linkError.set('Use a web address, like https://example.com.');
      return;
    }
    editor.chain().focus().setTextSelection(range).extendMarkRange('link').setLink({ href }).run();
    this.linkError.set(null);
  }

  protected removeLink(): void {
    const editor = this.editor;
    const range = this.linkRange;
    if (!editor || !range) {
      return;
    }
    editor.chain().focus().setTextSelection(range).extendMarkRange('link').unsetLink().run();
    this.linkHref.set('');
    this.linkError.set(null);
  }

  private sync(): void {
    const editor = this.editor;
    if (!editor) {
      return;
    }
    this.marks.set({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      link: editor.isActive('link'),
      bullet: editor.isActive('bulletList'),
      ordered: editor.isActive('orderedList'),
      quote: editor.isActive('blockquote'),
    });
  }
}

function webAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}
