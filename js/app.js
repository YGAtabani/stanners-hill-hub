// ═══════════════════════════════════════
//   APP — theme, nav, charts, rendering, init
// ═══════════════════════════════════════

// ═══ DATE
document.getElementById('current-date').textContent = now.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'long',year:'numeric'});

// ═══ THEME
function toggleTheme(){
  const h = document.documentElement;
  const light = h.getAttribute('data-theme') === 'light';
  h.setAttribute('data-theme', light ? 'dark' : 'light');
  document.getElementById('theme-lbl').textContent = light ? 'Dark' : 'Light';
  localStorage.setItem('shh-theme', light ? 'dark' : 'light');
  updateChartColors();
}
const saved = localStorage.getItem('shh-theme');
if(saved){ document.documentElement.setAttribute('data-theme',saved); document.getElementById('theme-lbl').textContent = saved==='light'?'Light':'Dark'; }

// ═══ NAV
function show(id, el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('p-'+id).classList.add('active');
  el.classList.add('active');
}

// ═══ CHARTS
let donutChart, barChart, monthChart;
function getGridColor(){ return getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim() || 'rgba(255,255,255,0.06)'; }
function getTextColor(){ return getComputedStyle(document.documentElement).getPropertyValue('--text-dim').trim() || '#7a7060'; }

function updateChartColors(){
  if(!barChart) return;
  const gc = getGridColor(), tc = getTextColor();
  [barChart, monthChart].forEach(ch=>{
    if(!ch) return;
    if(ch.options.scales?.x){ ch.options.scales.x.grid.color=gc; ch.options.scales.x.ticks.color=tc; }
    if(ch.options.scales?.y){ ch.options.scales.y.grid.color=gc; ch.options.scales.y.ticks.color=tc; }
    ch.update();
  });
}

// ═══ TOUR
function activateTour(){ const url=document.getElementById('tour-url').value.trim(); if(url.includes('matterport.com')){ document.getElementById('tour-ph').style.display='none'; const f=document.getElementById('tour-iframe'); f.src=url; f.style.display='block'; } }

// ═══ INVENTORY
let invData = [];
let activeFlt = 'all';

const EQUIP_ICONS = {
  'Ride-On Mowers': '🚜', 'Walk-Behind Mowers': '🌿', 'Power Tools': '⚡', 'Hand Tools': '🔧',
  'Turf Care': '🌱', 'Spraying': '💧', 'Trailers & Towing': '🚛', 'Fuel & Fluids': '⛽',
  'Irrigation': '💦', 'Consumables': '📦', 'Workshop': '🔩', 'Safety & PPE': '🦺',
  'Electrical': '🔌', 'Chemicals': '🧪', 'Storage': '📁', 'Other': '⊞'
};

const EQUIP_PHOTOS = {
  'SHH-GE-014': 'photos/equipment/jd-x758.jpg',
  'SHH-GE-011': 'photos/equipment/countax-c60.jpg',
  'SHH-GE-012': 'photos/equipment/countax-c60.jpg',
  'SHH-GE-077': 'photos/equipment/hayter-56-pro.png',
  'SHH-GE-079': 'photos/equipment/hayter-41-pro.png',
  'SHH-GE-061': 'photos/equipment/echo-pb8010.png',
  'SHH-GE-018': 'photos/equipment/toro-proforce.jpg',
  'SHH-GE-025': 'photos/equipment/echo-srm2620.jpg',
  'SHH-GE-029': 'photos/equipment/echo-srm2620.jpg',
  'SHH-GE-030': 'photos/equipment/echo-srm2620.jpg',
  'SHH-GE-052': 'photos/equipment/stihl-gta26.jpg',
};

function equipThumb(id, cat) {
  const p = EQUIP_PHOTOS[id];
  if (p) return `<div class="inv-thumb" style="background:url('${p}') center/cover"></div>`;
  return `<div class="inv-thumb">${EQUIP_ICONS[cat] || '⊞'}</div>`;
}

function condDots(n) {
  const v = parseInt(n) || 0;
  const cls = v <= 2 ? 'low' : v <= 3 ? 'mid' : '';
  return Array.from({length: 5}, (_, i) =>
    `<div class="cond-dot${i < v ? ' filled' + (cls ? ' ' + cls : '') : ''}"></div>`
  ).join('');
}

function invStatusBadge(st) {
  const s = (st || '').toLowerCase();
  if (/serviceable/.test(s) && /service due/.test(s)) return { cls: 'b-amber', label: 'Service Due' };
  if (/serviceable/.test(s)) return { cls: 'b-green', label: 'Serviceable' };
  if (/functional|refurb/.test(s)) return { cls: 'b-amber', label: 'Refurb Needed' };
  if (/superseded|merged/.test(s)) return { cls: 'b-dim', label: 'Superseded' };
  if (/in stock/.test(s)) return { cls: 'b-blue', label: 'In Stock' };
  if (/present/.test(s)) return { cls: 'b-dim', label: 'Present' };
  if (/check/.test(s)) return { cls: 'b-red', label: 'Check Required' };
  return { cls: 'b-dim', label: st || '—' };
}

function renderInv(data) {
  document.getElementById('inv-body').innerHTML = data.map(d => {
    const b = invStatusBadge(d.status);
    return `<tr>
      <td>${equipThumb(d.assetId, d.groupCategory)}</td>
      <td><div class="inv-item-main">${d.description}</div><div class="inv-item-sub">${d.brand}${d.model ? ' · ' + d.model : ''}</div></td>
      <td><span class="inv-id">${d.assetId}</span></td>
      <td style="text-align:center">${d.qty}</td>
      <td><div class="cond-dots">${condDots(d.condition)}</div></td>
      <td style="font-size:11.5px;color:var(--text-dim)">${d.location}</td>
      <td style="font-size:12px;color:var(--text)">£${d.value}</td>
      <td style="font-size:11px;color:var(--text-dim)">${d.nextService}</td>
      <td><span class="badge ${b.cls}">${b.label}</span></td>
    </tr>`;
  }).join('');
}

function filterInv() {
  const q = document.getElementById('inv-q').value.toLowerCase();
  let d = invData;
  if (activeFlt !== 'all') d = d.filter(i => i.groupCategory === activeFlt);
  if (q) d = d.filter(i =>
    i.description.toLowerCase().includes(q) ||
    i.brand.toLowerCase().includes(q) ||
    i.model.toLowerCase().includes(q) ||
    i.location.toLowerCase().includes(q) ||
    i.assetId.toLowerCase().includes(q) ||
    i.status.toLowerCase().includes(q)
  );
  renderInv(d);
}

function setFlt(btn, cat) {
  activeFlt = cat;
  document.querySelectorAll('#inv-filters .flt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filterInv();
}

function buildInvFilters(data) {
  const cats = [...new Set(data.map(d => d.groupCategory))].sort();
  const el = document.getElementById('inv-filters');
  el.innerHTML = `<button class="flt active" onclick="setFlt(this,'all')">All (${data.length})</button>` +
    cats.map(c => {
      const count = data.filter(d => d.groupCategory === c).length;
      return `<button class="flt" onclick="setFlt(this,'${c}')">${c} (${count})</button>`;
    }).join('');
}

// ═══ GALLERY
let galData = [];
let galFiltered = [];
let activeGalCat = 'All';
let lbIndex = 0;

function renderGallery(images) {
  galFiltered = images;
  const grid = document.getElementById('gal-grid');
  if (!images.length) {
    grid.innerHTML = '<div class="gal-empty"><span class="gal-empty-icon">◩</span>No photos yet — upload images to your Vercel Blob store and add URLs to <code>data/gallery.json</code></div>';
    document.getElementById('gal-count').textContent = '0 photos';
    return;
  }
  document.getElementById('gal-count').textContent = images.length + ' photo' + (images.length !== 1 ? 's' : '');
  grid.innerHTML = images.map((img, i) =>
    `<div class="gal-card" onclick="openLightbox(${i})">
      <img class="gal-img" src="${img.src}" alt="${img.caption}" loading="lazy">
      <div class="gal-info">
        <div class="gal-caption">${img.caption}</div>
        <div class="gal-meta"><span>${img.category}</span><span>${img.date || ''}</span></div>
      </div>
    </div>`
  ).join('');
}

function filterGallery(btn, cat) {
  activeGalCat = cat;
  document.querySelectorAll('#gal-filters .flt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGallery(cat === 'All' ? galData : galData.filter(img => img.category === cat));
}

function openLightbox(i) {
  lbIndex = i;
  const img = galFiltered[i];
  document.getElementById('lb-img').src = img.src;
  document.getElementById('lb-caption').textContent = img.caption + (img.date ? ' — ' + img.date : '');
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(e) {
  if (e.target.tagName === 'IMG') return;
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

function navLightbox(e, dir) {
  e.stopPropagation();
  lbIndex = (lbIndex + dir + galFiltered.length) % galFiltered.length;
  const img = galFiltered[lbIndex];
  document.getElementById('lb-img').src = img.src;
  document.getElementById('lb-caption').textContent = img.caption + (img.date ? ' — ' + img.date : '');
}

document.addEventListener('keydown', function(e) {
  if (!document.getElementById('lightbox').classList.contains('open')) return;
  if (e.key === 'Escape') { document.getElementById('lightbox').classList.remove('open'); document.body.style.overflow = ''; }
  if (e.key === 'ArrowLeft') navLightbox(e, -1);
  if (e.key === 'ArrowRight') navLightbox(e, 1);
});

// ═══════════════════════════════════════
//   INIT APP — load data & render
// ═══════════════════════════════════════
async function initApp() {
  const worksSheetPromise = fetchSheet(WORKS_SHEET_URL).catch(e => {
    console.warn('Works sheet unavailable, using local data:', e.message);
    return null;
  });
  const equipSheetPromise = fetchEquipSheet().catch(e => {
    console.warn('Equipment sheet unavailable, using local data:', e.message);
    return null;
  });
  const calYearPromise = getYearEvents(now.getFullYear()).catch(e => {
    console.warn('Calendar API unavailable:', e.message);
    return null;
  });

  const [sheetRows, equipRows, estate, worksFallback, guides, inventoryFallback, suppliers, decoration, gallery, calEvents] = await Promise.all([
    worksSheetPromise,
    equipSheetPromise,
    loadJSON('data/estate.json'),
    loadJSON('data/works.json'),
    loadJSON('data/guides.json'),
    loadJSON('data/inventory.json'),
    loadJSON('data/suppliers.json'),
    loadJSON('data/decoration.json'),
    loadJSON('data/gallery.json'),
    calYearPromise,
  ]);

  const works = (sheetRows && sheetRows.length > 0) ? sheetToWorks(sheetRows) : worksFallback;
  if (sheetRows) console.log('✓ Works data live from Google Sheet (' + sheetRows.length + ' rows)');

  const liveEquip = equipRows && equipRows.length > 0;
  if (liveEquip) console.log('✓ Equipment data live from Google Sheet (' + equipRows.length + ' items)');

  // ── HERO
  document.getElementById('hero-eyebrow').textContent = estate.hero.eyebrow;
  document.getElementById('hero-title').innerHTML = estate.hero.title + ' <em>' + estate.hero.titleEmphasis + '</em>';
  document.getElementById('hero-pills').innerHTML = estate.hero.pills.map(p =>
    `<div class="hero-pill"><div><div class="pv">${p.value}</div><div class="pl">${p.label}</div></div></div>`
  ).join('');

  // ── KPIs
  const kpis = works.kpis;
  document.getElementById('kpi-row').innerHTML = [
    { key: 'activeWorks', ey: 'Active Works', fmt: v => v },
    { key: 'onHold', ey: 'On Hold', fmt: v => v },
    { key: 'completed', ey: 'Completed', fmt: v => v },
    { key: 'budget', ey: 'Budget', fmt: v => '<sup>£</sup>' + v },
  ].map(k => `<div class="stat"><div class="stat-ico">${kpis[k.key].icon}</div><div class="stat-ey">${k.ey}</div><div class="stat-v">${k.fmt(kpis[k.key].value)}</div><div class="stat-s">${kpis[k.key].description}</div></div>`).join('');

  // ── BUDGET LEGEND
  document.getElementById('budget-total').textContent = works.budgetTotal;
  document.getElementById('budget-legend').innerHTML = works.budgetByCategory.map(c =>
    `<div style="display:flex;align-items:center;gap:7px;font-size:12px"><div style="width:7px;height:7px;border-radius:50%;background:${c.color};flex-shrink:0"></div><span style="flex:1;color:var(--text-dim)">${c.name}</span><span style="color:var(--text);font-weight:500">£${c.amount}k</span></div>`
  ).join('');

  // ── SPEND STATUS
  document.getElementById('spend-status').innerHTML = works.spendStatus.map(s =>
    `<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:var(--text-dim)">${s.label}</span><span style="color:${s.color}">${s.amount} (${s.percent}%)</span></div><div class="prog"><div class="prog-f" style="width:${s.percent}%;background:linear-gradient(90deg,${s.gradientFrom},${s.gradientTo})"></div></div></div>`
  ).join('');

  // ── WORKS TABLE
  document.getElementById('works-count').textContent = works.worksTable.length + ' items';
  document.getElementById('works-body').innerHTML = works.worksTable.map(w =>
    `<tr><td class="s">${w.item}</td><td>${w.cost}</td><td><span class="badge ${w.statusClass}">${w.statusLabel}</span></td></tr>`
  ).join('');

  // ── SYSTEMS HEALTH GAUGES
  const sh = estate.systemsHealth;
  const half = Math.ceil(sh.length / 2);
  const gaugeHTML = (items) => items.map(g =>
    `<div class="gauge-item"><svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="28" fill="none" stroke="var(--surface3)" stroke-width="7"/><circle cx="36" cy="36" r="28" fill="none" stroke="${g.color}" stroke-width="7" stroke-dasharray="${g.arc} 175.9" stroke-dashoffset="44" transform="rotate(-90 36 36)"/><text x="36" y="40" text-anchor="middle" font-size="${g.fontSize}" font-family="${g.fontSize > 10 ? 'Playfair Display,serif' : 'DM Sans,sans-serif'}" fill="${g.textColor}">${g.status}</text></svg><div class="gauge-val">${g.name}</div><div class="gauge-lbl">${g.label}</div></div>`
  ).join('');
  document.getElementById('systems-gauges').innerHTML =
    `<div class="gauge-row">${gaugeHTML(sh.slice(0, half))}</div><div class="gauge-row">${gaugeHTML(sh.slice(half))}</div>`;

  // ── ESTATE FACTS
  document.getElementById('estate-facts').innerHTML = estate.facts.map(f =>
    `<li><span class="k">${f.key}</span><span class="v">${f.value}</span></li>`
  ).join('');

  // ── CALENDAR (from Google Calendar API)
  const fc = document.getElementById('full-calendar');
  const mi = now.getMonth();
  if (calEvents) {
    console.log('\u2713 Calendar data live from Google Calendar (' + calEvents.length + ' events)');
    const SEASON_MAP = {0:'Winter',1:'Winter',2:'Early Spring',3:'Spring',4:'Spring',5:'Early Summer',6:'Summer',7:'Summer',8:'Early Autumn',9:'Autumn',10:'Late Autumn',11:'Winter'};
    fc.innerHTML = MONTHS.map((month, i) => {
      const prefix = now.getFullYear() + '-' + String(i + 1).padStart(2, '0');
      const monthEvents = calEvents.filter(e => e.start.startsWith(prefix));
      const isNow = i === mi;
      const tasks = monthEvents.map(e => '<div class="mc-task"><div class="mc-dot ' + e.category + '"></div>' + e.title + '</div>').join('');
      const empty = monthEvents.length === 0 ? '<div style="font-size:11px;color:var(--text-dim);padding:4px 0">No events</div>' : '';
      return '<div class="mc' + (isNow ? ' now' : '') + '"><div class="mch"><span class="mc-name">' + month + (isNow ? '<span style="font-size:9px;color:var(--brass);margin-left:8px;font-family:\'DM Sans\',sans-serif;letter-spacing:0.12em;text-transform:uppercase"> Now</span>' : '') + '</span><span class="mc-season">' + SEASON_MAP[i] + '</span></div><div class="mc-tasks">' + (tasks || empty) + '</div></div>';
    }).join('');

    const thisMonthPrefix = now.getFullYear() + '-' + String(mi + 1).padStart(2, '0');
    const thisMonthEvents = calEvents.filter(e => e.start.startsWith(thisMonthPrefix));
    document.getElementById('this-month-name').textContent = MONTHS[mi];
    document.getElementById('this-month-tasks').innerHTML = thisMonthEvents.length > 0
      ? thisMonthEvents.map(e => '<div class="mc-task"><div class="mc-dot ' + e.category + '"></div>' + e.title + '</div>').join('')
      : '<div style="font-size:11px;color:var(--text-dim);padding:4px 0">No events this month</div>';
  } else {
    fc.innerHTML = '<div class="cal-error">Unable to load calendar \u2014 check back shortly</div>';
    document.getElementById('this-month-name').textContent = MONTHS[mi];
    document.getElementById('this-month-tasks').innerHTML = '<div style="font-size:11px;color:var(--text-dim);padding:4px 0">Calendar unavailable</div>';
  }

  renderInteractiveCal();

  // ── GUIDES
  const gg = document.getElementById('guides-grid');
  gg.innerHTML = guides.map(g => {
    const steps = g.steps.map((s, i) => `<div class="gc-step"><div class="gs-n">${i + 1}</div>${s}</div>`).join('');
    return `<div class="gc"><div class="gc-top"><span class="gc-icon">${g.icon}</span><div class="gc-title">${g.title}</div><div class="gc-sub">${g.sub}</div><div class="gc-status"><span class="badge ${g.status.cls}">${g.status.label}</span></div></div><div class="gc-steps">${steps}</div></div>`;
  }).join('');

  // ── INVENTORY
  if (liveEquip) {
    invData = equipRows;
    document.getElementById('inv-source').textContent = 'Live · Google Sheets';
    const totalUnits = invData.reduce((s, d) => s + d.qty, 0);
    const totalValue = invData.reduce((s, d) => s + d.value, 0);
    document.getElementById('inv-count').textContent = invData.length;
    document.getElementById('inv-units').textContent = totalUnits;
    document.getElementById('inv-value').textContent = '£' + totalValue.toLocaleString();
  } else {
    invData = inventoryFallback.map(d => ({
      assetId: '—', category: d.category, groupCategory: d.category,
      description: d.name, brand: d.contact || '', model: '',
      qty: 1, condition: 3, location: d.location, value: 0,
      nextService: '—', status: d.statusLabel || d.service, notes: d.service, photo: ''
    }));
    document.getElementById('inv-source').textContent = 'Offline · Local data';
    document.getElementById('inv-source').classList.replace('b-green', 'b-dim');
    document.getElementById('inv-count').textContent = invData.length;
    document.getElementById('inv-units').textContent = invData.length;
    document.getElementById('inv-value').textContent = '—';
  }
  buildInvFilters(invData);
  renderInv(invData);

  // ── SUPPLIERS
  const sg = document.getElementById('supplier-grid');
  sg.innerHTML = suppliers.map(s =>
    `<div class="supplier-card"><div class="sc-cat">${s.category}</div><div class="sc-name">${s.name}</div>${s.rows.map(r => `<div class="sc-row">↗ ${r}</div>`).join('')}${s.addContact ? '<div class="sc-add">⚑ Add phone & email</div>' : ''}</div>`
  ).join('');

  // ── DECORATION
  document.getElementById('deco-open-count').textContent = decoration.openQuestions + ' open questions';
  document.getElementById('room-grid').innerHTML = decoration.rooms.map(r => {
    const rows = r.rows.map(row => {
      if (row.badgeClass) {
        return `<div class="rc-row"><span>${row.label}</span><span class="badge ${row.badgeClass}">${row.badgeText}</span></div>`;
      }
      return `<div class="rc-row"><span>${row.label}</span><span style="font-size:11px;color:var(--text-dim)">${row.badgeText}</span></div>`;
    }).join('');
    return `<div class="room-card"><div class="rc-stripe" style="background:${r.stripeColor}"></div><div class="rc-body"><div class="rc-name">${r.name}</div>${rows}</div></div>`;
  }).join('');
  document.getElementById('wallpaper-tracker').innerHTML = decoration.tracker.map(t => {
    if (t.alert) {
      return `<li><span class="k" style="color:#e07050">${t.key}</span><span style="color:#e07050;font-size:12px">${t.value}</span></li>`;
    }
    return `<li><span class="k">${t.key}</span><span class="v">${t.value}</span></li>`;
  }).join('');

  // ── GALLERY
  galData = gallery.images || [];
  const galCats = gallery.categories || ['All'];
  document.getElementById('gal-filters').innerHTML = galCats.map(c => {
    const count = c === 'All' ? galData.length : galData.filter(img => img.category === c).length;
    return `<button class="flt${c === 'All' ? ' active' : ''}" onclick="filterGallery(this,'${c}')">${c} (${count})</button>`;
  }).join('');
  renderGallery(galData);

  // ── CHARTS (after data loaded)
  donutChart = new Chart(document.getElementById('donutChart'), {
    type: 'doughnut',
    data: {
      datasets: [{
        data: works.budgetByCategory.map(c => c.amount),
        backgroundColor: works.budgetByCategory.map(c => c.color),
        borderWidth: 0, hoverOffset: 4
      }]
    },
    options: {
      cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' £' + c.raw + 'k' } } },
      animation: { animateRotate: true, duration: 1200 }
    }
  });

  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: works.spendBySupplier.map(s => s.name),
      datasets: [{
        data: works.spendBySupplier.map(s => s.amount),
        backgroundColor: works.spendBySupplier.map(s => s.bgColor),
        borderColor: works.spendBySupplier.map(s => s.borderColor),
        borderWidth: 1, borderRadius: 3,
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' £' + c.raw + 'k' } } },
      scales: {
        x: { grid: { color: getGridColor() }, ticks: { color: getTextColor(), callback: v => '£' + v + 'k' }, border: { display: false } },
        y: { grid: { display: false }, ticks: { color: getTextColor(), font: { size: 11 } } }
      },
      animation: { duration: 1000 }
    }
  });

  // ── MONTH TASK CHART (from live calendar data)
  const monthChartCtx = document.getElementById('monthTaskChart');
  if (monthChartCtx && calEvents) {
    const mPrefix = now.getFullYear() + '-' + String(mi + 1).padStart(2, '0');
    const mEvents = calEvents.filter(e => e.start.startsWith(mPrefix));
    const catCounts = { dg: 0, dp: 0, ds: 0, dm: 0, other: 0 };
    mEvents.forEach(e => { catCounts[e.category] = (catCounts[e.category] || 0) + 1; });
    const catLabels = { dg: 'Garden', dp: 'Pest', ds: 'Systems', dm: 'Maintenance', other: 'Other' };
    const catColors = { dg: 'rgba(74,122,78,0.7)', dp: 'rgba(138,106,42,0.7)', ds: 'rgba(58,122,138,0.7)', dm: 'rgba(201,168,76,0.7)', other: 'rgba(106,106,106,0.7)' };
    const catBorders = { dg: '#4a7a4e', dp: '#8a6a2a', ds: '#3a7a8a', dm: '#c9a84c', other: '#6a6a6a' };
    const cats = Object.keys(catCounts).filter(c => catCounts[c] > 0);
    monthChart = new Chart(monthChartCtx, {
      type: 'bar',
      data: {
        labels: cats.map(c => catLabels[c]),
        datasets: [{
          data: cats.map(c => catCounts[c]),
          backgroundColor: cats.map(c => catColors[c]),
          borderColor: cats.map(c => catBorders[c]),
          borderWidth: 1, borderRadius: 3,
        }]
      },
      options: {
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.raw + ' task' + (c.raw !== 1 ? 's' : '') } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: getTextColor(), font: { size: 10 } } },
          y: { grid: { color: getGridColor() }, ticks: { color: getTextColor(), stepSize: 1 }, border: { display: false } }
        },
        animation: { duration: 800 }
      }
    });
  }
}

// ── Launch
window.addEventListener('load', initApp);
