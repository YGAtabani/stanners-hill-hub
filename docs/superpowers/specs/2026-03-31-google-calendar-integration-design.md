# Google Calendar Integration — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Approach:** Vanilla JS + Vercel Serverless Proxy (Approach 1)

---

## Overview

Connect the Stanners Hill House Estate Hub to a Google Calendar so that all seasonal maintenance tasks, contractor visits, and ad-hoc events are managed in Google Calendar and displayed live in the hub. The hub becomes read-only — users manage events in Google Calendar, the hub displays them.

## Goals

1. Replace hardcoded calendar data with live Google Calendar data
2. Keep the existing annual 12-month grid layout, fed from the API
3. Add a new interactive month/week calendar view for day-to-day detail
4. Hide the API key behind a Vercel serverless proxy
5. Maintain the existing design language (dark/light mode, brass accents, category dots)

## Google Calendar Setup

- **Calendar ID:** `edd299f79c0a4ea844a59fe54b5214cb07522577ebf0ecb7c3e9aab2b1c98795@group.calendar.google.com`
- **Sharing:** "Make available to public" or "Anyone with the link" (required for API key access)
- **Google Cloud:** Enable Calendar API, create API key restricted to Calendar API + `stanners-hill-hub.vercel.app`
- **Single calendar** with title prefix convention for categories

### Event Naming Convention

| Prefix | Category Code | Use For |
|--------|--------------|---------|
| `[Grounds]` | `dg` | Garden, lawn, planting, leaf blowing |
| `[Maintenance]` | `dm` | Lift, gates, generator, fencing, equipment |
| `[Pest]` | `dp` | Sprays, treatments, moth/caterpillar, weed |
| `[Systems]` | `ds` | Pool, irrigation, septic, AV |
| *(no prefix)* | `other` | Ad-hoc events, rendered with neutral dot |

Example: `[Grounds] Lawn spring feed` → displayed as "Lawn spring feed" with a green grounds dot.

## Architecture

### 1. Serverless Proxy — `/api/calendar.js`

A Vercel serverless function that:

1. Reads `GOOGLE_CALENDAR_API_KEY` and `GOOGLE_CALENDAR_ID` from environment variables
2. Accepts query params: `timeMin` and `timeMax` (ISO 8601 date strings)
3. Calls `GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events` with:
   - `key` = API key
   - `timeMin`, `timeMax` = from query params
   - `singleEvents=true` (expands recurring events)
   - `orderBy=startTime`
   - `maxResults=500`
4. Parses each event title for `[Category]` prefix, maps to category codes
5. Returns clean JSON array
6. Sets `Cache-Control: s-maxage=300` (5 min CDN cache)

**Response shape:**
```json
[
  {
    "title": "Lawn spring feed",
    "category": "dg",
    "start": "2026-03-25",
    "end": "2026-03-25",
    "allDay": true,
    "time": null
  },
  {
    "title": "Lift inspection — Kinetic",
    "category": "dm",
    "start": "2026-05-15",
    "end": "2026-05-15",
    "allDay": false,
    "time": "09:00"
  }
]
```

**Vercel environment variables:**
- `GOOGLE_CALENDAR_API_KEY`
- `GOOGLE_CALENDAR_ID`

### 2. Interactive Calendar View

Sits above the annual month-grid in the Calendar page. Two sub-views toggled by buttons:

**Month View (default):**
- 7-column grid (Mon–Sun), 5–6 rows
- Each day cell: date number + colored category dots for events
- Click a day → detail panel below the grid shows all events (title, time, category badge)
- Prev/next month navigation arrows with "Month Year" display
- Current day highlighted with brass accent border

**Week View:**
- 7-column single row showing current week
- Events shown inline (more space than month view)
- Prev/next week navigation

**Layout:**
```
┌──────────────────────────────────────┐
│  [Month] [Week]      ◁ April 2026 ▷ │
├──────────────────────────────────────┤
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun   │
│  ·    ·    ·    1    2    3    4     │
│  5    6●●  7    8●   9    10   11   │
│  ...                                 │
├──────────────────────────────────────┤
│  ▾ April 6 — 2 events               │
│  ● [Grounds] Lawn spring feed        │
│  ● [Pest] Weed treatment             │
└──────────────────────────────────────┘
```

**Styling:** Uses existing design tokens (`var(--surface)`, `var(--brass)`, `var(--border)`, etc.). Category dot colors match existing ones. Hover effects consistent with other cards. Fully responsive for both dark and light themes.

### 3. Annual Month-Grid (Migrated)

Same 12-month card layout and styling. Changes:

- Data source: fetch from `/api/calendar?timeMin={Jan 1}&timeMax={Dec 31}` instead of hardcoded array
- Events grouped by month client-side
- Category dots via parsed prefix
- "Now" highlight on current month stays
- Dashboard "This Month" widget also uses fetched data

### 4. Data Flow

**On page load** (`initApp()`):
1. Two calendar fetches fire in parallel with all other data fetches:
   - Full year (Jan 1 – Dec 31) for annual grid + dashboard widget
   - Current month for interactive view's initial render
2. Annual grid and dashboard widget render from the year fetch
3. Interactive view renders from the month fetch

**On navigation** (interactive view):
- When user navigates to a new month/week, fetch that month if not cached
- Client-side cache: `Map` keyed by `YYYY-MM` to avoid redundant fetches

**Loading state:** Subtle skeleton/shimmer placeholders while fetching, consistent with existing design.

**Error handling:**
- Fetch failure → inline message "Unable to load calendar — check back shortly"
- Empty calendar → "No events this month" / empty task lists
- No offline fallback data — Google Calendar is the single source of truth

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `/api/calendar.js` | **New** | Vercel serverless proxy for Google Calendar API |
| `index.html` | **Modified** | Remove hardcoded calendar data, add interactive calendar view HTML/CSS/JS, update `initApp()` to fetch from proxy |
| `vercel.json` | **New** (if needed) | Route configuration for `/api/*` |
| `data/calendar.json` | **Kept** | Retained for reference, no longer loaded by app |

## Out of Scope

- Write operations (create/edit/delete events from the hub)
- OAuth / user authentication
- Offline mode / service worker caching
- Push notifications for upcoming events
- Recurring event editing (managed in Google Calendar)
