/** What the Developers page fills into its prompt and examples. */
export interface Connection {
  apiBaseUrl: string;
  slug: string;
}

export interface ReferenceItem {
  id: string;
  title: string;
  description: string;
  example: string;
}

/** The env var the prompt tells the agent to read the key from. */
export const KEY_ENV_VAR = 'POSTBOX_INTEGRATION_KEY';
export const WEBHOOK_SECRET_ENV_VAR = 'POSTBOX_WEBHOOK_SECRET';

/** The public integration guide. The API serves it without a key, so an agent can fetch it. */
export function guideUrl(apiBaseUrl: string): string {
  return `${apiBaseUrl}/docs/integration.md`;
}

/**
 * One short prompt for an AI coding agent. It names this organization and points at the guide
 * for everything else, so it stays short and the guide stays the one place details live.
 */
export function agentPrompt({ apiBaseUrl, slug }: Connection): string {
  return [
    'Connect this website to my Postbox blog and leads inbox. Use Next.js App Router unless the site already uses another framework.',
    `Read the full guide first: ${guideUrl(apiBaseUrl)}`,
    `API base URL: ${apiBaseUrl}`,
    `Organization slug: ${slug}`,
    `Keep the integration key in the env var ${KEY_ENV_VAR} and send it in the x-integration-key header. Never hard-code it.`,
    'Build:',
    '1. A blog list page with category and tag filters.',
    "2. A post page by slug that renders the post's html field, with a stylesheet for the pb-* classes.",
    `3. A route that revalidates the blog pages when the publish webhook calls it, after checking the signature with ${WEBHOOK_SECRET_ENV_VAR}.`,
    '4. A lead form that posts to the leads endpoint.',
    'Take routes, fields and examples from the guide. Do not add anything else.',
  ].join('\n');
}

/** The calls a site makes, each with one short example that uses this organization's slug. */
export function quickReference({ apiBaseUrl, slug }: Connection): ReferenceItem[] {
  const site = `${apiBaseUrl}/public/${slug}`;
  const keyHeader = `-H "x-integration-key: $${KEY_ENV_VAR}"`;

  return [
    {
      id: 'list-posts',
      title: 'List posts',
      description: 'Published posts, newest first. limit runs from 1 to 50 and defaults to 10.',
      example: [`curl ${keyHeader} \\`, `  "${site}/blog/posts?limit=5"`].join('\n'),
    },
    {
      id: 'get-post',
      title: 'Get a post',
      description: 'One post by its slug. It comes back with blocks and a ready-made html field.',
      example: [`curl ${keyHeader} \\`, `  "${site}/blog/posts/spring-openings"`].join('\n'),
    },
    {
      id: 'filters',
      title: 'Filter by category and tag',
      description:
        'Pass a category slug, a tag slug, or both. The slugs come from /blog/categories and /blog/tags.',
      example: [`curl ${keyHeader} \\`, `  "${site}/blog/posts?category=news&tag=hiring"`].join('\n'),
    },
    {
      id: 'submit-lead',
      title: 'Submit a lead',
      description:
        'From a form, straight from the browser or from your server. Required: candidate, product, source, signal and whyLead.',
      example: [
        `curl -X POST "${site}/leads" \\`,
        `  ${keyHeader} \\`,
        '  -H "content-type: application/json" \\',
        "  -d '{",
        '    "values": {',
        '      "candidate": "Dana Reyes",',
        '      "product": "POS",',
        '      "source": "https://example.com/contact",',
        '      "signal": "Asked for a demo",',
        '      "whyLead": "Contact form"',
        '    }',
        "  }'",
      ].join('\n'),
    },
    {
      id: 'webhook-payload',
      title: 'Webhook payload',
      description:
        'Sent when a post is published, unpublished or changed. type is post.published, post.unpublished or post.updated. post has the fields of a post from the API, plus status.',
      example: [
        '{',
        '  "type": "post.published",',
        `  "organizationSlug": "${slug}",`,
        '  "post": {',
        '    "status": "published",',
        '    "title": "Spring openings",',
        '    "slug": "spring-openings",',
        '    "publishedAt": "2026-10-25T08:00:00.000Z",',
        '    "blocks": [],',
        '    "html": "<h2 class=\\"pb-heading\\">Open roles</h2>"',
        '  }',
        '}',
      ].join('\n'),
    },
    {
      id: 'webhook-signature',
      title: 'Check the webhook signature',
      description: `X-Blog-Signature is sha256= plus the hex HMAC-SHA256 of the raw request body, keyed with your webhook secret (${WEBHOOK_SECRET_ENV_VAR}).`,
      example: [
        "import { createHmac, timingSafeEqual } from 'node:crypto';",
        '',
        "const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;",
        'const valid =',
        '  signature.length === expected.length &&',
        '  timingSafeEqual(Buffer.from(signature), Buffer.from(expected));',
      ].join('\n'),
    },
  ];
}
