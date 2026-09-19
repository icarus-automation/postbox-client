import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeadStatusBadge } from './lead-status';

const STATUSES = ['new', 'contacted', 'qualified'];

describe('LeadStatusBadge', () => {
  let fixture: ComponentFixture<LeadStatusBadge>;

  async function render(status: string): Promise<HTMLElement> {
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).querySelector('span')!;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LeadStatusBadge] }).compileComponents();
    fixture = TestBed.createComponent(LeadStatusBadge);
  });

  it('labels every status in sentence case', async () => {
    const labels: string[] = [];
    for (const status of STATUSES) {
      labels.push((await render(status)).textContent!.trim());
    }

    expect(labels).toEqual(['New', 'Contacted', 'Qualified']);
  });

  it('gives each status its own tone', async () => {
    const tones: (string | null)[] = [];
    for (const status of STATUSES) {
      tones.push((await render(status)).getAttribute('data-variant'));
    }

    expect(tones).toEqual(['secondary', 'warning', 'success']);
    expect(new Set(tones).size).toBe(STATUSES.length);
  });

  it('shows a status it has no tone for as a plain outline', async () => {
    const badge = await render('paused');

    expect(badge.textContent?.trim()).toBe('Paused');
    expect(badge.getAttribute('data-variant')).toBe('outline');
  });

  it('paints the tone with theme tokens rather than a hardcoded colour', async () => {
    expect((await render('qualified')).className).toContain('bg-muted-success');
  });
});
