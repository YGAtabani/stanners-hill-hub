function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const CATEGORY_MAP = {
  'grounds':     'dg',
  'maintenance': 'dm',
  'pest':        'dp',
  'systems':     'ds',
};

function parseCategory(summary) {
  const match = summary.match(/^\[(\w+)\]\s*/);
  if (!match) return { category: 'other', title: escapeHtml(summary) };
  const prefix = match[1].toLowerCase();
  return {
    category: CATEGORY_MAP[prefix] || 'other',
    title: escapeHtml(summary.replace(match[0], '')),
  };
}

function formatEvent(item) {
  const { category, title } = parseCategory(item.summary || '');
  const startDate = item.start.date || item.start.dateTime;
  const endDate = item.end.date || item.end.dateTime;
  const allDay = !!item.start.date;
  let time = null;
  if (!allDay && item.start.dateTime) {
    time = item.start.dateTime.slice(11, 16);
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
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
