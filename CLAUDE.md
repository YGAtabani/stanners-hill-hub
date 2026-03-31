# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Private estate management dashboard for Stanners Hill House, Chobham, Surrey.
Single-page app with vanilla HTML/CSS/JS + Chart.js (CDN).
No build tools, no bundler, no framework — open the HTML file directly or serve it.

## Deployment
- GitHub: https://github.com/YGAtabani/stanners-hill-hub
- Live: https://stanners-hill-hub.vercel.app
- Auto-deploys on push to main (static hosting, no server)

## Development
No install or build step. To preview locally:
```
python3 -m http.server 8000
# or
npx serve .
```
A local server is needed because the app fetches JSON from `/data/`.

## Architecture

### File structure
```
stanners-hill-hub/
├── index.html              HTML structure only (~240 lines)
├── css/
│   ├── tokens.css          Theme variables (dark/light), reset, scrollbar
│   ├── components.css      Reusable UI: topbar, nav, cards, stats, badges, tables, grids, charts, gauges
│   └── pages.css           Page-specific styles: hero, calendar, inventory, gallery, etc. + responsive
├── js/
│   ├── utils.js            Shared: parseCSV, parsePrice, fmtK, loadJSON, date helpers, constants (MONTHS, DAYS)
│   ├── sheets.js           Google Sheets fetch + data transformation (works, equipment)
│   ├── calendar.js         Calendar API + interactive calendar rendering
│   └── app.js              Theme, nav, charts, inventory, gallery, lightbox, initApp orchestrator
├── data/                   JSON data files
├── photos/                 Equipment and gallery images
└── api/                    Vercel serverless functions (calendar proxy)
```

### Script load order
Scripts use global scope (no ES modules). Load order matters:
1. `utils.js` — defines shared constants and functions
2. `sheets.js` — depends on `parseCSV`, `parsePrice`, `fmtK`
3. `calendar.js` — depends on `MONTHS`, `DAYS`, `fmtDate`, `todayStr`, `getWeekStart`, `now`
4. `app.js` — depends on everything above

### Page navigation
Tab clicks call `show(id, el)` which toggles `.active` on `.page` divs and `.tab` elements. Page IDs follow the pattern `p-{name}`.

### Data layer
All dynamic content is loaded from JSON files in `/data/`:
| File | Feeds |
|------|-------|
| `estate.json` | Hero section, systems health gauges, estate facts |
| `works.json` | KPIs, budget donut, spend bar chart, works table |
| `calendar.json` | Seasonal calendar (12-month array), "This Month" dashboard widget |
| `guides.json` | Systems & Guides page cards with step-by-step instructions |
| `inventory.json` | Equipment table (searchable/filterable) |
| `suppliers.json` | Supplier directory cards |
| `decoration.json` | Room cards, wallpaper tracker, open question count |
| `gallery.json` | Gallery images with categories |

`initApp()` in `app.js` fetches all JSON files in parallel via `Promise.all`, then renders each section by injecting innerHTML.

### Charts (Chart.js)
Three Chart.js instances: `donutChart` (budget), `barChart` (supplier spend), `monthChart` (this month tasks). Theme changes call `updateChartColors()` to sync grid/tick colors.

### Inventory filtering
`invData` (global array) + `activeFlt` (category string) power the search input and category filter buttons. `filterInv()` re-renders on every keystroke/filter click.

## Design Language
- Dark mode: forest green (#0f1a10) + brass (#c9a84c)
- Light mode: warm cream/parchment backgrounds
- Fonts: Playfair Display (headlines) + DM Sans (body)
- CSS custom properties on `[data-theme="dark"]` / `[data-theme="light"]` — always use `var(--*)` tokens, never hardcode colors
- Keep noise texture overlay, animated hovers, gold accent borders consistent

## Engineering Principles

### DRY (Don't Repeat Yourself)
Never duplicate logic. If the same code appears twice, extract it into a shared utility or function. One function, one place. Shared utilities live in `js/utils.js`.

### KISS (Keep It Simple, Stupid)
Choose the simplest solution that works. Fewer files, fewer abstractions, fewer layers. If a junior developer can't understand the file structure in 2 minutes, it's too complex.

### YAGNI (You Ain't Gonna Need It)
Don't build anything "just in case." No unused utilities, no premature abstractions, no helper files for hypothetical future features. Build only what's needed right now.

### File structure rules
- Reuse components aggressively — create shared components rather than page-specific duplicates
- Keep the folder structure flat and obvious — avoid deep nesting
- One concern per file, but combine related small things rather than creating 10 tiny files
- Before creating a new file, check if an existing one can be extended
- Name files and folders so their purpose is immediately obvious

## Working Rules
- Read the relevant files before making changes
- Summarise understanding before starting any task
- Ask before significant structural changes
- Prefer small, testable changes over large rewrites
- When extracting data to JSON, validate fetch works before removing hardcoded fallbacks
- Primary users are non-technical (property owners, caretaker) — keep UI intuitive, language plain
- When adding new pages: follow the existing pattern of a `<div id="p-{name}" class="page">` with a matching nav tab
- When adding data: create or extend a JSON file in `/data/`, load it in `initApp()`, render via innerHTML template strings
- When adding CSS: put theme variables in `tokens.css`, reusable component styles in `components.css`, page-specific styles in `pages.css`
- When adding JS: put shared utilities in `utils.js`, data-fetching in `sheets.js`, calendar logic in `calendar.js`, rendering/UI in `app.js`
