import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { toastState } from '@spartan-ng/brain/sonner';
import { Auth } from '@core/auth/auth';
import type { MemberRole } from '@core/auth/auth.types';
import { CATEGORIES, TAGS } from '@core/blog-terms/blog-terms.testing';
import { environment } from '@env/environment';
import { BlogTermList } from './blog-term-list';

const CATEGORIES_URL = `${environment.apiBaseUrl}/blog/categories`;
const TAGS_URL = `${environment.apiBaseUrl}/blog/tags`;
const NEWS = CATEGORIES[1];

describe('BlogTermList', () => {
  let fixture: ComponentFixture<BlogTermList>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim();
  const button = (label: string, root: ParentNode = el) =>
    [...root.querySelectorAll('button')].find(
      (node) => node.getAttribute('aria-label') === label || text(node) === label,
    );
  const dialog = () => document.querySelector<HTMLElement>('[data-slot="dialog-content"]');

  async function signIn(role: MemberRole): Promise<void> {
    const restored = TestBed.inject(Auth).restore();
    http.expectOne(`${environment.apiBaseUrl}/workspaces/admission`).flush({
      phase: 'admitted',
      user: { id: 'u', name: 'Ace Owner', email: 'owner@local.test' },
      password: 'sealed',
      workspaceUrlPrefix: 'handshakes.cards/',
      workspace: { id: 'o', name: 'Acme Inc', slug: 'acme-inc', website: null, logoUrl: null, role },
    });
    await restored;
  }

  async function open(kind: 'category' | 'tag', role: MemberRole = 'owner'): Promise<void> {
    await signIn(role);
    fixture.componentRef.setInput('kind', kind);
    TestBed.tick();
    http.expectOne(kind === 'category' ? CATEGORIES_URL : TAGS_URL).flush(kind === 'category' ? CATEGORIES : TAGS);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogTermList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BlogTermList);
    el = fixture.nativeElement as HTMLElement;
    toastState.dismiss();
  });

  afterEach(() => http.verify());

  it('lists categories with their links and how many posts use each', async () => {
    await open('category');

    expect(text(el.querySelector('h1'))).toBe('Categories');
    const rows = [...el.querySelectorAll('tbody tr')];
    expect(rows.map((row) => text(row.querySelector('th')))).toEqual(['Events', 'News']);
    expect(text(rows[0])).toContain('No posts');
    const posts = rows[1].querySelector('a')!;
    expect(text(posts)).toBe('3 posts');
    expect(posts.getAttribute('href')).toBe('/blog?category=news');
  });

  it('links tag counts to the blog filtered by that tag', async () => {
    await open('tag');

    expect(text(el.querySelector('h1'))).toBe('Tags');
    expect(el.querySelector('tbody a')?.getAttribute('href')).toBe('/blog?tag=hiring');
  });

  it('renames a category and shows the new name and link', async () => {
    await open('category');

    button('Rename News')!.click();
    await fixture.whenStable();
    const box = dialog()!.querySelector<HTMLInputElement>('#term-name')!;
    expect(box.value).toBe('News');
    box.value = 'Company news';
    box.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(text(dialog())).toContain('Its link will be company-news.');

    dialog()!.querySelector('form')!.dispatchEvent(new Event('submit'));
    const rename = await vi.waitFor(() => http.expectOne({ method: 'PATCH', url: `${CATEGORIES_URL}/${NEWS.id}` }));
    expect(rename.request.body).toEqual({ name: 'Company news' });
    rename.flush({ ...NEWS, name: 'Company news', slug: 'company-news' });
    await vi.waitFor(() => expect(toastState.toasts().length).toBe(1));
    await fixture.whenStable();

    const rows = [...el.querySelectorAll('tbody tr')];
    expect(rows.map((row) => text(row.querySelector('th')))).toEqual(['Company news', 'Events']);
    expect(text(rows[0])).toContain('company-news');
    expect(text(rows[0])).toContain('3 posts');
  });

  it('shows a clash with another category on the name', async () => {
    await open('category');

    button('Rename News')!.click();
    await fixture.whenStable();
    const box = dialog()!.querySelector<HTMLInputElement>('#term-name')!;
    box.value = 'Events';
    box.dispatchEvent(new Event('input'));
    dialog()!.querySelector('form')!.dispatchEvent(new Event('submit'));
    const rename = await vi.waitFor(() => http.expectOne({ method: 'PATCH', url: `${CATEGORIES_URL}/${NEWS.id}` }));
    rename.flush(
      { message: 'Another category is already called Events' },
      { status: 409, statusText: 'Conflict' },
    );

    await vi.waitFor(() =>
      expect(text(dialog()?.querySelector('hlm-field-error'))).toBe('Another category is already called Events'),
    );
  });

  it('deletes a category after saying its posts stay', async () => {
    await open('category');

    button('Delete News')!.click();
    await fixture.whenStable();
    expect(text(dialog())).toContain('3 posts in it stay on your blog, without a category.');

    button('Delete category', dialog()!)!.click();
    http.expectOne({ method: 'DELETE', url: `${CATEGORIES_URL}/${NEWS.id}` }).flush(NEWS);
    await vi.waitFor(() => expect(toastState.toasts().length).toBe(1));
    await fixture.whenStable();

    expect([...el.querySelectorAll('tbody th')].map((cell) => text(cell))).toEqual(['Events']);
  });

  it('lets a member see the counts but not change anything', async () => {
    await open('category', 'member');

    expect(button('Rename News')).toBeUndefined();
    expect(button('Delete News')).toBeUndefined();
    expect(button('Add category')).toBeUndefined();
    expect(el.textContent).toContain('An owner or admin can add, rename and delete categories here.');
  });
});
