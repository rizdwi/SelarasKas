# SelarasKas — Full CSS / HTML / Config Audit Report

**Generated:** September 28, 2026  
**Scope:** All CSS (8 files), HTML (3 files), PHP partials (5 files), vercel.json

---

## 1. CSS SYNTAX ERRORS & BROKEN RULES

### 🔴 CRITICAL: Dangling `-webkit-` prefixes (syntax errors)

| File | Line | Issue |
|------|------|-------|
| `css/modern-ui.css` | L112–113 | Lone `-webkit-` before `transition:` — produces an invalid CSS declaration that browsers silently discard. The entire rule block for `.social-btn, .otp-back-btn, ...` may be partially broken. |
| `css/modern-ui.css` | L207–208 | Same dangling `-webkit-` inside `.day-night-toggle` rule. |
| `css/modern-ui.css` | L366 | Lone `-webkit-` inside `.upgrade-overlay` — the `align-items` and `justify-content` that follow may be silently dropped by some parsers. |
| `css/pages.css` | L530 | `.bottom-nav` has `-webkit-` dangling before `border-top`. |

**Fix:** Remove the stray `-webkit-` fragments or complete them (e.g., `-webkit-backdrop-filter: blur(...);`).

---

## 2. CSS CONFLICTS & SPECIFICITY WARS

### 🔴 `.bottom-nav` declared then forcibly hidden
- **`pages.css` L526–548** — `.bottom-nav` is fully styled (position absolute, flex layout, padding, background).
- **`modern-ui.css` L850** — `.bottom-nav { display: none !important; }` kills it entirely.
- **`modern-ui.css` L770** — Also sets `.bottom-nav { background: var(--bg-card) !important; ... box-shadow: none !important; }`.
- **Result:** ~25 lines of dead CSS in pages.css. The `bottom-nav` element still exists in `app_layout.php` (L473–504) and renders as hidden. This is ~1.5 KB of CSS + HTML that do nothing.

### 🟡 `.day-night-toggle` dimension conflicts
- **`components.css` L381–394** — Sets `width: 44px; height: 24px; border-radius: 12px`.
- **`pages.css` L50–64** — Resets to `width: 80px; height: 36px; border-radius: 18px`.
- **`modern-ui.css` L199–208** — Overrides again to `width: 68px; height: 34px; border-radius: 999px`.
- **Winner:** `modern-ui.css` (loaded last via `index.css` import order). But `pages.css` defines `toggle-knob` positions for `width: 80px`, while `modern-ui.css` sizes the knob for `width: 68px` — **the knob positioning conflicts** with the `pages.css` toggle-knob `left: 48px` vs `modern-ui.css` toggle-knob `left: 35px`.

### 🟡 `.biometric-toggle` dimension conflicts
- **`components.css`** — `width: 44px; height: 24px`; knob `width: 18px; left: 22px` when active.
- **`modern-ui.css`** — `width: 58px; height: 32px`; knob `width: 26px; left: 29px` when active.
- Same-source-order resolution, but inner knob positions from `components.css` are still partially applied.

### 🟡 `.auth-submit-btn` background conflicts
- **`components.css` L111** — `background: var(--accent-gradient)`.
- **`modern-ui.css` L57** — Overrides to `background: linear-gradient(135deg, #ff5f73 0%, #ff8a55 54%, #ffd166 100%)`.
- Different color scheme between files for the same button.

### 🟡 `.nav-item.active` color conflicts
- **`pages.css` L542** — `color: var(--accent-coral)` (soft pink/salmon).
- **`modern-ui.css` L314–318** — `color: #fff; background: linear-gradient(...)`.
- The `modern-ui.css` version wins; pages.css rule is dead.

### 🟡 `.transaction-item` display conflict
- **`pages.css` L302–307** — `display: flex`.
- **`utilities.css` L66–71** — `display: block; padding: 0` (for swipe-to-delete).
- This is intentional (swipe wraps content in `.transaction-content`), but makes the `pages.css` display rule dead.

### 🟡 Excessive `!important` usage
Found **40+ uses of `!important`** across the CSS files. Worst offenders:
- `modern-ui.css` L770: 4 `!important` in a single compressed line
- `utilities.css`: icon color overrides with `!important` on `color`, `stroke`, `stroke-width`, `filter`
- `components.css`: multiple `!important` on `.select-category-trigger`, `.input-with-icon`

---

## 3. RESPONSIVE DESIGN ISSUES

### 🔴 `responsive.css` is nearly empty (6 lines total)
```css
@media (max-width: 380px) {
    .amount { font-size:26px; }
    .spending-overview { flex-direction:column; }
}
```
Only covers screens ≤380px. No tablet breakpoints, no landscape handling.

### 🟡 Breakpoints scattered across files instead of consolidated
- `modern-ui.css` L514: `@media (max-width: 680px)` — pricing cards
- `modern-ui.css` L790, L800, L830–839, L860: `@media (min-width: 768px)` — desktop layout
- `utilities.css` L255: `@media (max-width: 360px)` — small phone
- `pages.css`: No responsive rules at all (683 lines)

### 🟡 `body { overflow: hidden }` in `base.css`
This prevents the body from scrolling. Combined with `min-height: 100vh`, this works for a single-screen PWA, but if the auth screen content overflows on small screens, users can't scroll — partially mitigated by `modern-ui.css` L30 adding `overflow-y: auto` to `.auth-screen`.

### 🟡 `user-scalable=no` in viewport meta
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```
**Accessibility violation:** Prevents pinch-to-zoom, which violates WCAG 2.1 SC 1.4.4. This is common in PWAs but penalizes users with low vision.

---

## 4. UNUSED / DEAD CSS

| Rule / Block | File | Reason |
|---|---|---|
| `.bottom-nav` full styling (~25 lines) | `pages.css` L526–548 | Hidden by `display: none !important` in `modern-ui.css` |
| `.toggle-stars, .shooting-star, .toggle-clouds, .sun-rays { display: none; }` | `components.css` L430 | These elements are visually hidden by components.css, but then re-shown by pages.css with full animations (stars, clouds, craters). The components.css hide rule is dead because pages.css re-styles them. |
| `.status-bar` | `pages.css` L6–12 | HTML comment says "Status Bar Removed" in app_layout.php L52 |
| `.header`, `.header-left`, `.avatar` (old header) | `pages.css` L27–35 | Replaced by `.global-header` in modern-ui.css |
| `.main-app { display: none; }` | `pages.css` L2 | Conflicts with `modern-ui.css` L784–788 which also defines `.main-app` |
| `.day-night-toggle` sizing in `components.css` | components.css L381–394 | Fully overridden by pages.css and modern-ui.css |
| `.nav-item.active::before` indicator | `pages.css` L544–548 | Hidden by `modern-ui.css` L320–322 `display: none` |
| `--color-primary` referenced | `components.css` L231 | Variable **never defined** in `variables.css` — the accent color checkbox uses an undefined variable |

### Missing Variable: `--color-primary`
- Referenced in: `components.css` L231 (checkbox accent-color), `pages.css` L60, L67, L82, L94, L97, L98, L101 (OTP section), and `modals.php` inline styles (`var(--color-primary)`).
- **Not defined** in `variables.css` (neither light nor dark theme). Falls back to `initial`.
- Likely should be `--accent-coral` or `--color-info` (#818cf8).

### Missing Variables: `--border-color`, `--bg-color`, `--text-color`, `--color-primary`
- Used extensively in inline styles in `modals.php` and `app_layout.php`.
- `--border-color` → used in `admin.html` inline styles. Not in `variables.css`.
- `--bg-color` → used in support modal inline styles. Not in `variables.css`.
- `--text-color` → used in support modal. Not in `variables.css`.

---

## 5. PERFORMANCE ISSUES

### 🟡 CSS loaded via `@import` chain (render-blocking waterfall)
`index.css` uses 8 `@import` statements. Each is a sequential HTTP request:
```
index.css → variables.css → base.css → layout.css → components.css → pages.css → responsive.css → utilities.css → modern-ui.css
```
**Impact:** 9 sequential CSS requests before first paint. Should be concatenated or use `<link>` tags in parallel.

### 🟡 Total CSS size: ~87 KB across 8 files
- `pages.css`: 31.5 KB (largest)
- `modern-ui.css`: 26.4 KB
- `utilities.css`: 15.4 KB
- `components.css`: 11.4 KB

Not excessive, but dead CSS (estimated ~8–10 KB) could be pruned.

### 🟡 Heavy animation overhead
- 12 `@keyframes` animations defined
- `biometricPulse` runs infinitely on the biometric button
- `crownBounce` runs infinitely on the crown emoji
- `otpPulse` runs infinitely
- `twinkle` runs on 5 stars simultaneously
- Good: `@media (prefers-reduced-motion: reduce)` is implemented in modern-ui.css L343–351.

### 🟡 Multiple external script/style resources
- `chart.js` from CDN (defer) — ~200 KB
- Google Sign-In SDK (async defer)
- Google Fonts (Inter) — only in `admin.html`, not in main app
- 18 JS files loaded individually — should be bundled

### 🟡 Scrollbar hiding
```css
::-webkit-scrollbar { display: none; }
.page { scrollbar-width: none; }
```
Globally hidden scrollbars can confuse users about scrollable content. Accessibility concern.

---

## 6. ACCESSIBILITY ISSUES

### 🔴 Color Contrast Concerns

| Element | Foreground | Background | Ratio (est.) | WCAG AA |
|---|---|---|---|---|
| `.text-muted` (light theme) | `#9ca3b4` | `#FAFAF7` | ~2.9:1 | ❌ Fail (needs 4.5:1) |
| `.text-muted` (dark theme) | `#64748b` | `#121418` | ~3.8:1 | ❌ Fail |
| `.greeting-text` | `#9ca3b4` / muted | `#FAFAF7` | ~2.9:1 | ❌ Fail |
| `.balance-label` | `rgba(255,255,255,0.5)` | `#1e1b4b` | ~3.5:1 | ❌ Fail |
| `.balance-action-btn span` | `rgba(255,255,255,0.45)` | `#1e1b4b` | ~3.0:1 | ❌ Fail |
| `.transaction-time` | `--text-muted` | background | Marginal | ⚠️ |
| `.auth-divider` | `--text-muted` @ 11px | background | Small text needs 4.5:1 | ❌ Fail |

### 🔴 Focus Visibility
- `modern-ui.css` L39–48: `button:focus-visible { outline: none; box-shadow: var(--focus-ring) }` — the focus ring is `rgba(255, 107, 107, 0.22)` which is very subtle and may not be visible, especially on light backgrounds.
- `.form-group input:focus` uses `box-shadow: 0 0 0 3px rgba(52,211,153,0.1)` — nearly invisible at 10% opacity.

### 🟡 Missing ARIA / Semantic Issues
- Buttons that act as toggles (`.biometric-toggle`, `.day-night-toggle`) use `<div>` elements, not `<button>` with `role="switch"` and `aria-checked`.
- The `aria-label` attributes exist on some toggles (good), but the actual elements are `<div>` not interactive HTML elements.
- `.nav-item` buttons lack `aria-current="page"` for the active state.
- OTP inputs lack `aria-label` for screen readers.

### 🟡 Form Labels
- All form inputs have associated `<label>` elements with proper `for` attributes ✅
- Password toggle buttons have no `aria-label` describing their purpose.

---

## 7. HTML VALIDITY ISSUES

### 🔴 `admin.html` — XSS vulnerability
```javascript
tbody.innerHTML = dataU.users.map(u => `
    <tr>
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        ...
```
User data (`u.name`, `u.email`) is interpolated directly into innerHTML without escaping. If any user name/email contains HTML/script tags, this is a stored XSS vector.

### 🟡 `admin.html` — References undefined CSS variables
- `var(--border-color)` — not defined in `variables.css`. Uses `--border-subtle` and `--border-light` instead.
- `var(--color-primary)` — not defined.

### 🟡 `data-deletion.html` and `privacy.html`
- Use their own inline `:root` variables that differ from the main app's design system.
- Dark-mode only — no light theme support (inconsistent with main app's light-default).
- Missing `<meta name="description">` for SEO.
- Missing `lang` attribute value inconsistency — these use `lang="id"` (correct) but `data-theme` is missing.

### 🟡 `head.php` — Unclosed comment
Line 12: `<!-- iOS PWA Support -->` — the closing `--` is malformed as `-- >`. Actually it's `-->` which is fine. But line 12 shows `<!-- iOS PWA Support -->` — wait, re-checking: `<!-- iOS PWA Support -->` — this is correct.

### 🟡 Duplicate navigation
The app renders **two** complete navigations:
1. `.main-nav` (sidebar/top nav) in `app_layout.php` L4–25
2. `.bottom-nav` in `app_layout.php` L473–504

The `.bottom-nav` is hidden via `display: none !important` in CSS but the HTML is still downloaded and parsed. Wasted ~2 KB of HTML.

### 🟡 Inline styles overload
`app_layout.php` contains extensive inline `style=""` attributes:
- L29: Avatar with 8 inline style properties
- L31–35: Wallet selector wrapper with 7 inline properties
- L39: Push notification wrapper with 5 inline properties
- L109–121: Gamification card with ~15 inline style properties
- L507–528: AI Chat FAB and panel with ~40 inline style properties

These inline styles are hard to maintain and override, defeating the purpose of CSS files.

---

## 8. SEO / PWA META TAGS

### Main App (`head.php`)
| Meta Tag | Status |
|---|---|
| `charset` | ✅ UTF-8 |
| `viewport` | ✅ Present (but `user-scalable=no` is an a11y issue) |
| `title` | ✅ "Selaraskas — Personal Finance" |
| `description` | ✅ Present |
| `theme-color` | ✅ `#0a0e1a` (but app defaults to light theme — mismatch) |
| `manifest.json` | ✅ Linked |
| `apple-mobile-web-app-capable` | ✅ |
| `apple-mobile-web-app-status-bar-style` | ✅ `black-translucent` |
| `apple-touch-icon` | ✅ |
| `favicon` | ✅ |
| `og:title` | ❌ Missing |
| `og:description` | ❌ Missing |
| `og:image` | ❌ Missing |
| `og:url` | ❌ Missing |
| `twitter:card` | ❌ Missing |
| `robots` | ❌ Missing |
| `canonical` | ❌ Missing |
| `apple-touch-startup-image` | ❌ Missing (needed for iOS splash) |

### 🟡 Theme-color mismatch
`<meta name="theme-color" content="#0a0e1a">` is a dark color, but the app now defaults to `data-theme="light"` with `--bg-primary: #FAFAF7`. The browser chrome will show dark while the page is light.

### `admin.html`
| Tag | Status |
|---|---|
| `description` | ❌ Missing |
| `theme-color` | ❌ Missing |
| `og:*` | ❌ Missing |
| `favicon` | ❌ Missing (unlike other pages) |

### `privacy.html` / `data-deletion.html`
| Tag | Status |
|---|---|
| `description` | ❌ Missing |
| `theme-color` | ❌ Missing |
| `og:*` | ❌ Missing |
| `favicon` | ✅ Present |

---

## 9. VERCEL.JSON ROUTING ANALYSIS

### Configuration
```json
{
  "version": 2,
  "functions": {
    "api/index.php": { "runtime": "vercel-php@0.9.0" }
  },
  "routes": [...]
}
```

### ✅ Correct
- Static assets (css/, js/, icons/, assets/) are served directly.
- `manifest.json`, `sw.js`, `index.css` explicitly routed.
- Static HTML pages (`admin.html`, `privacy.html`, `data-deletion.html`) routed.
- API catch-all `/api/(.*)` → `api/index.php` (PHP serverless).
- Final catch-all `/(.*)`→ `api/index.php` (SPA fallback).
- Route order is correct (specific before catch-all).

### 🟡 Issues
1. **Only `api/index.php` declared as a function** — if `api/admin.php` exists as a separate file (referenced in `admin.html` L60, L78), it won't be deployed as a serverless function. Either:
   - `api/admin.php` requests are caught by `/api/(.*)` → `api/index.php` (the router must internally dispatch), or
   - `api/admin.php` needs its own function declaration.
   
2. **`vercel-php@0.9.0`** — verify this is the latest stable version; 0.9.x was current circa early 2025.

3. **Missing `headers` configuration** — no cache-control headers for static assets. CSS/JS files use `?v=52` cache-busting but could benefit from immutable caching headers.

4. **No `rewrites` config** — uses legacy `routes` (Vercel v2 supports both, but `rewrites` is preferred for newer projects).

5. **`qris.jpeg` explicitly routed** — works, but this is a payment QR code image that probably shouldn't be publicly discoverable via direct URL.

---

## 10. SUMMARY: PRIORITY FIXES

### 🔴 Critical (fix immediately)
1. **Remove dangling `-webkit-` syntax errors** in modern-ui.css (4 locations)
2. **Define `--color-primary` CSS variable** in variables.css (referenced ~15 times, currently undefined)
3. **Fix XSS in admin.html** — escape user data before innerHTML insertion
4. **Fix theme-color meta** — should be `#FAFAF7` for light default or use JS to update dynamically

### 🟠 Important (fix soon)
5. **Define missing CSS variables**: `--border-color`, `--bg-color`, `--text-color`
6. **Remove dead `.bottom-nav` HTML** from app_layout.php (or remove the CSS that hides it)
7. **Consolidate `.day-night-toggle` sizing** — pick one source of truth
8. **Improve color contrast** for muted text (at least 4.5:1 ratio)
9. **Add OG meta tags** for social sharing
10. **Replace `@import` chain** with parallel `<link>` tags or CSS bundling

### 🟡 Recommended
11. Remove `user-scalable=no` from viewport meta
12. Add `role="switch"` and `aria-checked` to toggle elements
13. Move inline styles from app_layout.php to CSS classes
14. Add cache-control headers in vercel.json
15. Bundle JS files (18 individual requests)
16. Prune ~8–10 KB of dead CSS
17. Reduce `!important` usage (40+ instances)
