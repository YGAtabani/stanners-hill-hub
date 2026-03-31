# Google Calendar Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded calendar data with live Google Calendar events via a Vercel serverless proxy, and add an interactive month/week calendar view.

**Architecture:** A `/api/calendar.js` serverless function fetches events from Google Calendar API (hidden API key), parses `[Category]` prefixes, and returns clean JSON. The client fetches from this proxy, renders an interactive calendar view (month/week) and the existing annual month-grid, both from live data.

**Tech Stack:** Vanilla JS, Vercel Serverless Functions (Node.js), Google Calendar API v3

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `api/calendar.js` | Create | Serverless proxy — fetches Google Calendar API, parses categories, returns clean JSON |
| `index.html` | Modify | Add interactive calendar CSS (~80 lines), HTML for interactive view, JS for fetching/rendering/navigation |
| `vercel.json` | Create | Ensure `/api` routes work alongside static files |
| `.env.example` | Create | Document required environment variables |
| `data/calendar.json` | Keep | No longer loaded — retained for reference |

---

### Task 1: Create the Vercel Serverless Proxy

**Files:**
- Create: `api/calendar.js`
- Create: `vercel.json`
- Create: `.env.example`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" }
  ]
}
```

This ensures Vercel routes `/api/*` requests to the serverless functions while serving everything else as static files.

- [ ] **Step 2: Create `.env.example`**

```
GOOGLE_CALENDAR_API_KEY=your-api-key-here
GOOGLE_CALENDAR_ID=edd299f79c0a4ea844a59fe54b5214cb07522577ebf0ecb7c3e9aab2b1c98795@group.calendar.google.com
```

- [ ] **Step 3: Create `api/calendar.js`**

```js
const CATEGORY_MAP = {
  'grounds':     'dg',
  'maintenance': 'dm',
  'pest':        'dp',
  'systems':     'ds',
};

function parseCategory(summary) {
  const match = summary.match(/^\[(\w+)\]\s*/);
  if (!match) return { category: 'other', title: summary };
  const prefix = match[1].toLowerCase();
  return {
    category: CATEGORY_MAP[prefix] || 'other',
    title: summary.replace(match[0], ''),
  };
}

function formatEvent(item) {
  const { category, title } = parseCategory(item.summary || '');
  const startDate = item.start.date || item.start.dateTime;
  const endDate = item.end.date || item.end.dateTime;
  const allDay = !!item.start.date;
  let time = null;
  if (!allDay && item.start.dateTime) {
    time = new Date(item.start.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return {
    title,
    category,
    start: allDay ? startDate : startDate.split('T')[0],
    end: allDay ? endDate : endDate.split('T')[0],
    allDay,
    time,
  };
}

export default async function handler(req, res) {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!apiKey || !calendarId) {
    return res.status(500).json({ error: 'Missing calendar configuration' });
  }

  const { timeMin, timeMax } = req.query;
  if (!timeMin || !timeMax) {
    return res.status(400).json({ error: 'timeMin and timeMax query params required' });
  }

  const params = new URLSearchParams({
    key: apiKey,
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '500',
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      console.error('Google Calendar API error:', response.status, text);
      return res.status(502).json({ error: 'Calendar API error' });
    }
    const data = await response.json();
    const events = (data.items || []).map(formatEvent);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(events);
  } catch (err) {
    console.error('Proxy fetch error:', err);
    return res.status(502).json({ error: 'Failed to reach calendar service' });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add api/calendar.js vercel.json .env.example
git commit -m "feat: add Vercel serverless proxy for Google Calendar API"
```

---

### Task 2: Add Interactive Calendar CSS

**Files:**
- Modify: `index.html` (CSS section, after line 365 — the `.mc-dot` category color rules at line 366)

- [ ] **Step 1: Add CSS for the interactive calendar view**

Insert after line 366 (`.dg{background:#4a7a4e} .dp{background:#8a6a2a} .ds{background:#3a7a8a} .dm{background:#c9a84c}`) and before the `/* GUIDES */` section comment:

```css
.other{background:#6a6a6a}

/* ═══════════════════════════════════════
   INTERACTIVE CALENDAR
═══════════════════════════════════════ */
.ical { margin-bottom:28px; }
.ical-controls {
  display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;
}
.ical-views { display:flex; gap:4px; }
.ical-view-btn {
  background:var(--surface2); border:1px solid var(--border); border-radius:var(--r);
  padding:6px 14px; font-size:11px; color:var(--text-dim); cursor:pointer;
  font-family:'DM Sans',sans-serif; letter-spacing:0.06em; text-transform:uppercase; transition:all .2s;
}
.ical-view-btn:hover { border-color:var(--card-hover); }
.ical-view-btn.active { background:var(--brass); color:#0f1a10; border-color:var(--brass); }
.ical-nav {
  display:flex; align-items:center; gap:12px;
}
.ical-nav-btn {
  background:none; border:1px solid var(--border); border-radius:50%; width:30px; height:30px;
  display:flex; align-items:center; justify-content:center; cursor:pointer;
  color:var(--text-dim); font-size:14px; transition:all .2s;
}
.ical-nav-btn:hover { border-color:var(--brass); color:var(--brass); }
.ical-title {
  font-family:'Playfair Display',serif; font-size:18px; color:var(--text); min-width:160px; text-align:center;
}
.ical-grid {
  display:grid; grid-template-columns:repeat(7,1fr); gap:1px; background:var(--border);
  border:1px solid var(--border); border-radius:var(--r); overflow:hidden;
}
.ical-hdr {
  background:var(--surface2); padding:8px 4px; text-align:center;
  font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:var(--text-dim);
  font-family:'DM Sans',sans-serif;
}
.ical-day {
  background:var(--surface); padding:8px 6px; min-height:72px; cursor:pointer; transition:background .15s;
  display:flex; flex-direction:column; gap:4px;
}
.ical-day:hover { background:var(--surface2); }
.ical-day.outside { opacity:0.3; }
.ical-day.today { border:2px solid var(--brass); border-radius:2px; }
.ical-day.selected { background:var(--surface3); }
.ical-day-num {
  font-size:12px; color:var(--text-dim); font-family:'DM Sans',sans-serif; font-weight:500;
}
.ical-day.today .ical-day-num { color:var(--brass); font-weight:700; }
.ical-day-dots { display:flex; gap:3px; flex-wrap:wrap; margin-top:2px; }
.ical-day-dot { width:6px; height:6px; border-radius:50%; }
.ical-day-event {
  font-size:10px; color:var(--text-dim); line-height:1.3; padding:2px 4px;
  background:var(--surface2); border-radius:3px; display:flex; align-items:center; gap:4px;
}
.ical-day-event .mc-dot { width:4px; height:4px; margin-top:0; }
.ical-detail {
  margin-top:12px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r);
  padding:14px 18px; display:none;
}
.ical-detail.open { display:block; }
.ical-detail-title {
  font-family:'Playfair Display',serif; font-size:14px; color:var(--text); margin-bottom:10px;
}
.ical-detail-event {
  display:flex; gap:8px; align-items:center; padding:6px 0; border-bottom:1px solid var(--border2);
  font-size:12px; color:var(--text-dim);
}
.ical-detail-event:last-child { border-bottom:none; }
.ical-detail-time {
  font-size:10px; color:var(--brass); font-family:'DM Sans',sans-serif; min-width:48px;
}
.ical-empty {
  text-align:center; padding:40px 20px; color:var(--text-dim); font-size:13px;
}
.ical-loading {
  text-align:center; padding:40px 20px; color:var(--text-dim); font-size:12px;
  font-family:'DM Sans',sans-serif; letter-spacing:0.06em;
}
.cal-error {
  text-align:center; padding:30px 20px; color:var(--text-dim); font-size:12px;
  background:var(--surface); border:1px solid var(--border); border-radius:var(--r);
}
@media(max-width:700px){
  .ical-day { min-height:48px; padding:4px 3px; }
  .ical-day-event { display:none; }
  .ical-title { font-size:15px; min-width:120px; }
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "style: add CSS for interactive calendar view"
```

---

### Task 3: Add Interactive Calendar HTML

**Files:**
- Modify: `index.html` (HTML section — the `p-calendar` page div, around lines 648–661)

- [ ] **Step 1: Replace the calendar page HTML**

Replace the existing `p-calendar` div (lines 648–661):

```html
<div id="p-calendar" class="page">
  <div class="px pt24">
    <div class="ph">
      <div class="ph-left"><div class="eyebrow">Grounds Management</div><h2>Seasonal Calendar</h2><p>Annual schedule of garden treatments, pest control, system operations and maintenance across the estate.</p></div>
      <div style="display:flex;gap:14px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-dim)"><div style="width:7px;height:7px;border-radius:50%;background:#4a7a4e"></div>Garden</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-dim)"><div style="width:7px;height:7px;border-radius:50%;background:#8a6a2a"></div>Pest / Treatment</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-dim)"><div style="width:7px;height:7px;border-radius:50%;background:#3a7a8a"></div>Systems</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-dim)"><div style="width:7px;height:7px;border-radius:50%;background:#c9a84c"></div>Maintenance</div>
      </div>
    </div>
```

This is unchanged up to here. Now insert the interactive calendar container, then the existing month-grid:

```html
    <!-- Interactive Calendar -->
    <div class="ical" id="ical">
      <div class="ical-controls">
        <div class="ical-views">
          <button class="ical-view-btn active" onclick="setCalView('month',this)">Month</button>
          <button class="ical-view-btn" onclick="setCalView('week',this)">Week</button>
        </div>
        <div class="ical-nav">
          <button class="ical-nav-btn" onclick="navCal(-1)">&#8249;</button>
          <div class="ical-title" id="ical-title"></div>
          <button class="ical-nav-btn" onclick="navCal(1)">&#8250;</button>
        </div>
      </div>
      <div id="ical-grid-wrap">
        <div class="ical-loading">Loading calendar...</div>
      </div>
      <div class="ical-detail" id="ical-detail"></div>
    </div>

    <!-- Annual Overview -->
    <div style="margin-top:8px;margin-bottom:14px;display:flex;align-items:center;gap:12px">
      <div style="flex:1;height:1px;background:var(--border)"></div>
      <span style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-dim);font-family:'DM Sans',sans-serif">Annual Overview</span>
      <div style="flex:1;height:1px;background:var(--border)"></div>
    </div>
    <div class="month-grid" id="full-calendar"></div>
  </div>
</div>
```

The full replacement for the `p-calendar` div (lines 648–661) is:

```html
<div id="p-calendar" class="page">
  <div class="px pt24">
    <div class="ph">
      <div class="ph-left"><div class="eyebrow">Grounds Management</div><h2>Seasonal Calendar</h2><p>Annual schedule of garden treatments, pest control, system operations and maintenance across the estate.</p></div>
      <div style="display:flex;gap:14px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-dim)"><div style="width:7px;height:7px;border-radius:50%;background:#4a7a4e"></div>Garden</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-dim)"><div style="width:7px;height:7px;border-radius:50%;background:#8a6a2a"></div>Pest / Treatment</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-dim)"><div style="width:7px;height:7px;border-radius:50%;background:#3a7a8a"></div>Systems</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-dim)"><div style="width:7px;height:7px;border-radius:50%;background:#c9a84c"></div>Maintenance</div>
      </div>
    </div>

    <!-- Interactive Calendar -->
    <div class="ical" id="ical">
      <div class="ical-controls">
        <div class="ical-views">
          <button class="ical-view-btn active" onclick="setCalView('month',this)">Month</button>
          <button class="ical-view-btn" onclick="setCalView('week',this)">Week</button>
        </div>
        <div class="ical-nav">
          <button class="ical-nav-btn" onclick="navCal(-1)">&#8249;</button>
          <div class="ical-title" id="ical-title"></div>
          <button class="ical-nav-btn" onclick="navCal(1)">&#8250;</button>
        </div>
      </div>
      <div id="ical-grid-wrap">
        <div class="ical-loading">Loading calendar...</div>
      </div>
      <div class="ical-detail" id="ical-detail"></div>
    </div>

    <!-- Annual Overview -->
    <div style="margin-top:8px;margin-bottom:14px;display:flex;align-items:center;gap:12px">
      <div style="flex:1;height:1px;background:var(--border)"></div>
      <span style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-dim);font-family:'DM Sans',sans-serif">Annual Overview</span>
      <div style="flex:1;height:1px;background:var(--border)"></div>
    </div>
    <div class="month-grid" id="full-calendar"></div>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add interactive calendar HTML structure"
```

---

### Task 4: Add Interactive Calendar JS — Core Fetch & Cache

**Files:**
- Modify: `index.html` (script section — replace the old hardcoded `calData` block and add new calendar logic)

- [ ] **Step 1: Remove the old hardcoded `calData` array**

The hardcoded `calData` array (approximately lines 856–869 in the `<script>` block — the large inline array starting with `const calData = [` and ending with `];`) plus the old rendering code below it (the `fc.innerHTML` block and the dashboard "this month" block) — all of this is now handled by the `initApp()` function which already loads from `data/calendar.json`. However, there's also a duplicated inline version from the original code. Delete the entire block from `// ═══ CALENDAR DATA` through the dashboard `this-month-tasks` rendering (lines 792–825 in the original file).

Note: The current codebase already moved calendar rendering into `initApp()` (lines 1251–1265). The old inline code at lines 792–825 is dead code from the original version. If it still exists, remove it. If it was already cleaned up, skip this step.

- [ ] **Step 2: Add the calendar API fetch function and cache**

Insert this code in the `<script>` block, before `initApp()` (after the `loadJSON` function):

```js
// ═══ CALENDAR API
const CAL_CACHE = new Map();
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

async function fetchCalEvents(timeMin, timeMax) {
  const res = await fetch(`/api/calendar?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function getMonthEvents(year, month) {
  const key = year + '-' + String(month + 1).padStart(2, '0');
  if (CAL_CACHE.has(key)) return CAL_CACHE.get(key);
  const timeMin = new Date(year, month, 1).toISOString();
  const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
  const events = await fetchCalEvents(timeMin, timeMax);
  CAL_CACHE.set(key, events);
  return events;
}

async function getYearEvents(year) {
  const timeMin = new Date(year, 0, 1).toISOString();
  const timeMax = new Date(year, 11, 31, 23, 59, 59).toISOString();
  const events = await fetchCalEvents(timeMin, timeMax);
  // populate month cache from year data
  for (let m = 0; m < 12; m++) {
    const key = year + '-' + String(m + 1).padStart(2, '0');
    const prefix = year + '-' + String(m + 1).padStart(2, '0');
    CAL_CACHE.set(key, events.filter(e => e.start.startsWith(prefix)));
  }
  return events;
}

function eventsByDate(events) {
  const map = {};
  events.forEach(e => {
    if (!map[e.start]) map[e.start] = [];
    map[e.start].push(e);
  });
  return map;
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add calendar API fetch layer with month cache"
```

---

### Task 5: Add Interactive Calendar JS — Rendering

**Files:**
- Modify: `index.html` (script section — add rendering functions after the fetch code from Task 4)

- [ ] **Step 1: Add interactive calendar rendering functions**

Insert after the code added in Task 4:

```js
// ═══ INTERACTIVE CALENDAR RENDERING
let icalView = 'month';
let icalYear = now.getFullYear();
let icalMonth = now.getMonth();
let icalWeekStart = getWeekStart(now);
let icalSelectedDate = null;

function getWeekStart(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function fmtDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function todayStr() { return fmtDate(now); }

function setCalView(view, btn) {
  icalView = view;
  document.querySelectorAll('.ical-view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (view === 'week') icalWeekStart = getWeekStart(new Date(icalYear, icalMonth, 1));
  renderInteractiveCal();
}

function navCal(dir) {
  if (icalView === 'month') {
    icalMonth += dir;
    if (icalMonth > 11) { icalMonth = 0; icalYear++; }
    if (icalMonth < 0) { icalMonth = 11; icalYear--; }
  } else {
    icalWeekStart = new Date(icalWeekStart);
    icalWeekStart.setDate(icalWeekStart.getDate() + dir * 7);
    icalYear = icalWeekStart.getFullYear();
    icalMonth = icalWeekStart.getMonth();
  }
  renderInteractiveCal();
}

async function renderInteractiveCal() {
  const wrap = document.getElementById('ical-grid-wrap');
  const detail = document.getElementById('ical-detail');
  detail.classList.remove('open');

  if (icalView === 'month') {
    document.getElementById('ical-title').textContent = MONTHS[icalMonth] + ' ' + icalYear;
    wrap.innerHTML = '<div class="ical-loading">Loading...</div>';
    try {
      const events = await getMonthEvents(icalYear, icalMonth);
      const byDate = eventsByDate(events);
      renderMonthGrid(byDate);
    } catch (e) {
      wrap.innerHTML = '<div class="cal-error">Unable to load calendar — check back shortly</div>';
    }
  } else {
    const wEnd = new Date(icalWeekStart);
    wEnd.setDate(wEnd.getDate() + 6);
    const titleStart = icalWeekStart.getDate() + ' ' + MONTHS[icalWeekStart.getMonth()].slice(0, 3);
    const titleEnd = wEnd.getDate() + ' ' + MONTHS[wEnd.getMonth()].slice(0, 3) + ' ' + wEnd.getFullYear();
    document.getElementById('ical-title').textContent = titleStart + ' — ' + titleEnd;
    wrap.innerHTML = '<div class="ical-loading">Loading...</div>';
    try {
      const events = await getMonthEvents(icalWeekStart.getFullYear(), icalWeekStart.getMonth());
      // also fetch next month if week spans month boundary
      let allEvents = events;
      if (wEnd.getMonth() !== icalWeekStart.getMonth()) {
        const extra = await getMonthEvents(wEnd.getFullYear(), wEnd.getMonth());
        allEvents = events.concat(extra);
      }
      const byDate = eventsByDate(allEvents);
      renderWeekGrid(byDate);
    } catch (e) {
      wrap.innerHTML = '<div class="cal-error">Unable to load calendar — check back shortly</div>';
    }
  }
}

function renderMonthGrid(byDate) {
  const wrap = document.getElementById('ical-grid-wrap');
  const first = new Date(icalYear, icalMonth, 1);
  const lastDay = new Date(icalYear, icalMonth + 1, 0).getDate();
  let startDay = first.getDay() - 1; // Monday=0
  if (startDay < 0) startDay = 6;

  let html = '<div class="ical-grid">';
  DAYS.forEach(d => { html += `<div class="ical-hdr">${d}</div>`; });

  // Previous month padding
  const prevLast = new Date(icalYear, icalMonth, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevLast - i;
    html += `<div class="ical-day outside"><div class="ical-day-num">${d}</div></div>`;
  }

  const tStr = todayStr();
  for (let d = 1; d <= lastDay; d++) {
    const ds = fmtDate(new Date(icalYear, icalMonth, d));
    const isToday = ds === tStr;
    const isSel = ds === icalSelectedDate;
    const dayEvents = byDate[ds] || [];
    const dots = dayEvents.map(e => `<div class="ical-day-dot ${e.category}"></div>`).join('');
    html += `<div class="ical-day${isToday ? ' today' : ''}${isSel ? ' selected' : ''}" onclick="selectCalDay('${ds}')">`;
    html += `<div class="ical-day-num">${d}</div>`;
    if (dayEvents.length > 0) html += `<div class="ical-day-dots">${dots}</div>`;
    html += '</div>';
  }

  // Next month padding
  const totalCells = startDay + lastDay;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="ical-day outside"><div class="ical-day-num">${i}</div></div>`;
  }

  html += '</div>';
  wrap.innerHTML = html;
}

function renderWeekGrid(byDate) {
  const wrap = document.getElementById('ical-grid-wrap');
  const tStr = todayStr();

  let html = '<div class="ical-grid">';
  DAYS.forEach(d => { html += `<div class="ical-hdr">${d}</div>`; });

  for (let i = 0; i < 7; i++) {
    const dt = new Date(icalWeekStart);
    dt.setDate(dt.getDate() + i);
    const ds = fmtDate(dt);
    const isToday = ds === tStr;
    const isSel = ds === icalSelectedDate;
    const dayEvents = byDate[ds] || [];
    const evHtml = dayEvents.map(e =>
      `<div class="ical-day-event"><div class="mc-dot ${e.category}"></div>${e.time ? '<span style="color:var(--brass);font-size:9px">' + e.time + '</span> ' : ''}${e.title}</div>`
    ).join('');

    html += `<div class="ical-day${isToday ? ' today' : ''}${isSel ? ' selected' : ''}" style="min-height:100px" onclick="selectCalDay('${ds}')">`;
    html += `<div class="ical-day-num">${dt.getDate()}</div>`;
    html += evHtml;
    html += '</div>';
  }

  html += '</div>';
  wrap.innerHTML = html;
}

async function selectCalDay(dateStr) {
  icalSelectedDate = dateStr;
  // re-render to update selection highlight
  const events = await getMonthEvents(parseInt(dateStr.split('-')[0]), parseInt(dateStr.split('-')[1]) - 1);
  const dayEvents = events.filter(e => e.start === dateStr);

  // update selection class
  document.querySelectorAll('.ical-day').forEach(el => el.classList.remove('selected'));
  const clicked = [...document.querySelectorAll('.ical-day')].find(el => el.onclick && el.onclick.toString().includes(dateStr));

  const detail = document.getElementById('ical-detail');
  if (dayEvents.length === 0) {
    detail.classList.remove('open');
    return;
  }
  const d = new Date(dateStr + 'T00:00:00');
  const label = d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  detail.innerHTML = `<div class="ical-detail-title">${label} — ${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}</div>` +
    dayEvents.map(e =>
      `<div class="ical-detail-event"><div class="mc-dot ${e.category}"></div><span class="ical-detail-time">${e.time || 'All day'}</span>${e.title}</div>`
    ).join('');
  detail.classList.add('open');

  // highlight clicked day
  document.querySelectorAll('.ical-day').forEach(el => {
    const onclick = el.getAttribute('onclick');
    if (onclick && onclick.includes(dateStr)) el.classList.add('selected');
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add interactive calendar rendering (month/week views)"
```

---

### Task 6: Update `initApp()` — Fetch from Google Calendar API

**Files:**
- Modify: `index.html` (the `initApp()` function)

- [ ] **Step 1: Replace calendar data loading in `initApp()`**

In the `initApp()` function, make these changes:

**a)** Remove `calData` from the `Promise.all` destructure. Change:

```js
const [sheetRows, equipRows, estate, worksFallback, calData, guides, inventoryFallback, suppliers, decoration] = await Promise.all([
    worksSheetPromise,
    equipSheetPromise,
    loadJSON('data/estate.json'),
    loadJSON('data/works.json'),
    loadJSON('data/calendar.json'),
    loadJSON('data/guides.json'),
    loadJSON('data/inventory.json'),
    loadJSON('data/suppliers.json'),
    loadJSON('data/decoration.json'),
  ]);
```

To:

```js
const calYearPromise = getYearEvents(now.getFullYear()).catch(e => {
    console.warn('Calendar API unavailable:', e.message);
    return null;
  });

  const [sheetRows, equipRows, estate, worksFallback, guides, inventoryFallback, suppliers, decoration, calEvents] = await Promise.all([
    worksSheetPromise,
    equipSheetPromise,
    loadJSON('data/estate.json'),
    loadJSON('data/works.json'),
    loadJSON('data/guides.json'),
    loadJSON('data/inventory.json'),
    loadJSON('data/suppliers.json'),
    loadJSON('data/decoration.json'),
    calYearPromise,
  ]);
```

**b)** Replace the calendar rendering block (the `// ── CALENDAR` section). Change:

```js
  // ── CALENDAR
  const fc = document.getElementById('full-calendar');
  const mi = now.getMonth();
  fc.innerHTML = calData.map((mo, i) => {
    const isNow = i === mi;
    const tasks = mo.tasks.map(t => `<div class="mc-task"><div class="mc-dot ${t.category}"></div>${t.task}</div>`).join('');
    return `<div class="mc${isNow ? ' now' : ''}"><div class="mch"><span class="mc-name">${mo.month}${isNow ? '<span style="font-size:9px;color:var(--brass);margin-left:8px;font-family:\'DM Sans\',sans-serif;letter-spacing:0.12em;text-transform:uppercase"> Now</span>' : ''}</span><span class="mc-season">${mo.season}</span></div><div class="mc-tasks">${tasks}</div></div>`;
  }).join('');

  // ── THIS MONTH (dashboard)
  const thisMonth = calData[mi];
  document.getElementById('this-month-name').textContent = thisMonth.month;
  document.getElementById('this-month-tasks').innerHTML = thisMonth.tasks.map(t =>
    `<div class="mc-task"><div class="mc-dot ${t.category}"></div>${t.task}</div>`
  ).join('');
```

To:

```js
  // ── CALENDAR (from Google Calendar API)
  const fc = document.getElementById('full-calendar');
  const mi = now.getMonth();
  if (calEvents) {
    console.log('✓ Calendar data live from Google Calendar (' + calEvents.length + ' events)');
    const SEASON_MAP = {0:'Winter',1:'Winter',2:'Early Spring',3:'Spring',4:'Spring',5:'Early Summer',6:'Summer',7:'Summer',8:'Early Autumn',9:'Autumn',10:'Late Autumn',11:'Winter'};
    fc.innerHTML = MONTHS.map((month, i) => {
      const prefix = now.getFullYear() + '-' + String(i + 1).padStart(2, '0');
      const monthEvents = calEvents.filter(e => e.start.startsWith(prefix));
      const isNow = i === mi;
      const tasks = monthEvents.map(e => `<div class="mc-task"><div class="mc-dot ${e.category}"></div>${e.title}</div>`).join('');
      const empty = monthEvents.length === 0 ? '<div style="font-size:11px;color:var(--text-dim);padding:4px 0">No events</div>' : '';
      return `<div class="mc${isNow ? ' now' : ''}"><div class="mch"><span class="mc-name">${month}${isNow ? '<span style="font-size:9px;color:var(--brass);margin-left:8px;font-family:\'DM Sans\',sans-serif;letter-spacing:0.12em;text-transform:uppercase"> Now</span>' : ''}</span><span class="mc-season">${SEASON_MAP[i]}</span></div><div class="mc-tasks">${tasks || empty}</div></div>`;
    }).join('');

    // Dashboard this-month
    const thisMonthPrefix = now.getFullYear() + '-' + String(mi + 1).padStart(2, '0');
    const thisMonthEvents = calEvents.filter(e => e.start.startsWith(thisMonthPrefix));
    document.getElementById('this-month-name').textContent = MONTHS[mi];
    document.getElementById('this-month-tasks').innerHTML = thisMonthEvents.length > 0
      ? thisMonthEvents.map(e => `<div class="mc-task"><div class="mc-dot ${e.category}"></div>${e.title}</div>`).join('')
      : '<div style="font-size:11px;color:var(--text-dim);padding:4px 0">No events this month</div>';
  } else {
    fc.innerHTML = '<div class="cal-error">Unable to load calendar — check back shortly</div>';
    document.getElementById('this-month-name').textContent = MONTHS[mi];
    document.getElementById('this-month-tasks').innerHTML = '<div style="font-size:11px;color:var(--text-dim);padding:4px 0">Calendar unavailable</div>';
  }

  // ── INTERACTIVE CALENDAR (initial render)
  renderInteractiveCal();
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: wire initApp() to Google Calendar API for live data"
```

---

### Task 7: Update `monthChart` for Live Data

**Files:**
- Modify: `index.html` (the `monthChart` setup in `initApp()`)

- [ ] **Step 1: Find and update the month task chart**

The existing `monthChart` creates a bar chart of task counts by category for the current month. It currently reads from `calData[mi].tasks`. Update it to use the live calendar events.

Find the `monthChart` creation code in `initApp()` (search for `monthTaskChart` or `monthChart`). Replace its data source to count events from `calEvents` for the current month by category.

Replace the monthChart block with:

```js
  // ── MONTH TASK CHART
  const monthChartCtx = document.getElementById('monthTaskChart');
  if (monthChartCtx && calEvents) {
    const thisMonthPrefix = now.getFullYear() + '-' + String(mi + 1).padStart(2, '0');
    const mEvents = calEvents.filter(e => e.start.startsWith(thisMonthPrefix));
    const catCounts = { dg: 0, dp: 0, ds: 0, dm: 0, other: 0 };
    mEvents.forEach(e => { catCounts[e.category] = (catCounts[e.category] || 0) + 1; });
    const catLabels = { dg: 'Garden', dp: 'Pest', ds: 'Systems', dm: 'Maintenance', other: 'Other' };
    const catColors = { dg: '#4a7a4e', dp: '#8a6a2a', ds: '#3a7a8a', dm: '#c9a84c', other: '#6a6a6a' };
    const cats = Object.keys(catCounts).filter(c => catCounts[c] > 0);
    monthChart = new Chart(monthChartCtx, {
      type: 'bar',
      data: {
        labels: cats.map(c => catLabels[c]),
        datasets: [{ data: cats.map(c => catCounts[c]), backgroundColor: cats.map(c => catColors[c]), borderRadius: 4, barThickness: 18 }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { color: getGridColor() }, ticks: { color: getTextColor(), font: { size: 10 } } }, y: { beginAtZero: true, grid: { color: getGridColor() }, ticks: { color: getTextColor(), stepSize: 1, font: { size: 10 } } } } }
    });
  }
```

Note: Find the existing monthChart code and replace it entirely. Do not duplicate it.

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: update month task chart to use live calendar data"
```

---

### Task 8: Remove Dead Hardcoded Calendar Code

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Remove the old inline `calData` block**

If lines 792–825 (the old `// ═══ CALENDAR DATA` block with the hardcoded array and rendering) still exist in the file, delete them entirely. This code was from the original version before `initApp()` was introduced and is now dead.

Check for: `const calData = [` outside of `initApp()`. If found, delete from `// ═══ CALENDAR DATA` through the `this-month-tasks` innerHTML line.

- [ ] **Step 2: Remove the `calendar.json` fetch from `initApp()`**

If step 1 of Task 6 was done correctly, `loadJSON('data/calendar.json')` is already removed from the `Promise.all`. Verify this is the case.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "refactor: remove dead hardcoded calendar data"
```

---

### Task 9: Manual Testing & Verification

- [ ] **Step 1: Set up Google Cloud API key**

1. Go to console.cloud.google.com
2. Create/select a project
3. Enable "Google Calendar API"
4. Create an API key (restrict to Calendar API)
5. In Vercel dashboard, add environment variables:
   - `GOOGLE_CALENDAR_API_KEY` = your key
   - `GOOGLE_CALENDAR_ID` = `edd299f79c0a4ea844a59fe54b5214cb07522577ebf0ecb7c3e9aab2b1c98795@group.calendar.google.com`

- [ ] **Step 2: Make the Google Calendar shareable**

In Google Calendar settings for the Stanners Hill House calendar:
1. Settings → Share with specific people or Make available to public
2. Set to "See all event details"

- [ ] **Step 3: Seed test events**

Add a few test events to the Google Calendar with the naming convention:
- `[Grounds] Lawn spring feed`
- `[Pest] Box tree moth — first spray`
- `[Systems] Pool opening — full chemical balance`
- `[Maintenance] Lift inspection — Kinetic`

- [ ] **Step 4: Deploy and test**

```bash
git push origin main
```

Verify on the live site:
1. Dashboard "This Month" widget shows live events
2. Calendar tab → interactive month view shows events as dots
3. Clicking a day shows event detail panel
4. Week view shows events inline
5. Annual overview grid shows events grouped by month
6. Navigation (prev/next month/week) works
7. Light/dark mode toggle works on all calendar elements
8. Mobile view is responsive

- [ ] **Step 5: Test error state**

Temporarily remove the API key from Vercel env vars and redeploy. Verify the error message "Unable to load calendar — check back shortly" appears in both views. Then restore the key.
