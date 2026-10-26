/** An admin API key as the list shows it. The raw key is never part of it. */
export interface ApiKeySummary {
  id: string;
  name: string | null;
  /** The first characters of the key, enough to tell keys apart. */
  keyPrefix: string | null;
  lastUsedAt: string | null;
  /** Set once the key is revoked. A revoked key stays in the list. */
  revokedAt: string | null;
  createdAt: string;
}

/** What creating a key returns. `key` is the raw key, and this is the only time it is sent. */
export interface CreatedApiKey extends ApiKeySummary {
  key: string;
}
