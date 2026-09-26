import type { Type } from '@angular/core';
import type { BlockKind } from '../blog.types';
import { DividerBlock } from './divider-block';
import { HeadingBlock } from './heading-block';
import { ImageBlock } from './image-block';
import { MediaTextBlock } from './media-text-block';
import { RichTextBlock } from './rich-text-block';

export interface BlockEditorEntry {
  label: string;
  editor: Type<unknown>;
}

/** Kind to the component that edits and previews it. The page only looks this up. */
export const BLOCK_EDITORS: Record<BlockKind, BlockEditorEntry> = {
  rich_text: { label: 'Text', editor: RichTextBlock },
  heading: { label: 'Heading', editor: HeadingBlock },
  image: { label: 'Image', editor: ImageBlock },
  media_text: { label: 'Image and text', editor: MediaTextBlock },
  divider: { label: 'Divider', editor: DividerBlock },
};

export const BLOCK_MENU: readonly BlockKind[] = ['rich_text', 'heading', 'image', 'media_text', 'divider'];
