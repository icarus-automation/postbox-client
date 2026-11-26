import { HttpErrorResponse } from '@angular/common/http';
import { blankPost, draftProblem, followingSlug, headingAnchorRefusals, saveBody, slugFromTitle } from './post.document';

describe('post slugs', () => {
  it('makes the slug the API makes from a title', () => {
    expect(slugFromTitle('  Café opening: Part 2! ')).toBe('cafe-opening-part-2');
    expect(slugFromTitle('!!!')).toBe('post');
  });

  it('keeps a numbered slug while the title still makes its base', () => {
    expect(followingSlug('Summer menu', 'summer-menu-2')).toBe('summer-menu-2');
    expect(followingSlug('Summer menu', 'summer-menu')).toBe('summer-menu');
    expect(followingSlug('Winter menu', 'summer-menu-2')).toBe('winter-menu');
    expect(followingSlug('Summer menu', 'summer-menu-extra')).toBe('summer-menu');
  });
});

describe('saveBody', () => {
  it('sends null while the slug follows the title', () => {
    const body = saveBody({ ...blankPost(), title: ' Spring ', slug: 'spring' });

    expect(body).toMatchObject({ title: 'Spring', slug: null, categoryId: null, tagIds: [] });
  });

  it('sends a slug the person typed, tidied the way the API keeps it', () => {
    const body = saveBody({
      ...blankPost(),
      title: 'Spring',
      slug: 'Our Jobs Page',
      hasCustomSlug: true,
      category: { id: 'c1', name: 'News', slug: 'news' },
      tags: [{ id: 't1', name: 'Hiring', slug: 'hiring' }],
    });

    expect(body).toMatchObject({ slug: 'our-jobs-page', categoryId: 'c1', tagIds: ['t1'] });
  });

  it('omits a blank heading anchor and sends a trimmed one', () => {
    const heading = { id: 'h1', kind: 'heading' as const, level: 2 as const, text: ' Hours ' };
    const post = { ...blankPost(), title: 'Spring' };

    expect(saveBody({ ...post, blocks: [heading] }).blocks[0]).toEqual({
      id: 'h1',
      kind: 'heading',
      level: 2,
      text: 'Hours',
    });
    expect(saveBody({ ...post, blocks: [{ ...heading, anchor: '   ' }] }).blocks[0]).toEqual({
      id: 'h1',
      kind: 'heading',
      level: 2,
      text: 'Hours',
    });
    expect(saveBody({ ...post, blocks: [{ ...heading, anchor: ' summer-hours ' }] }).blocks[0]).toEqual({
      id: 'h1',
      kind: 'heading',
      level: 2,
      text: 'Hours',
      anchor: 'summer-hours',
    });
    expect(saveBody({ ...post, blocks: [{ ...heading, anchor: ' Bad Anchor ' }] }).blocks[0]).toMatchObject({
      anchor: 'Bad Anchor',
    });
  });
});

describe('draftProblem', () => {
  it('asks for a title first', () => {
    expect(draftProblem(saveBody(blankPost()))).toBe('Add a title.');
  });

  it('refuses a typed link with nothing a web address can carry', () => {
    const body = saveBody({ ...blankPost(), title: 'Spring', slug: '???', hasCustomSlug: true });

    expect(draftProblem(body)).toBe('Give the link at least one letter or number.');
  });

  it('allows a blank heading anchor and refuses one that is not a slug', () => {
    const heading = { id: 'h1', kind: 'heading' as const, level: 2 as const, text: 'Hours' };
    const post = { ...blankPost(), title: 'Spring' };

    expect(draftProblem(saveBody({ ...post, blocks: [heading] }))).toBeNull();
    expect(draftProblem(saveBody({ ...post, blocks: [{ ...heading, anchor: '  ' }] }))).toBeNull();
    expect(draftProblem(saveBody({ ...post, blocks: [{ ...heading, anchor: 'Bad Anchor' }] }))).toBe(
      'Use lowercase letters, numbers, and single hyphens.',
    );
    expect(draftProblem(saveBody({ ...post, blocks: [{ ...heading, anchor: 'a'.repeat(201) }] }))).toBe(
      'Use 200 characters or fewer.',
    );
  });
});

describe('headingAnchorRefusals', () => {
  const heading = { id: 'h1', kind: 'heading' as const, level: 2 as const, text: 'Hours' };

  it('maps an anchor line onto that heading and ignores the title', () => {
    const error = new HttpErrorResponse({
      error: { message: ['blocks.0.anchor is already used', 'title is required'] },
      status: 400,
      statusText: 'Bad Request',
    });

    const refusals = headingAnchorRefusals(error, [heading]);

    expect(refusals.get('h1')).toBe('blocks.0.anchor is already used');
    expect(refusals.size).toBe(1);
  });

  it('reads a bracket index, attaches an index-free line to the only heading, and drops it when several headings match', () => {
    const blocks = [heading, { id: 'rule', kind: 'divider' as const }];
    const bracket = new HttpErrorResponse({
      error: { message: 'blocks[0].anchor is already used' },
      status: 400,
      statusText: 'Bad Request',
    });
    expect(headingAnchorRefusals(bracket, blocks).get('h1')).toBe('blocks[0].anchor is already used');

    const lone = new HttpErrorResponse({
      error: { message: 'anchor is already used' },
      status: 400,
      statusText: 'Bad Request',
    });
    expect(headingAnchorRefusals(lone, blocks).get('h1')).toBe('anchor is already used');
    expect(
      headingAnchorRefusals(lone, [heading, { ...heading, id: 'h2', text: 'Place' }]).size,
    ).toBe(0);
    expect(headingAnchorRefusals(new Error('blocks.0.anchor is already used'), blocks).size).toBe(0);
  });
});
