import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { TermRef } from '@core/blog-terms/blog-terms.types';
import { CATEGORIES, TAGS } from '@core/blog-terms/blog-terms.testing';
import { environment } from '@env/environment';
import { CategoryPicker } from './category-picker';
import { TagPicker } from './tag-picker';

const CATEGORIES_URL = `${environment.apiBaseUrl}/blog/categories`;
const TAGS_URL = `${environment.apiBaseUrl}/blog/tags`;

/** Option lists are portaled into an overlay, so they are read from the document. */
const option = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')].find(
    (item) => item.textContent?.trim() === label,
  );

const options = () =>
  [...document.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')]
    .filter((item) => !item.hasAttribute('data-hidden'))
    .map((item) => item.textContent?.trim());

function type(box: HTMLInputElement, value: string): void {
  box.value = value;
  box.dispatchEvent(new Event('input'));
}

describe('CategoryPicker', () => {
  let fixture: ComponentFixture<CategoryPicker>;
  let http: HttpTestingController;
  let picked: (TermRef | null)[];

  const box = () =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[role="combobox"]')!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryPicker],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CategoryPicker);
    picked = [];
    fixture.componentInstance.categoryChange.subscribe((category) => picked.push(category));
    TestBed.tick();
    http.expectOne(CATEGORIES_URL).flush(CATEGORIES);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('labels the box Category', () => {
    const label = (fixture.nativeElement as HTMLElement).querySelector('label');

    expect(label?.textContent?.trim()).toBe('Category');
    expect(label?.getAttribute('for')).toBe(box().id);
  });

  it('adds a category from a new name and picks it for the post', async () => {
    type(box(), 'Product news');
    await fixture.whenStable();

    expect(options()).toEqual(['Add "Product news"']);
    option('Add "Product news"')!.click();

    const create = http.expectOne({ method: 'POST', url: CATEGORIES_URL });
    expect(create.request.body).toEqual({ name: 'Product news' });
    create.flush({ id: 'category-3', name: 'Product news', slug: 'product-news', postCount: 0 });
    await vi.waitFor(() => expect(picked).toHaveLength(1));

    expect(picked[0]).toEqual({ id: 'category-3', name: 'Product news', slug: 'product-news' });
  });

  it('offers the category that has the name rather than a second one', async () => {
    type(box(), 'news');
    await fixture.whenStable();

    expect(options()).toEqual(['News']);
    option('News')!.click();
    await fixture.whenStable();

    expect(picked).toEqual([{ id: CATEGORIES[1].id, name: 'News', slug: 'news' }]);
  });

  it('keeps the post as it was when the new category is refused', async () => {
    type(box(), 'Launches');
    await fixture.whenStable();
    option('Add "Launches"')!.click();

    http
      .expectOne({ method: 'POST', url: CATEGORIES_URL })
      .flush({ message: 'Use a name with a letter or a number' }, { status: 400, statusText: 'Bad Request' });
    await vi.waitFor(() =>
      expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain(
        'Use a name with a letter or a number',
      ),
    );

    expect(picked).toEqual([]);
  });
});

describe('TagPicker', () => {
  let fixture: ComponentFixture<TagPicker>;
  let http: HttpTestingController;
  let picked: TermRef[][];

  const box = () =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[role="combobox"]')!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagPicker],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TagPicker);
    fixture.componentRef.setInput('tags', [TAGS[0]]);
    picked = [];
    fixture.componentInstance.tagsChange.subscribe((tags) => picked.push(tags));
    TestBed.tick();
    http.expectOne(TAGS_URL).flush(TAGS);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('shows the tags on the post as chips with named remove buttons', () => {
    const chips = [...(fixture.nativeElement as HTMLElement).querySelectorAll('[data-slot="combobox-chip"]')];

    expect(chips.map((chip) => chip.textContent?.trim())).toEqual(['Hiring']);
    expect(chips[0].querySelector('button')?.getAttribute('aria-label')).toBe('Remove Hiring');
  });

  it('adds a new tag beside the ones the post has', async () => {
    type(box(), 'Launch party');
    await fixture.whenStable();

    option('Add "Launch party"')!.click();
    const create = http.expectOne({ method: 'POST', url: TAGS_URL });
    expect(create.request.body).toEqual({ name: 'Launch party' });
    create.flush({ id: 'tag-3', name: 'Launch party', slug: 'launch-party', postCount: 0 });
    await vi.waitFor(() => expect(picked).toHaveLength(1));

    expect(picked[0].map((tag) => tag.name)).toEqual(['Hiring', 'Launch party']);
    expect(picked[0].every((tag) => tag.id !== '')).toBe(true);
  });

  it('adds a tag the organization already has without saving anything', async () => {
    type(box(), 'Laun');
    await fixture.whenStable();

    expect(options()).toContain('Launch');
    option('Launch')!.click();
    await fixture.whenStable();

    expect(picked.at(-1)?.map((tag) => tag.slug)).toEqual(['hiring', 'launch']);
  });
});
