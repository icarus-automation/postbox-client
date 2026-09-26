import { EMPTY_DOC, type Block, type BlockKind } from '../blog.types';

/** A section with nothing in it yet. The id is kept when the page is saved. */
export function blankBlock(kind: BlockKind): Block {
  const id = crypto.randomUUID();
  switch (kind) {
    case 'rich_text':
      return { id, kind, doc: EMPTY_DOC, html: '' };
    case 'image':
      return { id, kind, image: { media: null } };
    case 'media_text':
      return { id, kind, side: 'image_left', image: { media: null }, heading: null, doc: EMPTY_DOC, html: '' };
    case 'heading':
      return { id, kind, level: 2, text: '' };
    case 'divider':
      return { id, kind };
  }
}
