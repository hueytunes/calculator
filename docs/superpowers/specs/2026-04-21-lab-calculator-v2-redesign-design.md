# Lab Calculator Suite — v2 Redesign

**Date**: 2026-04-21
**Owner**: Huey Mysliwiec (Melo-Cardenas Lab)
**Status**: Draft for review

---

## 1. Summary

Rebuild of the existing Lab Calculator Suite as a modern, phone-first multi-screen web app (installable as a PWA) with:

- A brand-new **Recipe Builder** for multi-ingredient buffer prep
- A **preset system** that seeds the Recipe Builder with common buffer templates (Primer Mix, FACS, MACS, RIPA, Laemmli, etc.), extensible by dropping JSON into `js/presets.js`
- A full **visual redesign** to the "Soft Lab" aesthetic (cream/coral/sage warm palette, Plus Jakarta Sans, rounded cards, bouncy animations)
- A **multi-screen app architecture** ("App A" in brainstorming): tile-grid home, bottom tab bar, slide-in screen transitions
- **Tab consolidation**: 7 existing calculators reduced to 6 tiles by merging logical duplicates (Molarity + Mass/Vol/Conc → "Concentration"; Cell Seeding + Plate Seeding → "Seeding" with mode toggle)
- **Bug fix** for Serial Dosing silently swallowing parse errors in the mass field
- Retains all existing calculation math (no regressions)

The existing app at `index.html` + `js/*.js` is fully replaced. All existing math logic (`calculateDilution`, `calculateReconstitution`, etc.) is preserved — only the UI wrappers change.

## 2. Goals

- **Frictionless calculations on the bench** — fast, mobile-optimized, installable as a PWA
- **One place for any solution prep** — from a single dilution to a multi-ingredient buffer with mixed specification modes (stock, powder, %, MW, ratio, density)
- **Extensibility** — add new preset recipes by editing a single JSON file; calculator roster is easy to grow
- **Desktop-friendly** — phone layout scales comfortably on a laptop without a separate responsive rewrite

## 3. Non-Goals

Explicitly out of scope for this version:

- No backend, accounts, or cloud sync
- No export/import of recipes (can be added later)
- No collaboration, sharing, or multi-user features
- No automated test infrastructure (the math is deterministic and the existing functions work; we'll rely on manual smoke tests)
- No native app packaging (web + PWA is enough)
- No offline-first service-worker caching (current app doesn't have this; not adding)

## 4. App Architecture

### 4.1 Shell

The app is a **single-page** (`index.html`) with a **fixed shell** (status bar area + bottom tab bar) and a **screen viewport** in between. Only one screen is visible at a time; navigation swaps screens with slide transitions.

```
┌──────────────────────────────┐
│ [status bar]                 │  ← iOS-style safe area on mobile
├──────────────────────────────┤
│                              │
│      [current screen]        │  ← scrollable; screens swap via router
│                              │
│                              │
├──────────────────────────────┤
│ [Home] [Recipes] [Hist] [⚙]  │  ← bottom tab bar (fixed)
└──────────────────────────────┘
```

### 4.2 Top-level tabs (bottom bar)

| # | Tab | Icon concept | Content |
|---|---|---|---|
| 1 | **Home** | house | Tile grid of 6 calculators + "Continue last recipe" hero card (shown only if an unfinished recipe exists) |
| 2 | **Recipes** | flask | User's saved recipes + built-in preset templates |
| 3 | **History** | clock | Auto-logged recent calculations (last 50) |
| 4 | **Settings** | gear | Theme (light/dark/auto), default volume unit, default diluent, about |

### 4.3 Calculator roster (the 6 tiles on Home)

| # | Tile | Derived from | Notes |
|---|---|---|---|
| 1 | **Dilution** | existing `calculateDilution` | Redesigned UI only |
| 2 | **Concentration** | merged `calculateMolarityCalc` + `calculateMVC` | "Solve for" selector handles mass, volume, or concentration. Unit dropdown spans both mass/vol and molar. MW input becomes required only when a molar unit is chosen. |
| 3 | **Reconstitution** | existing `calculateReconstitution` | Redesigned UI only |
| 4 | **Seeding** | merged `calculateCellSeeding` + `calculatePlateSeeding` | Mode toggle at top: "Single suspension" (cell seeding) / "Plate master mix" (plate seeding). UI below the toggle swaps accordingly. Cell-concentration and seeding-density inputs use a **mantissa × 10ⁿ** control (see §5.5) so you can type "1.1" + pick "×10⁶" to mean 1.1 × 10⁶ cells/mL, matching how counter readouts are displayed. |
| 5 | **Serial Dosing** | existing `calculateSerialDose` (with bug fix — see §9) | Redesigned UI; error handling fixed |
| 6 | **Recipe Builder** | brand new | See §6 |

### 4.4 Navigation model

- **Home tile tap** → target calculator screen slides in from the right (340ms, `cubic-bezier(0.22, 1, 0.36, 1)`). Back arrow in the screen header slides it back out left.
- **Bottom tab tap** → fade-swap between top-level screens (no slide), current screen scrolls to top.
- **Recipe preset tap** → opens Recipe Builder pre-filled with the preset's ingredients.
- **Back gesture / swipe-from-left** (nice-to-have, not blocking) — native browsers' back button mirrors the in-app back arrow.

Screen management is a small hand-rolled router in `js/router.js` — no framework, just show/hide classes on screen containers.

## 5. Visual design system

### 5.1 Palette (light mode)

```
--cream        #fbf6ef   page background
--cream-deep   #f3ebdd   subtle card fills / tab rail
--card         #ffffff   elevated card surface
--ink          #2a1f14   primary text
--ink-soft     #6d5c48   secondary text
--ink-faint    #ab9c87   tertiary text / subtle borders
--coral        #e56a4f   primary accent (actions, highlighted tile)
--coral-deep   #c95435   pressed / heading accent
--coral-soft   #fde3da   accent background
--sage         #8fa67e   secondary accent (diluent "fill to volume")
--sage-soft    #dfe8d6
--sky          #7a9dc0   tile icon bg
--sky-soft     #dce8f4
--lavender     #a793c5   tile icon bg
--lavender-soft #e8dff2
--butter       #e8c770   tile icon bg
--butter-soft  #faefcf
--pink, --mint — additional tile icon bgs
```

Dark mode inverts with a warm dark variant — deep cream `#1f1812` bg, text stays ink-family. No cool/blue darks.

### 5.2 Typography

- **Plus Jakarta Sans** (Google Fonts) — weights 400/500/600/700/800
- Tabular numerics for all displayed amounts (`font-variant-numeric: tabular-nums`)
- Headings use tighter letter-spacing (`-0.02em` to `-0.035em`)

### 5.3 Component tokens

- Cards: `border-radius: 18–24px`; soft layered shadows
- Inputs: 2px-transparent border → coral on focus with 5px coral-soft ring
- Bouncy easing for UI (`cubic-bezier(0.34, 1.56, 0.64, 1)`); smooth easing for screen transitions (`cubic-bezier(0.22, 1, 0.36, 1)`)
- Tile icons: 44×44 rounded square with soft-tone background + colored glyph/emoji

### 5.4 Number inputs (consistent across the app)

All numeric inputs use `<input type="number" inputmode="decimal" step="any">`:

- Mobile shows the numeric keypad automatically
- Desktop-browser spinner arrows are hidden via CSS
- Accepts plain decimals (`1.25`, `0.02`)
- Accepts native scientific notation (`1e6`, `2.5e-4`) — the browser's parseFloat handles this
- **Does not** accept fuzzy suffixes (`25k`, `2.5 million`, `3x10^5`). These were error-prone in v1 and are removed.

The existing `parseScientific` function is simplified to a thin `parseFloat(value)` wrapper with validation. The regex-based suffix replacements are deleted. All placeholders are updated to drop suffix examples (e.g., `e.g. 10 or 1e6` stays; `e.g. 25k or 2.5 million` is removed).

### 5.5 Cell-count input component

A reusable compound control for cell-concentration and seeding-density fields:

```
  Stock cell concentration
  ┌──────────────┬─────────┐
  │ 1.1          │ × 10⁶ ▼ │  cells/mL
  └──────────────┴─────────┘
```

- Left: plain number input for the **mantissa** (e.g., `1.1`)
- Right: dropdown for the **exponent**, options: `× 10²`, `× 10³`, `× 10⁴`, `× 10⁵`, `× 10⁶`, `× 10⁷`, `× 10⁸` (default `× 10⁶` for stock concentrations; `× 10³` for cm² densities)
- Unit label (`cells/mL` or `cells/cm²`) is static next to the control
- Parser reads the two values and returns `mantissa × 10^exponent`
- Used in: **Seeding** (stock conc, target conc, plate density)

This matches the display on standard cell counters (Countess, Nexcelom, hemocytometer readout) so there's no mental math at the bench.

### 5.6 Desktop behavior (option "C")

- Content is max-width **640px** and centered
- Bottom tab bar stays at the bottom; structure is identical to mobile
- Typography and padding scale up slightly at ≥ 900px viewport for comfortable reading
- Decorative gradient glow in the page background at wide widths so it doesn't look like a lost phone viewport

## 6. Recipe Builder

### 6.1 Data model

```js
// One ingredient in a recipe
{
  id: "ing-abc123",               // stable local id
  name: "EDTA",
  source: "liquid-stock",         // see §6.2 for allowed values
  sourceInputs: {                 // depends on source type
    stockValue: 1,                // e.g., "1" for 1 M stock
    stockUnit: "M"
  },
  targetInputs: {                 // what you want in the final
    value: 25,
    unit: "mM"                    // any unit from the global unit palette
  },
  mw: null                        // required only if source or target is molar without a direct number
}

// A recipe
{
  id: "rec-xyz789",
  name: "FACS Buffer",
  icon: "flask",                  // emoji or key
  finalVolume: { value: 50, unit: "mL" },
  diluent: "PBS",                 // one of preset list or "custom"
  customDiluent: null,
  ingredients: [ /* array of ingredient objects */ ],
  createdAt: "2026-04-21T10:00:00Z",
  updatedAt: "2026-04-21T10:05:00Z",
  isPreset: false,                // true only for built-in templates
  presetId: null                  // if spawned from a preset
}
```

### 6.2 Ingredient specification modes

| `source` value | Description | Required fields | MW required? |
|---|---|---|---|
| `liquid-stock` | Liquid stock with known concentration | `stockValue`, `stockUnit`, target concentration | Only if the stock unit and target unit are in different families (e.g., stock in mg/mL, target in mM) |
| `powder-mw` | Solid powder; you know MW | target concentration | Yes |
| `powder-mass` | Solid powder; weigh directly | target % w/v, % w/w, or direct mass | No |
| `x-concentrated` | ×-concentrated stock (e.g., 10×) | stock × factor, target × factor | No |
| `pure-liquid-density` | Pure liquid (e.g., β-mercaptoethanol, glycerol) | density (g/mL), target concentration | Only for molar targets |
| `ratio-dilution` | 1:X dilution | ratio X | No |

### 6.3 Target (final concentration) unit palette

Same palette used consistently across the whole app:

- **Molar**: M, mM, µM, nM, pM, fM
- **Mass/Volume** (15 combinations): g/L, g/mL, g/µL, mg/L, mg/mL, mg/µL, µg/L, µg/mL, µg/µL, ng/L, ng/mL, ng/µL, pg/L, pg/mL, pg/µL
- **Percentage**: % w/v, % v/v, % w/w
- **Factor**: 1×, 10×, 100×, 1000×, custom ×
- **Activity**: U/mL, mU/mL, IU/mL, kIU/mL
- **Direct mass**: g, mg, µg, ng, pg
- **Direct volume**: L, mL, µL, nL, pL

Some of these are numerically identical (e.g., µg/mL ≡ ng/µL) but listed separately so the user doesn't convert at the bench. Parsing layer normalizes everything to base units (mg/mL for mass/vol, M for molar, µL for volume, mg for mass).

### 6.4 Ratio convention

**1:X = 1 part stock in X parts total** (textbook convention). Example: 1:100 of a 10 mL final volume = 100 µL stock + 9,900 µL diluent.

### 6.5 Diluent

A single diluent fills the balance to final volume. Options:
- PBS, Water (ddH₂O), Tris buffer, Media, Custom…

Custom diluent takes a free-text label and is purely cosmetic (doesn't affect math — the diluent is always "fill to final volume").

### 6.6 Computation flow

When user taps "Calculate" (or on live-edit):

1. For each ingredient, resolve source and target into **base units** (mg/mL or M after MW conversion, etc.)
2. Calculate amount to add (volume for liquid sources, mass for powders)
3. Compute cumulative ingredient volume (only for liquid sources + pure-liquid sources)
4. `diluentVolume = finalVolume - cumulativeLiquidVolume`
5. If `diluentVolume < 0` → warning: ingredients exceed final volume
6. If any target-vs-source unit family mismatch requires MW and MW is missing → inline error on that ingredient row
7. Protocol rendered as an ordered list of steps (powders first, then liquids, then "fill with diluent", then "mix/filter")

### 6.7 Preset system

Presets are recipe objects with `isPreset: true`, stored in `js/presets.js` as a JSON array. Launch presets:

1. **Primer Mix** — 2 primer rows (`liquid-stock`, 100 µM default, target 10 µM each), diluent ddH₂O, final 100 µL
2. **FACS Buffer** — EDTA 25 mM from 1 M stock + BSA 0.02% w/v from powder + PBS to 50 mL
3. **MACS Buffer** — BSA 0.5% w/v + EDTA 2 mM from 0.5 M stock + PBS to 500 mL
4. **RIPA Lysis** — standard RIPA components
5. **Laemmli (4×) Loading Dye** — Tris-HCl, glycerol, SDS, β-ME, BPB

User-saved recipes live alongside presets in the Recipes tab, visually identical, but presets are read-only (tapping them opens an editable copy).

Adding more presets later is a code change limited to `js/presets.js` — no other file edits required.

### 6.8 UX shape

**Home tile "Recipe Builder" tap** → Recipe Builder screen opens showing:
- Top bar: "New recipe" name input + final volume + diluent
- Row: "Use a preset" chip row (horizontal scroll of presets)
- Below: empty "Add ingredient" dashed button

Tapping a preset chip fills ingredients from the preset (the recipe becomes "New recipe from Primer Mix") — user can edit freely before saving.

**Recipes tab** shows two sections:
- "Your recipes" (user-created saved recipes, sorted by most recent)
- "Templates" (preset library)

Both sections use identical cards (icon + name + ingredient count + total volume + diluent). Tap any card → opens Recipe Builder pre-filled.

## 7. Data persistence

All data lives in `localStorage`. No cloud, no export. Three keys:

| Key | Shape | Notes |
|---|---|---|
| `labcalc.recipes` | `Recipe[]` | User's saved recipes. Sorted in-memory by `updatedAt` desc. |
| `labcalc.history` | `HistoryEntry[]` | Auto-logged calc results. Capped at **50 entries**, oldest trimmed on insert. |
| `labcalc.settings` | `Settings` | `{ theme, defaultVolumeUnit, defaultDiluent }` |

```js
// HistoryEntry
{
  id: "hist-abc",
  tool: "dilution",                    // one of the 6 calculator keys or "recipe"
  toolLabel: "Dilution",
  inputs: { /* arbitrary snapshot */ },
  result: { /* arbitrary snapshot */ },
  summary: "10 M → 1 M · 100 mL → 10 mL stock + 90 mL diluent",
  timestamp: "2026-04-21T10:00:00Z"
}
```

Wrapper functions in `js/storage.js` — never call `localStorage` directly elsewhere.

## 8. Technical stack

- **Vanilla JS ES modules** (same as current) — no build tooling, no framework
- **Tailwind via CDN** (same as current) + a small custom `css/theme.css` for design tokens
- **Plus Jakarta Sans** via Google Fonts
- **PWA preserved** — keep existing `manifest.json` and `logo.png`; refresh colors if needed

## 9. Bug fix: Serial Dosing error swallowing

**Root cause** (in current `calculators.js:225`):

```js
const finalMass_mg = parseToBase(value, unit, massToBase, 'mass') * 1000;
```

When `parseToBase` returns `{ error: "…" }`, `{ error } * 1000` → `NaN`, which silently passes the `finalMass_mg.error` check on line 232. `NaN` propagates downstream and surfaces as the misleading "Cannot find a practical dilution protocol within 10 steps" error.

**Fix**: validate before multiplying.

```js
const finalMass_g = parseToBase(value, unit, massToBase, 'mass');
if (finalMass_g.error) { showError(errorEl, finalMass_g.error); return; }
const finalMass_mg = finalMass_g * 1000;
```

Same pattern audit applied to all other `parseToBase(...) * k` sites.

### 9.1 Cosmetic fixes bundled with this work

- Dilution result display shows the user's selected final-volume unit (currently always prints "mL" / "µL" regardless of whether the user picked L)
- Serial Dosing result box uses the shared green result style (currently uses indigo, inconsistent with other calculators)

## 10. File structure

```
calculator-main/
├── index.html                 (rewritten shell)
├── manifest.json              (kept; theme_color may update)
├── logo.png                   (kept)
├── css/
│   └── theme.css              (NEW — design tokens, base components)
├── js/
│   ├── main.js                (entry point — init router, load data, first-screen render)
│   ├── router.js              (NEW — screen nav + slide transitions)
│   ├── storage.js             (NEW — localStorage wrappers)
│   ├── presets.js             (NEW — preset recipe JSON array)
│   ├── recipe.js              (NEW — Recipe Builder model + compute)
│   ├── calculators.js         (refactored — pure math, no DOM)
│   ├── ui.js                  (kept, updated — theme, common components)
│   ├── utils.js               (kept, extended — more unit conversions)
│   └── screens/
│       ├── home.js            (NEW — tile grid + continue hero)
│       ├── recipes.js         (NEW — list of saved + presets)
│       ├── history.js         (NEW — activity feed)
│       ├── settings.js        (NEW — preferences)
│       ├── dilution.js        (NEW — Dilution calc UI)
│       ├── concentration.js   (NEW — merged Molarity + MVC)
│       ├── reconstitution.js  (NEW)
│       ├── seeding.js         (NEW — merged Cell + Plate with mode toggle)
│       ├── serial.js          (NEW — Serial Dosing UI + bug fix)
│       └── builder.js         (NEW — Recipe Builder UI)
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-04-21-lab-calculator-v2-redesign-design.md   (this file)
```

**Separation of concerns**: math logic in `js/calculators.js` and `js/recipe.js` is DOM-free and returns result objects; screen modules consume those results and render them.

## 11. Open questions / risks

- **Emoji icons vs SVG** — we're currently leaning on emoji for calculator tile icons (💧, ⚖️, 🧴, etc.). They look warm and render consistently, but emoji style varies by OS. Acceptable for v2; can upgrade to SVG later if we want pixel-perfect consistency.
- **`localStorage` quota** — 5MB is plenty for recipes + history. Not a concern.
- **PWA cache invalidation** — since we're not adding a service worker, users always see the latest HTML on page load. No versioning needed.
- **Keyboard on mobile** — resolved: all inputs are `type="number" inputmode="decimal"`. Numeric keypad auto-displays on mobile; scientific notation via `e` still works natively; custom `k/million/x10^` parsing is removed (see §5.4). Cell-specific inputs use the mantissa × exponent dropdown (§5.5).

## 12. Success criteria

- All 6 calculators produce identical numerical results to the current v1 app for equivalent inputs (regression-safe)
- Serial Dosing shows the correct error message when mass input is empty or invalid (instead of the misleading "cannot find protocol" error)
- Recipe Builder can fully produce the FACS Buffer example protocol we mocked up
- Primer Mix preset populates the Recipe Builder correctly for 2 primers at 10 µM each in 100 µL ddH₂O
- Saved recipes and history survive page refresh
- App installs as a PWA on iOS Safari and looks correct on a phone
- Desktop (MacBook Chrome) shows the app centered with comfortable padding; no broken layout
- Numeric keypad auto-displays on mobile for all input fields (via `type="number" inputmode="decimal"`)
- Seeding calculator's cell-concentration input accepts `1.1` + `×10⁶` and computes the same result as a v1 input of `1.1e6` or `1100000`
- Invalid legacy inputs like `25k` or `2.5 million` are rejected (with a clear "enter a number" message) — the removal of fuzzy parsing is verified
