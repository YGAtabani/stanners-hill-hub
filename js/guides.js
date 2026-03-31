// ═══════════════════════════════════════
//   GUIDES — detail view rendering
// ═══════════════════════════════════════

const GUIDE_CACHE = new Map();
let activeGuide = null;

async function openGuide(detailId) {
  activeGuide = detailId;
  const gridEl = document.getElementById('guides-grid');
  const detailEl = document.getElementById('guide-detail');
  gridEl.style.display = 'none';
  detailEl.style.display = 'block';
  detailEl.innerHTML = '<div class="guide-loading">Loading guide\u2026</div>';

  try {
    let guide = GUIDE_CACHE.get(detailId);
    if (!guide) {
      guide = await loadJSON('data/guides/' + detailId + '.json');
      GUIDE_CACHE.set(detailId, guide);
    }
    detailEl.innerHTML = renderGuideDetail(guide);
  } catch (e) {
    detailEl.innerHTML = '<div class="guide-loading">Unable to load guide \u2014 check back shortly</div>';
    console.warn('Guide load failed:', e);
  }
}

function closeGuide() {
  activeGuide = null;
  document.getElementById('guides-grid').style.display = '';
  var detailEl = document.getElementById('guide-detail');
  detailEl.style.display = 'none';
  detailEl.innerHTML = '';
}

function renderGuideDetail(guide) {
  var heroHtml = guide.hero && guide.hero.src
    ? '<div class="guide-hero"><img src="' + guide.hero.src + '" alt="' + (guide.hero.caption || guide.title) + '"><div class="guide-hero-caption">' + (guide.hero.caption || '') + '</div></div>'
    : '';

  var qrHtml = guide.quickRef
    ? '<div class="guide-qr">' + guide.quickRef.map(function(q) {
        return '<div class="guide-qr-pill"><span class="guide-qr-label">' + q.label + '</span><span class="guide-qr-value">' + q.value + '</span></div>';
      }).join('') + '</div>'
    : '';

  var statusHtml = guide.status
    ? '<span class="badge ' + guide.status.cls + '">' + guide.status.label + '</span>'
    : '';

  var sectionsHtml = guide.sections.map(function(s) {
    var blocksHtml = s.blocks.map(renderGuideBlock).join('');
    return '<div class="guide-section">' +
      '<div class="guide-section-hdr">' +
        '<span class="guide-section-icon">' + (s.icon || '') + '</span>' +
        '<span class="guide-section-title">' + s.title + '</span>' +
      '</div>' +
      '<div class="guide-section-body">' + blocksHtml + '</div>' +
    '</div>';
  }).join('');

  return '<div class="guide-back" onclick="closeGuide()">\u2190 Back to Systems & Guides</div>' +
    heroHtml +
    '<div class="guide-header">' +
      '<div><div class="guide-title">' + guide.title + '</div>' +
      '<div class="guide-subtitle">' + guide.subtitle + '</div></div>' +
      statusHtml +
    '</div>' +
    qrHtml +
    sectionsHtml;
}

function renderGuideBlock(block) {
  switch (block.type) {
    case 'text':
      return '<p class="guide-text">' + block.content + '</p>';

    case 'image':
      return '<div class="guide-img-wrap">' +
        '<img class="guide-img" src="' + block.src + '" alt="' + (block.alt || block.caption || '') + '" loading="lazy">' +
        (block.caption ? '<div class="guide-img-caption">' + block.caption + '</div>' : '') +
      '</div>';

    case 'steps':
      return '<div class="guide-steps">' +
        (block.title ? '<div class="guide-steps-title">' + block.title + '</div>' : '') +
        block.items.map(function(item, i) {
          return '<div class="guide-step"><div class="guide-step-n">' + (i + 1) + '</div><div class="guide-step-text">' + item + '</div></div>';
        }).join('') +
      '</div>';

    case 'warning':
      return '<div class="guide-callout guide-callout-warning"><span class="guide-callout-icon">\u26a0</span><div>' + block.content + '</div></div>';

    case 'info':
      return '<div class="guide-callout guide-callout-info"><span class="guide-callout-icon">\u2139</span><div>' + block.content + '</div></div>';

    case 'table':
      return '<div class="guide-table-wrap"><table class="tbl guide-tbl">' +
        '<thead><tr>' + block.headers.map(function(h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead>' +
        '<tbody>' + block.rows.map(function(row) {
          return '<tr>' + row.map(function(cell, ci) { return '<td' + (ci === 0 ? ' class="s"' : '') + '>' + cell + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody>' +
      '</table></div>';

    case 'checklist':
      return '<div class="guide-checklist">' +
        (block.title ? '<div class="guide-steps-title">' + block.title + '</div>' : '') +
        block.items.map(function(item) {
          return '<div class="guide-check-item"><span class="guide-check-box">\u25a1</span><span>' + item + '</span></div>';
        }).join('') +
      '</div>';

    case 'contacts':
      return '<div class="guide-contacts">' +
        block.items.map(function(c) {
          var lines = '<div class="guide-contact-name">' + c.name + '</div>';
          lines += '<div class="guide-contact-role">' + c.role + '</div>';
          if (c.phone) lines += '<div class="guide-contact-line">\u260e ' + c.phone + '</div>';
          if (c.email) lines += '<div class="guide-contact-line">\u2709 ' + c.email + '</div>';
          return '<div class="guide-contact-card">' + lines + '</div>';
        }).join('') +
      '</div>';

    default:
      return '<p class="guide-text">[Unknown block type: ' + block.type + ']</p>';
  }
}
