import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '@env/environment';
import type { EditorEntry } from '../content.types';
import { ContentEditor } from './content-editor';

const ENTRY_URL = `${environment.apiBaseUrl}/content/entry-1`;

const ENTRY: EditorEntry = {
  id: 'entry-1',
  kind: 'page',
  title: 'Summer menu',
  slug: 'summer-menu',
  excerpt: '',
  metaTitle: '',
  metaDescription: '',
  ogImage: null,
  coverImage: null,
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

describe('ContentEditor', () => {
  let fixture: ComponentFixture<ContentEditor>;
  let http: HttpTestingController;
  let el: HTMLElement;

  async function open(body: EditorEntry | null = ENTRY): Promise<void> {
    fixture.componentRef.setInput('id', 'entry-1');
    TestBed.tick();
    const request = http.expectOne(ENTRY_URL);
    if (body) {
      request.flush(body);
    } else {
      request.flush({ statusCode: 404, message: 'Content not found' }, { status: 404, statusText: 'Not Found' });
    }
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentEditor],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ContentEditor);
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  it('uses the standard page width', () => {
    expect(el.classList).toContain('page-standard');
  });

  it('says the page is missing', async () => {
    await open(null);

    expect(el.textContent).toContain('Page not found');
    expect(el.querySelector('#content-title')).toBeNull();
  });

  it('moves an image to the right and saves that side without a status', async () => {
    await open();

    expect(el.querySelector<HTMLInputElement>('#content-title')?.value).toBe('Summer menu');
    const right = [...el.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Right');
    expect(right?.getAttribute('aria-pressed')).toBe('false');

    right!.click();
    await fixture.whenStable();
    expect(right!.getAttribute('aria-pressed')).toBe('true');

    [...el.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Save')!.click();

    const save = http.expectOne(ENTRY_URL);
    expect(save.request.method).toBe('PUT');
    expect(save.request.body).not.toHaveProperty('status');
    expect(save.request.body.blocks).toEqual([
      expect.objectContaining({ id: 'section-1', kind: 'media_text', side: 'image_right', heading: 'Hours' }),
    ]);
    save.flush({ ...ENTRY, blocks: [{ ...ENTRY.blocks[0], side: 'image_right' }] });
    await fixture.whenStable();
  });
});
