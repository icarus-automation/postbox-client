import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { CATEGORIES, TAGS } from '@core/blog-terms/blog-terms.testing';
import { environment } from '@env/environment';
import type { PostPage } from '../blog.types';
import { PostList } from './post-list';

const POSTS_URL = `${environment.apiBaseUrl}/blog/posts`;
const CATEGORIES_URL = `${environment.apiBaseUrl}/blog/categories`;
const TAGS_URL = `${environment.apiBaseUrl}/blog/tags`;

const EMPTY_PAGE: PostPage = { data: [], meta: { total: 0, page: 1, limit: 20, lastPage: 1 } };

const PAGE: PostPage = {
  data: [
    {
      id: 'post-1',
      title: 'Spring openings',
      slug: 'spring-openings',
      excerpt: '',
      category: { id: CATEGORIES[1].id, name: 'News', slug: 'news' },
      tags: [
        { id: 't1', name: 'Hiring', slug: 'hiring' },
        { id: 't2', name: 'Launch', slug: 'launch' },
        { id: 't3', name: 'Office', slug: 'office' },
        { id: 't4', name: 'Team', slug: 'team' },
      ],
      status: 'published',
      publishedAt: '2026-09-24T08:00:00.000Z',
      updatedAt: '2026-09-24T08:00:00.000Z',
    },
    {
      id: 'post-2',
      title: 'Autumn menu',
      slug: 'autumn-menu',
      excerpt: '',
      category: null,
      tags: [],
      status: 'draft',
      publishedAt: null,
      updatedAt: '2026-09-25T08:00:00.000Z',
    },
  ],
  meta: { total: 2, page: 1, limit: 20, lastPage: 1 },
};

@Component({ selector: 'app-editor-stub', template: '' })
class EditorStub {}

describe('PostList', () => {
  let fixture: ComponentFixture<PostList>;
  let http: HttpTestingController;
  let el: HTMLElement;

  function start(params: Record<string, string> = {}): void {
    for (const [name, value] of Object.entries(params)) {
      fixture.componentRef.setInput(name, value);
    }
    TestBed.tick();
  }

  async function respond(page: PostPage = PAGE): Promise<void> {
    http.expectOne((request) => request.url === POSTS_URL).flush(page);
    http.expectOne(CATEGORIES_URL).flush(CATEGORIES);
    http.expectOne(TAGS_URL).flush(TAGS);
    await fixture.whenStable();
  }

  const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostList],
      providers: [
        provideRouter([
          { path: '', component: EditorStub },
          { path: 'blog', component: PostList },
          { path: 'blog/:id', component: EditorStub },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PostList);
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  it('reads the first page with no filter', async () => {
    start();

    const request = http.expectOne((req) => req.url === POSTS_URL).request;
    expect(request.params.get('page')).toBe('1');
    expect(request.params.get('limit')).toBe('20');
    for (const name of ['status', 'category', 'tag', 'search']) {
      expect(request.params.has(name)).toBe(false);
    }
    http.expectOne(CATEGORIES_URL).flush(CATEGORIES);
    http.expectOne(TAGS_URL).flush(TAGS);
  });

  it('passes the status, category, tag and search the query string names', () => {
    start({ status: 'draft', category: 'news', tag: 'launch', search: ' spring ', page: '2' });

    const params = http.expectOne((req) => req.url === POSTS_URL).request.params;
    expect(params.get('status')).toBe('draft');
    expect(params.get('category')).toBe('news');
    expect(params.get('tag')).toBe('launch');
    expect(params.get('search')).toBe('spring');
    expect(params.get('page')).toBe('2');
    http.expectOne(CATEGORIES_URL).flush(CATEGORIES);
    http.expectOne(TAGS_URL).flush(TAGS);
  });

  it('ignores filters the API does not offer', () => {
    start({ status: 'archived', category: 'Big News', tag: '../x' });

    const params = http.expectOne((req) => req.url === POSTS_URL).request.params;
    expect(params.has('status')).toBe(false);
    expect(params.has('category')).toBe(false);
    expect(params.has('tag')).toBe(false);
    http.expectOne(CATEGORIES_URL).flush(CATEGORIES);
    http.expectOne(TAGS_URL).flush(TAGS);
  });

  it('uses the wide page width', () => {
    expect(el.classList).toContain('page-wide');
  });

  it('shows each post with its link, category, first tags, and status', async () => {
    start();
    await respond();

    const rows = [...el.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(2);
    expect(text(rows[0].querySelector('a'))).toBe('Spring openings');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/post-1');
    expect(text(rows[0])).toContain('/spring-openings');
    expect(text(rows[0])).toContain('News');
    const tagCell = rows[0].querySelectorAll('td')[2];
    expect([...tagCell.querySelectorAll('[data-slot="badge"]')].map((badge) => text(badge))).toEqual([
      'Hiring',
      'Launch',
      'Office',
    ]);
    expect(text(tagCell)).toContain('+1 more');
    expect(text(rows[0])).toContain('Published');
    expect(text(rows[1])).toContain('None');
    expect(text(rows[1])).toContain('Draft');
  });

  it('starts a new post from the header', async () => {
    start();
    await respond(EMPTY_PAGE);

    const link = [...el.querySelectorAll('a')].find((node) => text(node) === 'New post');
    expect(link?.getAttribute('href')).toBe('/new');
    expect(el.textContent).toContain('No posts yet');
  });

  it('says nothing matches when a filter leaves the list empty', async () => {
    start({ tag: 'launch' });
    await respond(EMPTY_PAGE);

    expect(el.textContent).toContain('No posts match');
  });

  it('searches titles when the search is submitted', async () => {
    start();
    await respond();

    const box = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    box.value = 'menu';
    box.dispatchEvent(new Event('input'));
    box.closest('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/?search=menu');
  });

  it('names the category and tag filters for screen readers', async () => {
    start();
    await respond();

    expect(el.querySelector('label[for="post-filter-category"]')?.textContent).toBe('Category');
    expect(el.querySelector('#post-filter-category')?.textContent).toContain('All categories');
    expect(el.querySelector('label[for="post-filter-tag"]')?.textContent).toBe('Tag');
  });
});
