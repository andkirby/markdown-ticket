# Design Tokens

Reference for CSS custom properties (design tokens) used in this project.

**Source of truth:** `src/index.css` lines 43-87

---

## Colors

Colors use HSL format for easy manipulation (opacity, etc.).

### Light Mode (Default)

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--background` | `0 0% 100%` | Page background |
| `--foreground` | `222.2 84% 4.9%` | Primary text |
| `--card` | `0 0% 100%` | Card backgrounds |
| `--popover` | `0 0% 100%` | Dropdown/popover bg |
| `--primary` | `221.2 83.2% 53.3%` | Primary actions (blue) |
| `--secondary` | `210 40% 96%` | Secondary elements |
| `--muted` | `210 40% 96%` | Muted backgrounds |
| `--muted-foreground` | `215.4 16.3% 46.9%` | Muted text |
| `--accent` | `210 40% 96%` | Accent backgrounds |
| `--destructive` | `0 84.2% 60.2%` | Errors, danger (red) |
| `--border` | `214.3 31.8% 91.4%` | Border color |
| `--ring` | `221.2 83.2% 53.3%` | Focus ring |

### Dark Mode

Applied via `.dark` class on root element. See `src/index.css` lines 67-87 for dark mode values.

**Key differences:**
- Background shifts to near-black (`222.2 84% 4.9%`)
- Text shifts to near-white (`210 40% 98%`)
- Primary becomes brighter (`217.2 91.2% 59.8%`)

---

## Usage

```css
/* In CSS */
.my-element {
  background: hsl(var(--primary));
  border-color: hsl(var(--border));
}

/* With opacity */
.my-element {
  background: hsl(var(--primary) / 0.5);
}
```

```tsx
/* In Tailwind */
<div className="bg-primary text-primary-foreground border-border" />
```

---

## Typography

### Font Families

| Usage | Font | Tailwind Class |
|-------|------|----------------|
| Body | Inter | `font-sans` |
| Code | JetBrains Mono | `font-mono` |

### Heading Scale

Defined in `@layer base` (index.css lines 104-130):

| Element | Size | Responsive |
|---------|------|------------|
| `h1` | `text-3xl` | `lg:text-4xl` |
| `h2` | `text-2xl` | `lg:text-3xl` |
| `h3` | `text-xl` | `lg:text-2xl` |
| `h4` | `text-lg` | `lg:text-xl` |
| `h5` | `text-base` | `lg:text-lg` |
| `h6` | `text-sm` | `lg:text-base` |

All headings: `font-semibold tracking-tight`

---

## Spacing

Uses Tailwind's default spacing scale (4px base unit):

| Token | Value |
|-------|-------|
| `1` | 4px |
| `2` | 8px |
| `3` | 12px |
| `4` | 16px |
| `6` | 24px |
| `8` | 32px |

---

## Border Radius

| Token | Value |
|-------|-------|
| `--radius` | `0.75rem` (12px) |

Tailwind classes: `rounded-sm`, `rounded`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`

---

## Z-Index Scale

| Layer | Value | Usage |
|-------|-------|-------|
| Base | 0 | Normal content |
| Dropdown | 50 | Dropdowns, popovers |
| Modal | 50 | Modal dialogs |
| Toast | 100 | Notifications |

See [MODALS.md](MODALS.md) for modal z-index conventions.

---

## Star Colors (Favorite Indicator)

Themeable star icon tokens for project favorites. Defined in `src/styles/entities/fav-star.css`.

### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--star-inactive-fill` | `transparent` | Empty star fill |
| `--star-inactive-color` | `gray-400` | Empty star stroke |
| `--star-hover-fill` | `yellow-500` | Hover fill (golden) |
| `--star-hover-color` | `yellow-600` | Hover stroke |
| `--star-active-fill` | `gray-400` | Favorited fill |
| `--star-active-color` | `gray-500` | Favorited stroke |
| `--star-active-hover-fill` | `yellow-500` | Favorited hover fill |
| `--star-active-hover-color` | `yellow-600` | Favorited hover stroke |
| `--star-chip-fill` | `gray-400` | Chip variant fill |
| `--star-chip-color` | `gray-500` | Chip variant stroke |

### Dark Mode

| Token | Value | Difference |
|-------|-------|------------|
| `--star-inactive-color` | `slate-500` | Darker gray |
| `--star-hover-fill` | `yellow-400` | Brighter yellow |
| `--star-active-fill` | `slate-500` | Darker gray |
| `--star-chip-fill` | `slate-500` | Darker gray |

### Usage

```tsx
import { Icon } from '../shared/Icon'

// Base star (unfavorited)
<Icon name="fav-star" className="fav-star" />

// Active/favorited
<Icon name="fav-star" className="fav-star active" />

// Chip variant (compact, rotated)
<Icon name="fav-star" className="fav-star fav-star--chip" />

// Card variant (inline)
<Icon name="fav-star" className="fav-star fav-star--card" />
```

**See also:** [STYLING.md](STYLING.md) - SVG icons pattern

