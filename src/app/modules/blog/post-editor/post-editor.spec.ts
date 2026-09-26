import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CATEGORIES, TAGS } from '@core/blog-terms/blog-terms.testing';
import { environment } from '@env/environment';
import { routes } from '../blog.routes';
import type { EditorPost } from '../blog.types';
import { PostEditor } from './post-editor';

const POSTS_URL = `${environment.apiBaseUrl}/blog/posts`;
const CATEGORIES_URL = `${environment.apiBaseUrl}/blog/categories`;
const TAGS_URL = `${environment.apiBaseUrl}/blog/tags`;

const POST: EditorPost = {
  id: 'post-1',
  title: 'Summer menu',
  slug: 'summer-menu',
  hasCustomSlug: false,
  excerpt: '',
  metaTitle: '',
  metaDescription: '',
  ogImage: null,
  coverImage: null,
  category: null,
  tags: [],
  status: 'draft',
  publishedAt: null,
  blocks: [
    {
      id: 'section-1',
      kind: 'media_text',
      side: 'image_left',
      image: { media: null },
      heading: 'Hours',
      doc: { type: 'doc', content: [{ type: 'paragraph' }] },
      html: '<p></p>',
    },
  ],
  updatedAt: '2026-09-24T08:00:00.000Z',
};

@Component({ selector: 'app-list-stub', template: '' })
class ListStub {}

// The editor's own route, loaded up front so a spec does not wait on a lazy chunk.
const editorRoute = routes.find((route) => route.path === ':id')!;

const PUBLISHED: EditorPost = {
  ...POST,
  status: 'published',
  publishedAt: '2026-09-24T09:00:00.000Z',
};

describe('PostEditor', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let el: HTMLElement;

  const button = (label: string) =>
    [...el.querySelectorAll('button')].find((node) => node.textContent?.trim() === label);
  const titleBox = () => el.querySelector<HTMLInputElement>('#post-title')!;
  const slugBox = () => el.querySelector<HTMLInputElement>('#post-slug')!;

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  /** Every editor reads the category and tag lists for its pickers. */
  async function answerTerms(): Promise<void> {
    (await vi.waitFor(() => http.expectOne(CATEGORIES_URL))).flush(CATEGORIES);
    (await vi.waitFor(() => http.expectOne(TAGS_URL))).flush(TAGS);
  }

  async function open(post: EditorPost): Promise<void> {
    const navigation = harness.navigateByUrl(`/blog/${post.id}`);
    const read = await vi.waitFor(() => http.expectOne(`${POSTS_URL}/${post.id}`));
    read.flush(post);
    await navigation;
    await answerTerms();
    await harness.fixture.whenStable();
    el = harness.fixture.nativeElement as HTMLElement;
  }

  async function openNew(): Promise<void> {
    const navigation = harness.navigateByUrl('/blog/new');
    await answerTerms();
    await navigation;
    await harness.fixture.whenStable();
    el = harness.fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'blog', component: ListStub },
            { path: 'blog/:id', component: PostEditor, canDeactivate: editorRoute.canDeactivate },
          ],
          withComponentInputBinding(),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  it('uses the standard page width', async () => {
    await openNew();

    expect(el.querySelector('app-post-editor')?.classList).toContain('page-standard');
  });

  it('says the post is missing', async () => {
    const navigation = harness.navigateByUrl('/blog/post-9');
    const read = await vi.waitFor(() => http.expectOne(`${POSTS_URL}/post-9`));
    read.flush({ statusCode: 404, message: 'Post not found' }, { status: 404, statusText: 'Not Found' });
    await navigation;
    await harness.fixture.whenStable();
    el = harness.fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Post not found');
    expect(el.querySelector('#post-title')).toBeNull();
  });

  describe('link', () => {
    it('fills the link from the title of a new draft', async () => {
      await openNew();

      expect(slugBox().value).toBe('');
      type(titleBox(), 'Café opening, part 2!');
      await harness.fixture.whenStable();

      expect(slugBox().value).toBe('cafe-opening-part-2');
      expect(el.textContent).toContain('Made from the title as you type.');
    });

    it('leaves a link the person typed alone when the title changes', async () => {
      await openNew();
      type(titleBox(), 'Spring openings');
      await harness.fixture.whenStable();

      type(slugBox(), 'jobs');
      await harness.fixture.whenStable();
      type(titleBox(), 'Summer openings');
      await harness.fixture.whenStable();

      expect(slugBox().value).toBe('jobs');
      expect(el.textContent).toContain('You set this link');
    });

    it('hands the link back to the title when the person clears it', async () => {
      await openNew();
      type(titleBox(), 'Spring openings');
      type(slugBox(), 'jobs');
      await harness.fixture.whenStable();

      type(slugBox(), '');
      await harness.fixture.whenStable();

      expect(slugBox().value).toBe('spring-openings');
    });

    it('saves a new draft, shows the numbered link a duplicate title gets, and moves to its own address', async () => {
      await openNew();
      type(titleBox(), 'Summer menu');
      await harness.fixture.whenStable();

      button('Save draft')!.click();
      const create = http.expectOne({ method: 'POST', url: POSTS_URL });
      expect(create.request.body).toMatchObject({
        title: 'Summer menu',
        slug: null,
        categoryId: null,
        tagIds: [],
      });
      create.flush({ ...POST, id: 'post-2', slug: 'summer-menu-2' });

      const reread = await vi.waitFor(() => http.expectOne(`${POSTS_URL}/post-2`));
      reread.flush({ ...POST, id: 'post-2', slug: 'summer-menu-2' });
      await harness.fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe('/blog/post-2');
      expect(slugBox().value).toBe('summer-menu-2');
      expect(el.querySelector('[role="status"]')?.textContent).toContain(
        'Another post already uses summer-menu, so this one is summer-menu-2.',
      );
    });

    it('keeps following the numbered link while the title makes the same one', async () => {
      await open({ ...POST, slug: 'summer-menu-2' });

      type(titleBox(), 'Summer  menu');
      await harness.fixture.whenStable();

      expect(slugBox().value).toBe('summer-menu-2');
    });

    it('warns that old links break when the link of a published post changes', async () => {
      await open(PUBLISHED);

      type(titleBox(), 'Summer menu for 2027');
      await harness.fixture.whenStable();
      expect(slugBox().value).toBe('summer-menu');
      expect(el.textContent).not.toContain('Old links will break');

      type(slugBox(), 'summer-menu-2027');
      await harness.fixture.whenStable();

      const warning = [...el.querySelectorAll('[role="alert"]')].find((node) =>
        node.textContent?.includes('Old links will break'),
      );
      expect(warning?.textContent).toContain('This post is live at /summer-menu.');

      button('Update')!.click();
      const save = http.expectOne({ method: 'PUT', url: `${POSTS_URL}/post-1` });
      expect(save.request.body).toMatchObject({ slug: 'summer-menu-2027' });
      save.flush({ ...PUBLISHED, slug: 'summer-menu-2027', hasCustomSlug: true });
      await harness.fixture.whenStable();

      expect(el.textContent).not.toContain('Old links will break');
    });
  });

  it('moves an image to the right and saves that side without a status', async () => {
    await open(POST);

    const right = button('Right')!;
    expect(right.getAttribute('aria-pressed')).toBe('false');
    right.click();
    await harness.fixture.whenStable();
    expect(right.getAttribute('aria-pressed')).toBe('true');

    button('Save draft')!.click();
    const save = http.expectOne({ method: 'PUT', url: `${POSTS_URL}/post-1` });
    expect(save.request.body).not.toHaveProperty('status');
    expect(save.request.body.blocks).toEqual([
      expect.objectContaining({ id: 'section-1', kind: 'media_text', side: 'image_right', heading: 'Hours' }),
    ]);
    save.flush({ ...POST, blocks: [{ ...POST.blocks[0], side: 'image_right' }] });
    await harness.fixture.whenStable();
  });

  it('publishes after saving what is on screen', async () => {
    await open(POST);
    type(titleBox(), 'Summer menu');

    button('Publish')!.click();
    http.expectOne({ method: 'PUT', url: `${POSTS_URL}/post-1` }).flush(POST);
    const publish = await vi.waitFor(() =>
      http.expectOne({ method: 'POST', url: `${POSTS_URL}/post-1/publish` }),
    );
    publish.flush(PUBLISHED);

    await vi.waitFor(() => expect(button('Update')).toBeTruthy());
    expect(el.querySelector('[data-slot="badge"]')?.textContent?.trim()).toBe('Published');
  });

  it('asks before leaving with unsaved changes, and stays when told to', async () => {
    await open(POST);
    type(titleBox(), 'Summer menu, revised');
    await harness.fixture.whenStable();
    expect(el.textContent).toContain('Unsaved changes');

    const leaving = TestBed.inject(Router).navigateByUrl('/blog');
    const stay = await vi.waitFor(() => {
      const found = [...document.querySelectorAll('button')].find(
        (node) => node.textContent?.trim() === 'Keep editing',
      );
      expect(found).toBeTruthy();
      return found!;
    });
    stay.click();

    await expect(leaving).resolves.toBe(false);
    expect(TestBed.inject(Router).url).toBe('/blog/post-1');
  });

  it('leaves without asking when everything is saved', async () => {
    await open(POST);

    await expect(TestBed.inject(Router).navigateByUrl('/blog')).resolves.toBe(true);
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull();
  });
});
