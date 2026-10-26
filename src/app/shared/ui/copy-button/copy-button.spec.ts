import { ComponentFixture, TestBed } from '@angular/core/testing';
import { toastState } from '@spartan-ng/brain/sonner';
import { CopyButton } from './copy-button';

describe('CopyButton', () => {
  let fixture: ComponentFixture<CopyButton>;
  let el: HTMLElement;
  const writeText = vi.fn<(text: string) => Promise<void>>();

  const button = () => el.querySelector('button')!;
  const toasts = () => toastState.toasts().map((each) => each.title);

  beforeEach(async () => {
    writeText.mockReset();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await TestBed.configureTestingModule({ imports: [CopyButton] }).compileComponents();

    fixture = TestBed.createComponent(CopyButton);
    fixture.componentRef.setInput('value', 'pbi_secret');
    fixture.componentRef.setInput('label', 'Copy integration key');
    fixture.componentRef.setInput('confirmation', 'Integration key copied');
    el = fixture.nativeElement as HTMLElement;
    toastState.dismiss();
    await fixture.whenStable();
  });

  it('says what it copies in its accessible name', () => {
    expect(button().getAttribute('aria-label')).toBe('Copy integration key');
    expect(button().textContent?.trim()).toBe('Copy');
  });

  it('puts the value on the clipboard and confirms with a toast', async () => {
    writeText.mockResolvedValue(undefined);

    button().click();

    await vi.waitFor(() => expect(toasts()).toEqual(['Integration key copied']));
    expect(writeText).toHaveBeenCalledWith('pbi_secret');
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('copies the value it holds now, not the one it started with', async () => {
    writeText.mockResolvedValue(undefined);
    fixture.componentRef.setInput('value', 'pbi_rotated');
    await fixture.whenStable();

    button().click();

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('pbi_rotated'));
  });

  it('says so beside the button when the browser refuses, and shows no toast', async () => {
    writeText.mockRejectedValue(new Error('denied'));

    button().click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    await fixture.whenStable();

    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Could not copy. Select the text and copy it.',
    );
    expect(toasts()).toEqual([]);
  });

  it('clears that message on the next copy that works', async () => {
    writeText.mockRejectedValueOnce(new Error('denied')).mockResolvedValue(undefined);

    button().click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    await fixture.whenStable();
    expect(el.querySelector('[role="alert"]')).not.toBeNull();

    button().click();
    await vi.waitFor(() => expect(toasts()).toEqual(['Integration key copied']));
    await fixture.whenStable();
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('says so when the browser has no clipboard at all', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });

    button().click();
    await vi.waitFor(() => expect(el.querySelector('[role="alert"]')).not.toBeNull());
  });
});
