You must follow the project theme. The single source of truth is `src/styles.css`.

## How the theme is structured

`src/styles.css` has three parts, in order:

1. `:root` holds raw hex values. **This is the only file where hex literals belong.**
2. `@theme inline` maps those CSS vars to Tailwind tokens (`--color-primary` gives you `bg-primary`, `text-primary`, `border-primary`, ...).
3. `@layer base` applies global defaults (fonts, body background, heading styles).

Token names follow the **spartan/shadcn contract**. Vendored helm components in
`src/app/shared/ui/` read `--background`, `--foreground`, `--primary`, `--muted`,
`--accent`, `--border`, `--ring`, `--radius` and the `--sidebar-*` set directly.
Renaming or deleting one of those silently breaks every helm component. Add new tokens
freely, rename existing ones only with a full sweep.

## Colors

- Use the Tailwind tokens: `bg-primary`, `text-primary-foreground`, `bg-secondary`, `bg-muted`, `text-muted-foreground`, `text-heading`, `text-body`, `border-border`, `bg-background`, `bg-card`, `bg-destructive`, `bg-success`, `ring-ring`, `bg-sidebar`, etc.
- Or the underlying vars: `var(--primary)`, `var(--text-body)`, `var(--border)`.
- **NEVER hardcode hex in components or templates.** Hex lives in `styles.css` only.
- Raw Tailwind palette colors (`bg-blue-500`) are allowed, but leave a one-line comment saying why, so a reviewer can decide whether to promote it into the theme.
- Status UI uses `destructive` / `muted-destructive` / `success` / `muted-success`. Do not invent new red or green shades.

### Semantic trap

`--secondary` and `--accent` are **low-contrast surfaces** in this contract: secondary
buttons, hovered rows, highlighted menu items. They are not "the brand's second color".
The vivid brand cyan lives in `--ring` (focus). If you want a loud accent fill, add a new
token rather than overloading `--accent`, or every helm hover state changes with it.

## Light scheme only

This project does not support dark mode. There is no `.dark` block and `color-scheme` is
`light`. Vendored helm sources still carry `dark:` variants from upstream; those never
activate. Leave them alone, do not spend effort stripping them.

## Typography

- Headings h1 through h6 use `font-heading` (Poppins). Applied globally, do not re-apply or override.
- Body, buttons and inputs use `font-body` (Work Sans). Also global. `--font-sans` is aliased to it so Tailwind and helm defaults match.
- Fonts load from Google Fonts via `<link>` in `src/index.html`, with preconnect. Do NOT add an `@import url()` for fonts in CSS, and do NOT add more font families.

## Radius and spacing

- Border radius: `rounded-base` (which is `var(--radius)`). Helm components additionally use `--radius-sm/md/lg/xl`, derived automatically from `--radius` by the spartan preset. Change `--radius` once and the whole scale follows.
- Spacing: Tailwind defaults. No custom scale.

## Adding a spartan component

`pnpm ng g @spartan-ng/cli:ui` vendors it into `src/app/shared/ui/`. Those files are
yours. Restyle them in place rather than wrapping them in override CSS. Import via
`@ui/<name>`.
