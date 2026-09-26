import { blankPost, draftProblem, followingSlug, saveBody, slugFromTitle } from './post.document';

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
});

describe('draftProblem', () => {
  it('asks for a title first', () => {
    expect(draftProblem(saveBody(blankPost()))).toBe('Add a title.');
  });

  it('refuses a typed link with nothing a web address can carry', () => {
    const body = saveBody({ ...blankPost(), title: 'Spring', slug: '???', hasCustomSlug: true });

    expect(draftProblem(body)).toBe('Give the link at least one letter or number.');
  });
});
