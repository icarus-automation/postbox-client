import type { Lead, LeadPage } from './leads.types';

/** Spec data only. A lead holding a value for every field in `ALL_FIELDS`, as the API returns it. */
export const LEAD: Lead = {
  id: '01a09ba4-75d2-7308-9384-7a9b2967e673',
  values: {
    candidate: 'Dana Reyes',
    product: 'POS',
    source: 'https://facebook.com/groups/indiefounders/posts/123456',
    signal: 'Asked which POS handles split bills\nfor a 40-seat cafe',
    whyLead: 'Opening a second location next month.',
    status: 'new',
    receivedAt: '2026-09-13T16:40:41.682Z',
    dealSize: 1200,
    tier: 'Gold',
    followUp: '2026-10-01',
  },
  isArchived: false,
  createdAt: '2026-09-13T16:40:41.682Z',
  updatedAt: '2026-09-13T16:40:41.682Z',
};

/** Spec data only. `LEAD` with some values replaced. */
export function leadWith(values: Lead['values'], rest: Partial<Omit<Lead, 'values'>> = {}): Lead {
  return { ...LEAD, ...rest, values: { ...LEAD.values, ...values } };
}

/** Spec data only. One page holding `LEAD`. */
export function leadPage(overrides: Partial<LeadPage> = {}): LeadPage {
  return {
    data: [LEAD],
    meta: { total: 1, page: 1, limit: 20, lastPage: 1 },
    ...overrides,
  };
}
