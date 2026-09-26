import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '@env/environment';
import { starterBody } from '../content.document';
import { ContentList } from './content-list';

const CONTENT_URL = `${environment.apiBaseUrl}/content`;

const EMPTY_PAGE = { data: [], meta: { total: 0, page: 1, limit: 20, lastPage: 1 } };

@Component({ selector: 'app-editor-stub', template: '' })
class EditorStub {}

describe('Content starters', () => {
  it('builds an article without blocks so the server fills the template', () => {
    const body = starterBody('post', 'Cafe launch');

    expect(body).toEqual({ kind: 'post', title: 'Cafe launch', slug: 'cafe-launch' });
    expect(body).not.toHaveProperty('blocks');
  });

  it('builds a landing page as kind page', () => {
    expect(starterBody('page', 'Summer menu!')).toEqual({
      kind: 'page',
      title: 'Summer menu!',
      slug: 'summer-menu',
    });
  });
});

describe('ContentList', () => {
  let fixture: ComponentFixture<ContentList>;
  let http: HttpTestingController;
  let el: HTMLElement;

  function start(params: Record<string, string> = {}): void {
    for (const [name, value] of Object.entries(params)) {
      fixture.componentRef.setInput(name, value);
    }
    TestBed.tick();
  }

  async function respond(body: object = EMPTY_PAGE): Promise<void> {
    http.expectOne((request) => request.url === CONTENT_URL).flush(body);
    await fixture.whenStable();
  }

  const dialog = () => document.querySelector<HTMLElement>('[data-slot="dialog-content"]');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentList],
      providers: [
        provideRouter([
          { path: 'content', component: ContentList },
          { path: 'content/:id', component: EditorStub },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ContentList);
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  it('reads the first page with no type or status filter', () => {
    start();

    const request = http.expectOne((req) => req.url === CONTENT_URL).request;
    expect(request.params.get('page')).toBe('1');
    expect(request.params.get('limit')).toBe('20');
    expect(request.params.has('kind')).toBe(false);
    expect(request.params.has('status')).toBe(false);
  });

  it('passes the type and status the query string names', () => {
    start({ kind: 'page', status: 'draft', page: '2' });

    const params = http.expectOne((req) => req.url === CONTENT_URL).request.params;
    expect(params.get('kind')).toBe('page');
    expect(params.get('status')).toBe('draft');
    expect(params.get('page')).toBe('2');
  });

  it('ignores a type or status the API does not offer', () => {
    start({ kind: 'note', status: 'archived' });

    const params = http.expectOne((req) => req.url === CONTENT_URL).request.params;
    expect(params.has('kind')).toBe(false);
    expect(params.has('status')).toBe(false);
  });

  it('uses the wide page width', () => {
    expect(el.classList).toContain('page-wide');
  });

  it('creates an article from the title and leaves the template to the server', async () => {
    start();
    await respond();

    [...el.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Article')!.click();
    await fixture.whenStable();

    const title = dialog()!.querySelector<HTMLInputElement>('#starter-title')!;
    title.value = 'Cafe launch';
    title.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    dialog()!.querySelector('form')!.dispatchEvent(new Event('submit'));

    const request = http.expectOne(CONTENT_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ kind: 'post', title: 'Cafe launch', slug: 'cafe-launch' });
    expect(request.request.body).not.toHaveProperty('blocks');

    request.flush({ id: 'article-1' });
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/content/article-1');
  });

  it('creates a landing page as kind page', async () => {
    start();
    await respond();

    [...el.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Landing page')!.click();
    await fixture.whenStable();

    const title = dialog()!.querySelector<HTMLInputElement>('#starter-title')!;
    title.value = 'Summer menu';
    title.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    dialog()!.querySelector('form')!.dispatchEvent(new Event('submit'));

    const request = http.expectOne(CONTENT_URL);
    expect(request.request.body).toEqual({ kind: 'page', title: 'Summer menu', slug: 'summer-menu' });
    request.flush({ id: 'page-1' });
    await fixture.whenStable();
  });
});
