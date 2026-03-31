// ═══════════════════════════════════════
//   CALENDAR API & INTERACTIVE CALENDAR
// ═══════════════════════════════════════

const CAL_CACHE = new Map();

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
  for (let m = 0; m < 12; m++) {
    const key = year + '-' + String(m + 1).padStart(2, '0');
    CAL_CACHE.set(key, events.filter(e => e.start.startsWith(key)));
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

// ── Interactive calendar state
let icalView = 'month';
let icalYear = now.getFullYear();
let icalMonth = now.getMonth();
let icalWeekStart = null;
let icalSelectedDate = null;

function setCalView(view, btn) {
  icalView = view;
  document.querySelectorAll('.ical-view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (view === 'week' && !icalWeekStart) icalWeekStart = getWeekStart(new Date(icalYear, icalMonth, 1));
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
      wrap.innerHTML = '<div class="cal-error">Unable to load calendar \u2014 check back shortly</div>';
    }
  } else {
    if (!icalWeekStart) icalWeekStart = getWeekStart(new Date(icalYear, icalMonth, 1));
    const wEnd = new Date(icalWeekStart);
    wEnd.setDate(wEnd.getDate() + 6);
    const titleStart = icalWeekStart.getDate() + ' ' + MONTHS[icalWeekStart.getMonth()].slice(0, 3);
    const titleEnd = wEnd.getDate() + ' ' + MONTHS[wEnd.getMonth()].slice(0, 3) + ' ' + wEnd.getFullYear();
    document.getElementById('ical-title').textContent = titleStart + ' \u2014 ' + titleEnd;
    wrap.innerHTML = '<div class="ical-loading">Loading...</div>';
    try {
      const events = await getMonthEvents(icalWeekStart.getFullYear(), icalWeekStart.getMonth());
      let allEvents = events;
      if (wEnd.getMonth() !== icalWeekStart.getMonth()) {
        const extra = await getMonthEvents(wEnd.getFullYear(), wEnd.getMonth());
        allEvents = events.concat(extra);
      }
      const byDate = eventsByDate(allEvents);
      renderWeekGrid(byDate);
    } catch (e) {
      wrap.innerHTML = '<div class="cal-error">Unable to load calendar \u2014 check back shortly</div>';
    }
  }
}

function renderMonthGrid(byDate) {
  const wrap = document.getElementById('ical-grid-wrap');
  const first = new Date(icalYear, icalMonth, 1);
  const lastDay = new Date(icalYear, icalMonth + 1, 0).getDate();
  let startDay = first.getDay() - 1;
  if (startDay < 0) startDay = 6;

  let html = '<div class="ical-grid">';
  DAYS.forEach(d => { html += '<div class="ical-hdr">' + d + '</div>'; });

  const prevLast = new Date(icalYear, icalMonth, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevLast - i;
    html += '<div class="ical-day outside"><div class="ical-day-num">' + d + '</div></div>';
  }

  const tStr = todayStr();
  for (let d = 1; d <= lastDay; d++) {
    const ds = fmtDate(new Date(icalYear, icalMonth, d));
    const isToday = ds === tStr;
    const isSel = ds === icalSelectedDate;
    const dayEvents = byDate[ds] || [];
    const dots = dayEvents.map(e => '<div class="ical-day-dot ' + e.category + '"></div>').join('');
    html += '<div class="ical-day' + (isToday ? ' today' : '') + (isSel ? ' selected' : '') + '" onclick="selectCalDay(\'' + ds + '\')">';
    html += '<div class="ical-day-num">' + d + '</div>';
    if (dayEvents.length > 0) html += '<div class="ical-day-dots">' + dots + '</div>';
    html += '</div>';
  }

  const totalCells = startDay + lastDay;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    html += '<div class="ical-day outside"><div class="ical-day-num">' + i + '</div></div>';
  }

  html += '</div>';
  wrap.innerHTML = html;
}

function renderWeekGrid(byDate) {
  const wrap = document.getElementById('ical-grid-wrap');
  const tStr = todayStr();

  let html = '<div class="ical-grid">';
  DAYS.forEach(d => { html += '<div class="ical-hdr">' + d + '</div>'; });

  for (let i = 0; i < 7; i++) {
    const dt = new Date(icalWeekStart);
    dt.setDate(dt.getDate() + i);
    const ds = fmtDate(dt);
    const isToday = ds === tStr;
    const isSel = ds === icalSelectedDate;
    const dayEvents = byDate[ds] || [];
    const evHtml = dayEvents.map(e => {
      const timeStr = e.time ? '<span style="color:var(--brass);font-size:9px">' + e.time + '</span> ' : '';
      return '<div class="ical-day-event"><div class="mc-dot ' + e.category + '"></div>' + timeStr + e.title + '</div>';
    }).join('');

    html += '<div class="ical-day' + (isToday ? ' today' : '') + (isSel ? ' selected' : '') + '" style="min-height:100px" onclick="selectCalDay(\'' + ds + '\')">';
    html += '<div class="ical-day-num">' + dt.getDate() + '</div>';
    html += evHtml;
    html += '</div>';
  }

  html += '</div>';
  wrap.innerHTML = html;
}

async function selectCalDay(dateStr) {
  icalSelectedDate = dateStr;
  const events = await getMonthEvents(parseInt(dateStr.split('-')[0]), parseInt(dateStr.split('-')[1]) - 1);
  const dayEvents = events.filter(e => e.start === dateStr);

  document.querySelectorAll('.ical-day').forEach(el => {
    const onclick = el.getAttribute('onclick');
    if (onclick && onclick.includes(dateStr)) el.classList.add('selected');
    else el.classList.remove('selected');
  });

  const detail = document.getElementById('ical-detail');
  if (dayEvents.length === 0) {
    detail.classList.remove('open');
    return;
  }
  const d = new Date(dateStr + 'T00:00:00');
  const label = d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  detail.innerHTML = '<div class="ical-detail-title">' + label + ' \u2014 ' + dayEvents.length + ' event' + (dayEvents.length > 1 ? 's' : '') + '</div>' +
    dayEvents.map(e =>
      '<div class="ical-detail-event"><div class="mc-dot ' + e.category + '"></div><span class="ical-detail-time">' + (e.time || 'All day') + '</span>' + e.title + '</div>'
    ).join('');
  detail.classList.add('open');
}
