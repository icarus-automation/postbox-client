import { TestBed } from '@angular/core/testing';
import { Welcome } from './welcome';

describe('Welcome', () => {
  // DELETE ME with the welcome feature. Verifies brain + helm + theme tokens are wired.
  it('renders spartan buttons with helm classes applied', async () => {
    await TestBed.configureTestingModule({ imports: [Welcome] }).compileComponents();
    const fixture = TestBed.createComponent(Welcome);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('button[hlmbtn], button[hlmBtn]');
    expect(buttons.length).toBe(5);
    expect(buttons[0].getAttribute('data-slot')).toBe('button');
    expect(buttons[0].className).toContain('bg-primary');
    expect(el.querySelectorAll('li').length).toBeGreaterThan(10);
  });
});
