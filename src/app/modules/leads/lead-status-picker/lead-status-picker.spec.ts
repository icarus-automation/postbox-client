import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeadStatusPicker } from './lead-status-picker';

const OPTIONS = ['new', 'contacted', 'qualified'];

describe('LeadStatusPicker', () => {
  let fixture: ComponentFixture<LeadStatusPicker>;
  let el: HTMLElement;
  let picks: string[];

  async function render(status: string, options = OPTIONS, label?: string): Promise<void> {
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('options', options);
    if (label) {
      fixture.componentRef.setInput('label', label);
    }
    await fixture.whenStable();
  }

  const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim();

  /** The control the visible label points at, so a label with no `for` fails the test. */
  function trigger(): HTMLButtonElement {
    const label = el.querySelector('label')!;
    return el.querySelector<HTMLButtonElement>(`#${label.getAttribute('for')}`)!;
  }

  /** The list is portaled, so it is never inside the component element. */
  async function open(): Promise<HTMLElement[]> {
    trigger().click();
    await fixture.whenStable();

    return [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')];
  }

  async function choose(stage: string): Promise<void> {
    (await open()).find((item) => text(item) === stage)!.click();
    await fixture.whenStable();

    // Picking closes the list, so the next open reads a fresh one.
    await vi.waitFor(() => expect(document.querySelector('[data-slot="select-item"]')).toBeNull());
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LeadStatusPicker] }).compileComponents();

    fixture = TestBed.createComponent(LeadStatusPicker);
    el = fixture.nativeElement as HTMLElement;
    picks = [];
    fixture.componentInstance.statusChange.subscribe((status) => picks.push(status));
  });

  it('is a labelled field, not a row of tabs', async () => {
    await render('new');

    expect(text(el.querySelector('label'))).toBe('Status');
    expect(el.querySelector('label')?.className).toContain('field-label');

    // One control that opens a list. The inbox tabs are a pressed segment each, and the
    // record must not borrow that chrome for an edit to a single lead.
    expect(trigger().getAttribute('role')).toBe('combobox');
    expect(el.querySelectorAll('button').length).toBe(1);
    expect(el.querySelector('[aria-pressed]')).toBeNull();
  });

  it('takes its label from the status field', async () => {
    await render('new', OPTIONS, 'Stage');

    expect(text(el.querySelector('label'))).toBe('Stage');
  });

  it('reads the stage the lead is at, by name', async () => {
    for (const status of OPTIONS) {
      await render(status);
      expect(text(trigger())).toBe(status.charAt(0).toUpperCase() + status.slice(1));
    }
  });

  it('offers every stage, and leaves archiving out because it is the lead flag', async () => {
    await render('new');

    expect((await open()).map((item) => text(item))).toEqual(['New', 'Contacted', 'Qualified']);
  });

  it('offers only the options the status field lists', async () => {
    await render('new', ['new', 'contacted']);

    expect((await open()).map((item) => text(item))).toEqual(['New', 'Contacted']);
  });

  it('reports each pick of a different stage', async () => {
    await render('new');

    await choose('Contacted');
    await choose('Qualified');

    expect(picks).toEqual(['contacted', 'qualified']);
  });

  it('ignores a pick of the stage the lead is already at', async () => {
    await render('qualified');

    await choose('Qualified');

    expect(picks).toEqual([]);
  });
});
