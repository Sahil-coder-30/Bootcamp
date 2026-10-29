# PlaceIntel color tokens

The color palette of the frontend in light and dark mode. Every value here is the computed value in the running app (read with `getComputedStyle` on `<html>` in each theme), so it already accounts for which file wins when `styles.css` and `styles/index.scss` both set a variable. If a value changes in the source, update this file too.

- **Tailwind / shadcn palette:** `src/styles.css`. The `@theme inline` block maps each CSS variable to Tailwind utilities (`--primary` → `bg-primary`, `text-primary`, `border-primary`, ...).
- **SCSS tokens for feature components:** `src/styles/index.scss` (variables) and `src/styles/tokens.scss` (`$color-*` aliases and mixins).
- **Theme switch:** `src/hooks/useTheme.ts` (and the boot script in `index.html`). Dark sets `class="dark"` and `data-theme="dark"` on `<html>`; light removes `.dark` and sets `.light-theme`. The choice is saved in `localStorage` (`placeintel_theme`). Dark is the default.
- **Tailwind dark variant:** `dark:` matches `.dark *` (`@custom-variant dark` in `styles.css`).

Rule of thumb: use the semantic utilities (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`) so a component works in both themes. Only use raw Tailwind colors for brand accents, and give them a `dark:` pair when contrast differs (see "Accent colors" below).

## 1. Core surfaces and text

| Token (CSS var) | Tailwind utility | Light | Dark | Usage |
|---|---|---|---|---|
| `--background` | `bg-background` | `#f8fafc` | `#0b0c0e` | Page canvas, `body` background |
| `--foreground` | `text-foreground` | `#0f172a` | `#f3f4f6` | Default text, headings |
| `--card` | `bg-card` | `#ffffff` | `#12141a` | Cards, panels, header/menus |
| `--card-foreground` | `text-card-foreground` | `#0f172a` | `#f3f4f6` | Text on cards |
| `--card-sub` | `bg-card-sub` | `#f1f5f9` | `#171922` | Nested/sub card areas |
| `--popover` | `bg-popover` | `#ffffff` | `#12141a` | Dropdowns, popovers, dialogs |
| `--popover-foreground` | `text-popover-foreground` | `#0f172a` | `#f3f4f6` | Text in popovers |
| `--muted` | `bg-muted` | `#f1f5f9` | `#171922` | Chips, hover fills, tracks |
| `--muted-foreground` | `text-muted-foreground` | `#64748b` | `#94a3b8` | Secondary/body copy, captions |
| `--secondary` | `bg-secondary` | `#f1f5f9` | `#171922` | Secondary buttons |
| `--secondary-foreground` | `text-secondary-foreground` | `#1e293b` | `#f3f4f6` | Text on secondary, emphasised body copy |

## 2. Brand and interaction

| Token | Tailwind utility | Light | Dark | Usage |
|---|---|---|---|---|
| `--primary` | `bg-primary`, `text-primary` | `#4f46e5` | `#f97316` | Main CTA buttons, active nav, links |
| `--primary-foreground` | `text-primary-foreground` | `#ffffff` | `#ffffff` | Text/icons on primary |
| `--accent` | `bg-accent` | `#eef2ff` | `#f97316` | Accent fills, selected rows |
| `--accent-foreground` | `text-accent-foreground` | `#3730a3` | `#ffffff` | Text on accent |
| `--ring` | `ring-ring` | `#4f46e5` | `#f97316` | Focus rings |
| `--terracotta` | `bg-terracotta`, `text-terracotta` | `#ea580c` | `#f97316` | Orange brand alias (works in both themes) |
| `--terracotta-hover` | `bg-terracotta-hover` | `#c2410c` | `#ea580c` | Hover of the above |

## 3. Borders and inputs

| Token | Tailwind utility | Light | Dark | Usage |
|---|---|---|---|---|
| `--border` | `border-border` | `#e2e8f0` | `#1e222d` | Default border (also set on `*`) |
| `--border-strong` | `border-border-strong` | `#cbd5e1` | `#2a2e3d` | Stronger dividers, outlined controls |
| `--border-sub` | `border-border-sub` | `#f1f5f9` | `#252936` | Subtle inner borders |
| `--input` | `border-input` | `#e2e8f0` | `#1e222d` | Form field borders |

## 4. Status colors

| Token | Tailwind utility | Light | Dark | Usage |
|---|---|---|---|---|
| `--success` | `text-success`, `bg-success` | `#10b981` | `#22c55e` | Ready / cutoff met / success |
| `--destructive` | `bg-destructive`, `text-destructive` | `#ef4444` | `#ef4444` | Errors, gaps, log out |
| `--destructive-foreground` | `text-destructive-foreground` | `#ffffff` | `#ffffff` | Text on destructive |

## 5. Charts

| Token | Tailwind utility | Light | Dark | Usage |
|---|---|---|---|---|
| `--chart-1` | `fill-chart-1`, `bg-chart-1` | `#4f46e5` | `#f97316` | Series 1 (candidate) |
| `--chart-2` | `*-chart-2` | `#0284c7` | `#f59e0b` | Series 2 (company bar) |
| `--chart-3` | `*-chart-3` | `#10b981` | `#fbbf24` | Series 3 |
| `--chart-4` | `*-chart-4` | `#f59e0b` | `#c2410c` | Series 4 |
| `--chart-5` | `*-chart-5` | `#7c3aed` | `#1e222d` | Series 5 / neutral fill |
| `--track` | `bg-track` | `#e2e8f0` | `#1e222d` | Progress/slider track |
| `--marker` | `bg-marker` | `#0f172a` | `#ffffff` | Slider/marker dot |

## 6. Placement tiers

| Token | Tailwind utility | Light | Dark | Usage |
|---|---|---|---|---|
| `--super-dream` | `text-super-dream`, `bg-super-dream` | `#ea580c` | `#f97316` | Super Dream tier (≥ ₹10 LPA) |
| `--dream` | `*-dream` | `#d97706` | `#f59e0b` | Dream tier (₹6–10 LPA) |
| `--standard` | `*-standard` | `#059669` | `#10b981` | Standard tier (₹4–6 LPA) |
| `--regular` | `*-regular` | `#0284c7` | `#38bdf8` | Regular tier |

## 7. Bloom levels

| Token | Tailwind utility | Light | Dark | Usage |
|---|---|---|---|---|
| `--bloom-cu` | `*-bloom-cu` | `#64748b` | `#94a3b8` | Conceptual Understanding (L1–2) |
| `--bloom-ap` | `*-bloom-ap` | `#059669` | `#10b981` | Application & Code Practice (L3–4) |
| `--bloom-as` | `*-bloom-as` | `#d97706` | `#f97316` | System Analysis & Debugging (L5–6) |
| `--bloom-ev` | `*-bloom-ev` | `#dc2626` | `#ef4444` | Evaluation & Architecture (L7–8) |
| `--bloom-cr` | `*-bloom-cr` | `#7c3aed` | `#a855f7` | Creation (L9–10) |

## 8. Sidebar (app shell)

| Token | Tailwind utility | Light | Dark | Usage |
|---|---|---|---|---|
| `--sidebar` | `bg-sidebar` | `#ffffff` | `#090a0d` | Sidebar background |
| `--sidebar-foreground` | `text-sidebar-foreground` | `#1e293b` | `#f3f4f6` | Sidebar text |
| `--sidebar-primary` | `bg-sidebar-primary` | `#4f46e5` | `#f97316` | Active item |
| `--sidebar-primary-foreground` | `text-sidebar-primary-foreground` | `#ffffff` | `#ffffff` | Text on active item |
| `--sidebar-accent` | `bg-sidebar-accent` | `#f1f5f9` | `#151720` | Hover item |
| `--sidebar-accent-foreground` | `text-sidebar-accent-foreground` | `#0f172a` | `#f3f4f6` | Text on hover item |
| `--sidebar-border` | `border-sidebar-border` | `#e2e8f0` | `#1a1d27` | Sidebar border |
| `--sidebar-ring` | `ring-sidebar-ring` | `#4f46e5` | `#f97316` | Sidebar focus ring |
| `--navy` | `*-navy` | `#0f172a` | `#f3f4f6` | High-contrast ink (inverts per theme) |

## 9. SCSS surface tokens (`src/styles/index.scss`)

Used through `tokens.scss` (`$color-bg`, `$color-primary`, ...) and the `.btn-primary` / `.btn-secondary` / `.btn-danger` classes.

| CSS var | SCSS alias | Light | Dark | Usage |
|---|---|---|---|---|
| `--bg-canvas` | `$color-bg` | `#f8fafc` | `#0b0c0e` | Page canvas |
| `--bg-surface` | `$color-bg-sidebar` | `#ffffff` | `#12141a` | Card / `@mixin card` |
| `--bg-sidebar` | | `#ffffff` | not set | Light-mode chrome |
| `--bg-overlay` | `$color-bg-panel` | `#ffffff` | `#171922` | Panels, card hover |
| `--bg-element` | `$color-bg-element` | `#f1f5f9` | `#1e222d` | Inputs, sunken areas, `.btn-secondary` |
| `--bg-active` | `$color-bg-active` | `rgba(79, 70, 229, 0.08)` | `rgba(249, 115, 22, 0.15)` | Selected item fill |
| `--border-subtle` | | `#f1f5f9` | not set | Subtle borders (light) |
| `--border-glow` | `$color-border-glow` | `rgba(79, 70, 229, 0.2)` | `rgba(249, 115, 22, 0.3)` | Focus/glow borders |
| `--brand-primary` | `$color-primary` | `#4f46e5` | `#f97316` | `.btn-primary` gradient start |
| `--brand-hover` | `$color-primary-hover` | `#4338ca` | `#fb923c` | `.btn-primary` gradient end / hover |
| `--brand-subtle` | `$color-primary-glow` | `rgba(79, 70, 229, 0.1)` | `rgba(249, 115, 22, 0.12)` | Brand tint backgrounds |
| `--accent-primary` | `$color-accent` | `#f59e0b` | `#f59e0b` | Secondary accent |
| `--accent-hover` | `$color-accent-hover` | `#d97706` | `#fbbf24` | Accent hover |
| `--accent-subtle` | | `rgba(245, 158, 11, 0.1)` | `rgba(245, 158, 11, 0.15)` | Accent tint |
| `--text-primary` | `$color-text` | `#0f172a` | `#f3f4f6` | Main text |
| `--text-secondary` | `$color-text-muted` | `#334155` | `#e2e8f0` | Secondary text |
| `--text-muted` | | `#64748b` | `#94a3b8` | Captions |
| `--text-disabled` | `$color-text-disabled` | `#94a3b8` | `#64748b` | Disabled text |
| `--color-rgb-text` | `$color-rgb-text` | `15, 23, 42` | `243, 244, 246` | For `rgba()` card tints (`$color-bg-card`) |

Both layers share the same brand: indigo `#4f46e5` in light mode and amber orange `#f97316` in dark mode.

## 10. Accent colors used on the landing page

The landing page (`src/features/landing/`) uses the semantic tokens above for all surfaces, text and borders, plus a fixed orange brand accent in both themes. Text accents get a darker shade in light mode for contrast:

| Purpose | Light | Dark | Tailwind |
|---|---|---|---|
| Brand accent text | `#ea580c` | `#fb923c` | `text-orange-600 dark:text-orange-400` |
| Brand accent text (soft) | `#c2410c` | `#fdba74` | `text-orange-700 dark:text-orange-300` |
| Badge / pill fill | `#f97316` @ 10% | same | `bg-orange-500/10 border-orange-500/30` |
| Hero gradient text | `#ea580c → #f59e0b → #ea580c` | `#fb923c → #fcd34d → #f97316` | `from-orange-600 via-amber-500 to-orange-600 dark:from-orange-400 dark:via-amber-300 dark:to-orange-500` |
| Secondary CTA gradient | `#f97316 → #f59e0b` | same | `from-orange-500 to-amber-500 text-zinc-950` |
| Success text | `#059669` | `#34d399` | `text-emerald-600 dark:text-emerald-400` |
| Warning text | `#d97706` | `#fbbf24` | `text-amber-600 dark:text-amber-400` |
| Error text | `#e11d48` | `#fb7185` | `text-rose-600 dark:text-rose-400` |

## 11. Radius and fonts (for reference)

`--radius: 0.75rem`; `rounded-sm/md/lg/xl/2xl/3xl/4xl` = radius −4px / −2px / 0 / +4px / +8px / +12px / +16px. Headings use `Outfit` (`font-heading`), body uses `Inter` (`font-sans`, `font-body`), code uses `JetBrains Mono`.
