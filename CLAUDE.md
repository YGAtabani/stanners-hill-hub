# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Private estate management dashboard for Stanners Hill House, Chobham, Surrey.
Single-page app: `index.html` with vanilla HTML/CSS/JS + Chart.js (CDN).
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
Everything lives in one `index.html` (~910 lines):
- **Lines 1–438**: `<style>` block — all CSS, organized by component with section headers
- **Lines 440–672**: HTML — topbar, nav tabs, then 7 page sections (`p-dashboard`, `p-calendar`, `p-systems`, `p-equipment`, `p-decoration`, `p-tour`, `p-suppliers`)
- **Lines 674–908**: `<script>` block — theme toggle, tab navigation, Chart.js setup, data loading

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

`initApp()` fetches all 7 JSON files in parallel via `Promise.all`, then renders each section by injecting innerHTML.

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

## Working Rules
- Read index.html and /data folder fully before making changes
- Summarise understanding before starting any task
- Ask before significant structural changes
- Prefer small, testable changes over large rewrites
- When extracting data to JSON, validate fetch works before removing hardcoded fallbacks
- Primary users are non-technical (property owners, caretaker) — keep UI intuitive, language plain
- When adding new sections: follow the existing pattern of a `<div id="p-{name}" class="page">` with a matching nav tab
- When adding data: create or extend a JSON file in `/data/`, load it in `initApp()`, render via innerHTML template strings
