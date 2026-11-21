/**
 * GTA VI Trophy Guide & Tracker — rewritten from scratch
 * Offline-only static app, no runtime network fetches
 */

const STORAGE_KEY = 'gta6-trophy-progress-v1';
const DATA_FILE = 'data/trophies.json';

/** @type {Trophy[]} */
let trophies = [];
/** @type {Set<string>} */
let earned = new Set();
/** @type {Trophy|null} */
let selected = null;
/** @type {string} */
let filterKind = 'all';
/** @type {string} */
let filterGrade = 'all';
/** @type {string} */
let searchTerm = '';
/** @type {boolean} */
let spoilerOn = false;
/** @type {'list'|'roadmap'} */
let viewMode = 'list';

/* DOM refs — IDs match index.html exactly */
const trophyList = document.getElementById('trophyList');
const sidebarStats = document.getElementById('sidebarStats');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const detailPlaceholder = document.getElementById('detailPlaceholder');
const detailContent = document.getElementById('detailContent');
const roadmapPanel = document.getElementById('roadmapPanel');
const roadmapStages = document.getElementById('roadmapStages');

const selKind = document.getElementById('filterKind');
const selGrade = document.getElementById('filterGrade');
const inpSearch = document.getElementById('searchInput');
const chkSpoiler = document.getElementById('spoilerCheckbox');
const btnExport = document.getElementById('btnExport');
const inpImport = document.getElementById('fileImport');
const btnRoadmap = document.getElementById('btnRoadmap');

const detGrade = document.getElementById('detailGrade');
const detName = document.getElementById('detailName');
const detDesc = document.getElementById('detailDescription');
const detGuide = document.getElementById('detailGuide');
const detMeta = document.getElementById('detailMeta');
const detEarned = document.getElementById('detailEarned');

/* ── Data loading ── */
async function loadTrophies() {
  try {
    const res = await fetch(DATA_FILE);
    const json = await res.json();
    trophies = Array.isArray(json) ? json : (json.trophies ?? []);
    trophies.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  } catch (e) {
    console.error('Failed to load trophies:', e);
    trophies = [];
  }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) earned = new Set(JSON.parse(raw));
  } catch { earned = new Set(); }
}

function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned])); }
  catch (e) { console.error('Save failed:', e); }
}

/* ── Filter helpers ── */
function kindCounts() {
  const c = {};
  for (const t of trophies) c[t.kind] = (c[t.kind] || 0) + 1;
  return c;
}

function gradeCounts() {
  const c = {};
  for (const t of trophies) c[t.grade] = (c[t.grade] || 0) + 1;
  return c;
}

function updateFilterBadges() {
  const kc = kindCounts();
  for (const opt of selKind.options) {
    const v = opt.value;
    opt.textContent = v === 'all'
      ? `All trophies (${trophies.length})`
      : `${v[0].toUpperCase() + v.slice(1)} (${kc[v] ?? 0})`;
  }
  const gc = gradeCounts();
  for (const opt of selGrade.options) {
    const v = opt.value;
    opt.textContent = v === 'all'
      ? `All grades (${trophies.length})`
      : `${v[0].toUpperCase() + v.slice(1)} (${gc[v] ?? 0})`;
  }
}

function isSpoilerHidden(t) {
  return spoilerOn && t.kind === 'story' && !earned.has(t.name);
}

function matchesFilters(t) {
  if (filterKind !== 'all' && t.kind !== filterKind) return false;
  if (filterGrade !== 'all' && t.grade !== filterGrade) return false;
  if (searchTerm && !t.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !t.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !t.guide.toLowerCase().includes(searchTerm.toLowerCase())) return false;
  return true;
}

function visibleTrophies() {
  return trophies.filter(t => !isSpoilerHidden(t) && matchesFilters(t));
}

/* ── Progress UI ── */
function refreshProgress() {
  const total = trophies.length;
  const got = earned.size;
  const pct = total ? (got / total) * 100 : 0;
  progressFill.style.width = `${pct}%`;
  progressText.textContent = `${got} of ${total} earned`;
}

function refreshSidebarStats() {
  const vis = visibleTrophies();
  const got = vis.filter(t => earned.has(t.name)).length;
  sidebarStats.textContent = `${got} / ${vis.length} shown`;
}

/* ── List rendering ── */
function gradeClass(g) {
  return `grade-${g}`;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function renderTrophyList() {
  const arr = visibleTrophies();
  trophyList.innerHTML = '';
  for (const t of arr) {
    const li = document.createElement('li');
    li.className = `trophy-item ${gradeClass(t.grade)} ${earned.has(t.name) ? 'earned' : ''} ${t.missable ? 'missable' : ''}`;
    li.dataset.name = t.name;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', selected?.name === t.name ? 'true' : 'false');
    li.tabIndex = 0;
    li.innerHTML = `
      <span class="trophy-grade">${t.grade[0].toUpperCase()}</span>
      <span class="trophy-name">${escapeHtml(t.name)}${t.missable ? ' <span class="missable-badge" aria-label="Missable">⚠</span>' : ''}</span>
      <input type="checkbox" class="trophy-check" ${earned.has(t.name) ? 'checked' : ''} aria-label="Mark ${escapeHtml(t.name)} as earned">
    `;
    li.addEventListener('click', e => {
      if (e.target.type === 'checkbox') return;
      selectTrophy(t);
    });
    li.querySelector('.trophy-check').addEventListener('change', e => {
      toggleEarned(t.name, e.target.checked);
    });
    trophyList.appendChild(li);
  }
  refreshSidebarStats();
  if (!selected || !arr.includes(selected)) {
    const first = arr[0];
    if (first) selectTrophy(first);
    else { detailPlaceholder.hidden = false; detailContent.hidden = true; selected = null; }
  }
}

/* ── Keyboard navigation for list ── */
function setupListKeyboardNav() {
  trophyList.addEventListener('keydown', e => {
    const items = [...trophyList.querySelectorAll('.trophy-item')];
    if (!items.length) return;
    const idx = items.findIndex(li => li.dataset.name === selected?.name);
    let next = idx;
    if (e.key === 'ArrowDown') next = Math.min(idx + 1, items.length - 1);
    else if (e.key === 'ArrowUp') next = Math.max(idx - 1, 0);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTrophy(items[idx]?.dataset.name ? trophies.find(t => t.name === items[idx].dataset.name) : null); return; }
    else return;
    e.preventDefault();
    if (next >= 0 && next < items.length) {
      const t = trophies.find(t => t.name === items[next].dataset.name);
      if (t) selectTrophy(t);
      items[next].focus();
    }
  });
}

/* ── Detail panel ── */
function selectTrophy(t) {
  selected = t;
  document.querySelectorAll('.trophy-item').forEach(li => {
    li.setAttribute('aria-selected', li.dataset.name === t.name);
  });
  detailPlaceholder.hidden = true;
  detailContent.hidden = false;
  detGrade.textContent = t.grade[0].toUpperCase();
  detGrade.className = `detail-grade ${gradeClass(t.grade)}`;
  detName.textContent = t.name;
  detDesc.textContent = t.description;
  detGuide.innerHTML = t.guide;
  detMeta.innerHTML = `
    <dt>Kind</dt><dd>${t.kind[0].toUpperCase() + t.kind.slice(1)}</dd>
    <dt>Grade</dt><dd>${t.grade[0].toUpperCase() + t.grade.slice(1)}</dd>
    <dt>Missable</dt><dd>${t.missable ? 'Yes ⚠' : 'No'}</dd>
    <dt>Source</dt><dd><a href="${t.source_url}" target="_blank" rel="noopener">PSNProfiles</a></dd>
    <dt>Roadmap Stage</dt><dd>${t.roadmap_stage}</dd>
  `;
  detEarned.checked = earned.has(t.name);
}

function toggleEarned(name, on) {
  if (on) earned.add(name); else earned.delete(name);
  saveProgress();
  refreshProgress();
  renderTrophyList();
  if (selected?.name === name) detEarned.checked = on;
  renderRoadmap();
}

/* ── Roadmap ── */
function buildStages() {
  const map = new Map();
  for (const t of trophies) {
    const s = t.roadmap_stage ?? 'Other';
    if (!map.has(s)) map.set(s, { title: s, trophies: [] });
    map.get(s).trophies.push(t);
  }
  const order = ['Story', 'Collectibles', 'Activities', 'Completion', '100% Finale', 'Other'];
  return order.filter(k => map.has(k)).map(k => map.get(k));
}

function renderRoadmap() {
  roadmapStages.innerHTML = '';
  const stages = buildStages();
  for (let i = 0; i < stages.length; i++) {
    const st = stages[i];
    const total = st.trophies.length;
    const got = st.trophies.filter(t => earned.has(t.name)).length;
    const div = document.createElement('div');
    div.className = 'roadmap-stage';
    div.innerHTML = `
      <div class="stage-header">
        <span class="stage-number">${i + 1}</span>
        <div class="stage-info">
          <div class="stage-title">${escapeHtml(st.title)}</div>
          <div class="stage-desc">${got} / ${total} trophies</div>
        </div>
        <span class="stage-toggle">▼</span>
      </div>
      <div class="stage-content">
        <div class="stage-list">
          ${st.trophies.map(t => {
            const isEarned = earned.has(t.name);
            return `
              <div class="stage-trophy${t.missable ? ' missable' : ''}">
                <input type="checkbox" class="stage-trophy-checkbox" data-name="${escapeHtml(t.name)}" ${isEarned ? 'checked' : ''} aria-label="Mark ${escapeHtml(t.name)} as earned">
                <div class="stage-trophy-info">
                  <div class="stage-trophy-name">${escapeHtml(t.name)}${t.missable ? ' ⚠' : ''}</div>
                </div>
                <span class="stage-trophy-grade ${gradeClass(t.grade)}">${t.grade}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    roadmapStages.appendChild(div);
  }
  document.querySelectorAll('.stage-header').forEach(h => {
    h.addEventListener('click', () => h.closest('.roadmap-stage').classList.toggle('expanded'));
  });
  document.querySelectorAll('.stage-trophy-checkbox').forEach(cb => {
    cb.addEventListener('change', e => toggleEarned(e.target.dataset.name, e.target.checked));
  });
}

/* ── Export / Import ── */
function doExport() {
  const data = JSON.stringify([...earned], null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'gta6-trophy-progress.json'; a.click();
  URL.revokeObjectURL(url);
}

function doImport(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const arr = JSON.parse(e.target.result);
      if (Array.isArray(arr)) {
        earned = new Set(arr);
        saveProgress();
        refreshProgress();
        renderTrophyList();
        if (selected) detEarned.checked = earned.has(selected.name);
        renderRoadmap();
      }
    } catch (err) { console.error('Import error:', err); }
  };
  reader.readAsText(file);
}

/* ── View toggle ── */
function toggleView() {
  viewMode = viewMode === 'list' ? 'roadmap' : 'list';
  const lay = document.querySelector('.layout');
  if (viewMode === 'roadmap') {
    lay.classList.add('roadmap-view');
    roadmapPanel.hidden = false;
    btnRoadmap.textContent = 'Back to List';
    btnRoadmap.setAttribute('aria-label', 'Show trophy list view');
  } else {
    lay.classList.remove('roadmap-view');
    roadmapPanel.hidden = true;
    btnRoadmap.textContent = 'Roadmap';
    btnRoadmap.setAttribute('aria-label', 'Show roadmap view');
  }
}

/* ── Initialization ── */
async function init() {
  await loadTrophies();
  loadProgress();
  updateFilterBadges();
  refreshProgress();
  renderTrophyList();
  renderRoadmap();
  setupListKeyboardNav();

  selKind.addEventListener('change', e => { filterKind = e.target.value; renderTrophyList(); });
  selGrade.addEventListener('change', e => { filterGrade = e.target.value; renderTrophyList(); });
  inpSearch.addEventListener('input', e => { searchTerm = e.target.value; renderTrophyList(); });
  chkSpoiler.addEventListener('change', e => {
    spoilerOn = e.target.checked;
    renderTrophyList();
    const first = visibleTrophies()[0];
    if (first) selectTrophy(first);
    else { detailPlaceholder.hidden = false; detailContent.hidden = true; selected = null; }
  });
  btnExport.addEventListener('click', doExport);
  inpImport.addEventListener('change', e => { if (e.target.files[0]) doImport(e.target.files[0]); e.target.value = ''; });
  detEarned.addEventListener('change', e => { if (selected) toggleEarned(selected.name, e.target.checked); });
  btnRoadmap.addEventListener('click', toggleView);
}

init();
