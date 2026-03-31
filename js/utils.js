// ═══════════════════════════════════════
//   SHARED UTILITIES
// ═══════════════════════════════════════

const now = new Date();
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i <= text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i+1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else if (c === undefined) { row.push(field); rows.push(row); }
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(field.trim()); field = ''; }
      else if (c === '\n' || c === '\r' || c === undefined) {
        row.push(field.trim()); field = '';
        if (row.some(v => v !== '')) rows.push(row);
        row = [];
        if (c === '\r' && text[i+1] === '\n') i++;
      } else field += c;
    }
  }
  return rows;
}

function parsePrice(s) { return s ? parseFloat(s.replace(/[^0-9.]/g, '')) || 0 : 0; }
function fmtK(n) { return n >= 1000 ? (n/1000).toFixed(1).replace(/\.0$/,'') + 'k' : n ? n.toLocaleString() : '0'; }

async function loadJSON(path) {
  const res = await fetch(path);
  return res.json();
}

function fmtDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function todayStr() { return fmtDate(now); }

function getWeekStart(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
