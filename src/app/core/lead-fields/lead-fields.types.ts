/** Every type a field definition can have. */
export const LEAD_FIELD_TYPES = ['text', 'long_text', 'number', 'select', 'url', 'date', 'datetime'] as const;

export type LeadFieldType = (typeof LEAD_FIELD_TYPES)[number];

/** The types a person can pick for a custom field. `datetime` belongs to system fields. */
export const CUSTOM_FIELD_TYPES = [
  'text',
  'long_text',
  'number',
  'select',
  'url',
  'date',
] as const satisfies readonly LeadFieldType[];

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

/**
 * One lead attribute, as `GET /leads/fields` describes it. Every organization starts with
 * the system fields and adds custom ones after them. Leads carry a value per `key`.
 */
export interface LeadField {
  id: string;
  /** The name used in lead `values`. camelCase, unique per organization, never changes. */
  key: string;
  label: string;
  type: LeadFieldType;
  /** The options a new value can take. Empty on every type but `select`. */
  options: string[];
  /** Agents must send it when they create a lead. */
  isRequired: boolean;
  /** The API sets it, so nobody can write it through lead `values`. */
  isReadOnly: boolean;
  /** Ships with every organization and cannot be deleted. */
  isSystem: boolean;
  /** Ascending sort key. The API already returns fields in this order. */
  position: number;
}

/** The body of `POST /leads/fields`. */
export interface NewLeadField {
  key: string;
  label: string;
  type: CustomFieldType;
  isRequired: boolean;
  /** Select fields only, and required on them. */
  options?: string[];
}
