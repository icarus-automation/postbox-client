import { Injectable, signal, type Signal } from '@angular/core';

/** Where a person's column pick lives between visits. */
export const LEAD_COLUMNS_KEY = 'leadColumns';

/**
 * Reads the stored pick. Storage throws in a browser that blocks it, and anyone can put
 * junk under the key, so anything but a list of keys counts as no pick at all.
 */
function readStored(): string[] | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(LEAD_COLUMNS_KEY) ?? 'null');
    return Array.isArray(stored) && stored.every((key) => typeof key === 'string') ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Which fields the inbox table shows, apart from the name column it always keeps.
 *
 * `null` means nobody has picked, so the table follows `defaultColumnKeys` and a field
 * added later lands in it. The pick is a view preference rather than organization data,
 * and the API has nowhere to keep it, so it stays in this browser.
 */
@Injectable({ providedIn: 'root' })
export class LeadColumns {
  private readonly picked = signal<readonly string[] | null>(readStored());

  /** The keys the person picked, or null while the table is on its default set. */
  readonly keys: Signal<readonly string[] | null> = this.picked.asReadonly();

  pick(keys: readonly string[]): void {
    const chosen = [...keys];
    this.picked.set(chosen);
    this.write(() => localStorage.setItem(LEAD_COLUMNS_KEY, JSON.stringify(chosen)));
  }

  /** Hands the table back to the default set, including fields added since. */
  reset(): void {
    this.picked.set(null);
    this.write(() => localStorage.removeItem(LEAD_COLUMNS_KEY));
  }

  /** A browser that refuses storage still shows the pick for this visit. */
  private write(change: () => void): void {
    try {
      change();
    } catch {
      // Nothing to recover: the pick lives in the signal either way.
    }
  }
}
