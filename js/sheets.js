// ═══════════════════════════════════════
//   GOOGLE SHEETS INTEGRATION
// ═══════════════════════════════════════

const SHEET_ID = '1A-MgdU1YXJOESywEFwDbonYTnoCSuXCX56pgmDPTmtU';
const WORKS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&headers=0';

const EQUIP_SHEET_ID = '1z7W95FDmF4zqWGTgE8s-siWuZMmzj6FQ';
const EQUIP_SHEET_URL = 'https://docs.google.com/spreadsheets/d/' + EQUIP_SHEET_ID + '/export?format=csv';

async function fetchSheet(url) {
  const res = await fetch(url + '&_=' + Date.now());
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const csv = await res.text();
  const rows = parseCSV(csv);
  if (rows.length < 2) throw new Error('Empty sheet');
  const FALLBACK = ['item','status','frequency','price','supplier','source','description','vat_included'];
  const hdr = rows[0].map((h, i) => {
    const name = h.toLowerCase().replace(/\s+/g, '_').trim();
    return name || (FALLBACK[i] || 'col_' + i);
  });
  return rows.slice(1).filter(r => r[0] && r[0].trim()).map(r => {
    const o = {};
    hdr.forEach((h, i) => o[h] = (r[i] || '').trim());
    return o;
  });
}

// ── Works data transformation
const CAT_MAP = { Garden:'#4a7a4e', Security:'#c9a84c', 'Interior / AV':'#8a4a2a', Pool:'#3a8a7a', Other:'#5a5a7a' };

function categorize(item, sup) {
  const i = (item||'').toLowerCase(), s = (sup||'').toLowerCase();
  if (/pool|swimming/.test(i) || /lagoon/.test(s)) return 'Pool';
  if (/security|gate|lock|alarm|camera/.test(i) || /niche|try security|citygate/.test(s)) return 'Security';
  if (/garden|graden|fencing|fence|irrigation|machin/.test(i) || /landscape|wesson|wetlands|clifton|beautiful/.test(s)) return 'Garden';
  if (/refurb|paint|electrical|audio|visual|curtain|lift/.test(i) || /rio|ati|kinetic|osman|albanian/.test(s)) return 'Interior / AV';
  return 'Other';
}

function sBadge(st) {
  const s = (st||'').toLowerCase().trim();
  if (s === 'complete') return {cls:'b-green',label:'Done'};
  if (/on-?going/.test(s)) return {cls:'b-amber',label:'Active'};
  if (s === 'on hold') return {cls:'b-blue',label:'On Hold'};
  return {cls:'b-dim',label:'TBC'};
}

function sheetToWorks(rows) {
  const items = rows.filter(r => r.item);
  const active = items.filter(r => /on-?going/i.test(r.status));
  const hold = items.filter(r => /on hold/i.test(r.status));
  const done = items.filter(r => /complete/i.test(r.status));
  const total = items.reduce((s, r) => s + parsePrice(r.price), 0);

  // Budget by category
  const ct = {};
  items.forEach(r => { const c = categorize(r.item, r.supplier); ct[c] = (ct[c]||0) + parsePrice(r.price); });
  const budgetByCategory = Object.entries(CAT_MAP).filter(([c]) => (ct[c]||0) > 0).map(([name, color]) => ({name, amount: Math.round((ct[name]||0)/100)/10, color}));

  // Spend by supplier (top 6)
  const sup = {};
  items.forEach(r => { if (r.supplier && parsePrice(r.price)) sup[r.supplier] = (sup[r.supplier]||0) + parsePrice(r.price); });
  const barC = [['rgba(74,122,78,0.7)','#4a7a4e'],['rgba(138,74,42,0.7)','#8a4a2a'],['rgba(201,168,76,0.7)','#c9a84c'],['rgba(58,138,122,0.7)','#3a8a7a'],['rgba(74,122,78,0.5)','#4a7a4e'],['rgba(201,168,76,0.5)','#c9a84c']];
  const spendBySupplier = Object.entries(sup).sort((a, b) => b[1]-a[1]).slice(0, 6).map(([name, amt], i) => ({name, amount: Math.round(amt/100)/10, bgColor: barC[i%6][0], borderColor: barC[i%6][1]}));

  // Spend status breakdown
  const g = {c:0, o:0, h:0};
  items.forEach(r => { const p = parsePrice(r.price), s = (r.status||'').toLowerCase().trim(); if (s==='complete') g.c+=p; else if (/on-?going/.test(s)) g.o+=p; else if (s==='on hold') g.h+=p; });
  const sT = g.c + g.o + g.h || 1;
  const spendStatus = [
    {label:'Complete', amount:'£'+fmtK(g.c), percent:Math.round(g.c/sT*100), color:'#7ac47e', gradientFrom:'#3a6a3e', gradientTo:'#4a8a4e'},
    {label:'On-going', amount:'~£'+fmtK(g.o), percent:Math.round(g.o/sT*100), color:'#c4943a', gradientFrom:'#7a5020', gradientTo:'#c4943a'},
    {label:'On Hold', amount:'£'+fmtK(g.h), percent:Math.round(g.h/sT*100), color:'#5abcaa', gradientFrom:'#2a5a6a', gradientTo:'#3a8a9a'}
  ];

  // Works table — sorted: active -> on hold -> done -> tbc
  const ord = {'b-amber':0, 'b-blue':1, 'b-green':2, 'b-dim':3};
  const worksTable = items.map(r => {
    const b = sBadge(r.status), p = parsePrice(r.price);
    return {item: r.item, cost: p > 0 ? '£'+p.toLocaleString() : 'TBC', statusClass: b.cls, statusLabel: b.label};
  }).sort((a, b) => (ord[a.statusClass]||3) - (ord[b.statusClass]||3));

  return {
    kpis: {
      activeWorks: {value: active.length, description: active.map(r => r.item).slice(0,3).join(' · ') || '—', icon: '🏗'},
      onHold: {value: hold.length, description: 'Awaiting approval', icon: '⏳'},
      completed: {value: done.length, description: done.map(r => r.item).slice(0,3).join(' · ') || '—', icon: '✓'},
      budget: {value: fmtK(total), description: items.length + ' line items', icon: '💷'}
    },
    budgetByCategory, budgetTotal: '£'+fmtK(total), spendBySupplier, spendStatus, worksTable
  };
}

// ── Equipment sheet parser
function equipCategory(cat) {
  if (!cat) return 'Other';
  const c = cat.toLowerCase();
  if (/ride-on|garden tractor/.test(c)) return 'Ride-On Mowers';
  if (/walk-behind/.test(c)) return 'Walk-Behind Mowers';
  if (/power tool|strimmer|trimmer|blower|saw/.test(c)) return 'Power Tools';
  if (/hand tool|axe|cutting|digging|raking|paint/.test(c)) return 'Hand Tools';
  if (/turf care|aeration|spreading/.test(c)) return 'Turf Care';
  if (/spray/.test(c)) return 'Spraying';
  if (/trailer|tow|hitch/.test(c)) return 'Trailers & Towing';
  if (/fuel|fluid|oil|lubricant/.test(c)) return 'Fuel & Fluids';
  if (/irrigation|hose|watering/.test(c)) return 'Irrigation';
  if (/consumable|fixings|strimmer line/.test(c)) return 'Consumables';
  if (/lifting|tool storage|workbench|screwdriver|miscell/.test(c)) return 'Workshop';
  if (/safety|ppe|pest|fire/.test(c)) return 'Safety & PPE';
  if (/electrical|radio|extension/.test(c)) return 'Electrical';
  if (/chemical|plant care/.test(c)) return 'Chemicals';
  if (/storage/.test(c)) return 'Storage';
  return 'Other';
}

async function fetchEquipSheet() {
  const res = await fetch(EQUIP_SHEET_URL + '&_=' + Date.now());
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const csv = await res.text();
  const rows = parseCSV(csv);
  const hdrIdx = rows.findIndex(r => r.some(c => /asset\s*id/i.test(c)));
  if (hdrIdx < 0) throw new Error('Header row not found');
  const hdr = rows[hdrIdx];
  const col = (pattern) => hdr.findIndex(h => pattern.test(h));
  const CI = {
    no: col(/item\s*no/i),
    id: col(/asset\s*id/i),
    cat: col(/category/i),
    desc: col(/item\s*desc/i),
    brand: col(/make.*brand/i),
    model: col(/model.*series/i),
    serial: col(/serial/i),
    qty: col(/qty/i),
    unit: col(/unit/i),
    cond: col(/cond/i),
    loc: col(/location/i),
    year: col(/year/i),
    value: col(/est.*value/i),
    lastService: col(/last\s*service/i),
    nextService: col(/next\s*service/i),
    status: col(/operational/i),
    notes: col(/notes/i),
    photo: col(/photo/i),
  };
  const g = (r, k) => (r[CI[k]] || '').trim();

  return rows.slice(hdrIdx + 1)
    .filter(r => {
      const id = (r[CI.id] || '').trim();
      const status = (r[CI.status] || '').toLowerCase();
      return id.startsWith('SHH-') && !/superseded/.test(status);
    })
    .map(r => {
      const rawCat = g(r, 'cat');
      const groupCategory = equipCategory(rawCat);
      return {
        assetId: g(r, 'id'),
        category: rawCat,
        groupCategory,
        description: g(r, 'desc').replace(/\s*★.*$/, '').replace(/\s*–\s*Unit \d+ of \d+/, ''),
        brand: g(r, 'brand').replace(/\s*★.*$/, '').replace(/\(.*\)/, '').trim(),
        model: g(r, 'model').replace(/\s*★.*$/, '').trim(),
        qty: parseInt(g(r, 'qty')) || 1,
        condition: parseInt(g(r, 'cond')) || 0,
        location: g(r, 'loc'),
        value: parseInt(g(r, 'value').replace(/[^0-9]/g, '')) || 0,
        nextService: g(r, 'nextService') === '–' ? '—' : g(r, 'nextService'),
        status: g(r, 'status'),
        notes: g(r, 'notes'),
        photo: g(r, 'photo'),
      };
    });
}
