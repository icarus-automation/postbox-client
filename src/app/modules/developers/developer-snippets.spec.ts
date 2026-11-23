import {
  KEY_ENV_VAR,
  WEBHOOK_SECRET_ENV_VAR,
  agentPrompt,
  guideUrl,
  quickReference,
} from './developer-snippets';

const connection = {
  apiBaseUrl: 'https://postbox-api.geoplanph.com/api/v1',
  slug: 'acme-inc',
};

describe('guideUrl', () => {
  it('is the public guide on the API', () => {
    expect(guideUrl(connection.apiBaseUrl)).toBe(
      'https://postbox-api.geoplanph.com/api/v1/docs/integration.md',
    );
  });
});

describe('agentPrompt', () => {
  const prompt = agentPrompt(connection);
  const lines = prompt.split('\n');

  it('is short, about a dozen lines at most', () => {
    expect(lines.length).toBeLessThanOrEqual(12);
  });

  it('is filled in with this organization: the base URL, the slug and the guide URL', () => {
    expect(prompt).toContain(`API base URL: ${connection.apiBaseUrl}`);
    expect(prompt).toContain(`Organization slug: ${connection.slug}`);
    expect(prompt).toContain(`Read the full guide first: ${guideUrl(connection.apiBaseUrl)}`);
  });

  it('defaults to Next.js App Router', () => {
    expect(prompt).toContain('Use Next.js App Router unless the site already uses another framework.');
  });

  it('asks for the list page, the post page, the revalidate route and the lead form', () => {
    expect(prompt).toContain('blog list page with category and tag filters');
    expect(prompt).toMatch(/post page by slug that renders the post's html field.*pb-\* classes/);
    expect(prompt).toMatch(/revalidates the blog pages when the publish webhook calls it/);
    expect(prompt).toMatch(/lead form that posts to the leads endpoint/);
  });

  it('puts the key in an env var and never carries a key itself', () => {
    expect(prompt).toContain(`env var ${KEY_ENV_VAR}`);
    expect(prompt).toContain(WEBHOOK_SECRET_ENV_VAR);
    expect(prompt).not.toMatch(/pbi_/);
  });

  it('points at the guide for details instead of repeating them', () => {
    expect(prompt).toContain('Take routes, fields and examples from the guide.');
    expect(prompt).not.toContain('/public/');
  });
});

describe('quickReference', () => {
  const items = quickReference(connection);
  const byId = (id: string) => items.find((item) => item.id === id)!;

  it('covers listing, getting, filtering, leads, the webhook payload and its signature', () => {
    expect(items.map((item) => item.id)).toEqual([
      'list-posts',
      'get-post',
      'filters',
      'submit-lead',
      'webhook-payload',
      'webhook-signature',
    ]);
  });

  it('gives every item one example and a sentence about it', () => {
    for (const item of items) {
      expect(item.example.trim()).not.toBe('');
      expect(item.description.trim()).not.toBe('');
    }
  });

  it('points the read examples at this organization with the key header', () => {
    for (const id of ['list-posts', 'get-post', 'filters']) {
      expect(byId(id).example).toContain(
        `${connection.apiBaseUrl}/public/${connection.slug}/blog/posts`,
      );
      expect(byId(id).example).toContain(`x-integration-key: $${KEY_ENV_VAR}`);
    }
    expect(byId('filters').example).toContain('category=news&tag=hiring');
  });

  it('posts a lead to the public leads route', () => {
    const example = byId('submit-lead').example;

    expect(example).toContain(`POST "${connection.apiBaseUrl}/public/${connection.slug}/leads"`);
    expect(example).toContain(`x-integration-key: $${KEY_ENV_VAR}`);
    const body = /-d '([\s\S]*)'$/.exec(example)?.[1] ?? '';
    expect(Object.keys((JSON.parse(body) as { values: object }).values)).toEqual([
      'candidate',
      'product',
      'source',
      'signal',
      'email',
    ]);
  });

  it('shows a webhook payload that is valid JSON for this organization', () => {
    const payload = JSON.parse(byId('webhook-payload').example) as {
      type: string;
      organizationSlug: string;
      post: { html: string };
    };

    expect(payload.type).toBe('post.published');
    expect(payload.organizationSlug).toBe(connection.slug);
    expect(payload.post.html).toContain('pb-heading');
  });

  it('shows how to check the signature against the raw body', () => {
    const example = byId('webhook-signature').example;

    expect(example).toContain("createHmac('sha256', secret).update(rawBody)");
    expect(example).toContain('timingSafeEqual');
    expect(byId('webhook-signature').description).toContain('X-Blog-Signature');
  });

  it('keeps to the house style: no em or en dashes anywhere', () => {
    const everything = [agentPrompt(connection), ...items.flatMap((item) => [item.title, item.description, item.example])];

    // Built from character codes, so this file holds no dash itself.
    const dashes = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
    for (const text of everything) {
      expect(text).not.toMatch(dashes);
    }
  });
});
