/**
 * GTA VI Trophy Guide & Tracker
 * Offline static app - no network requests at runtime
 */

const STORAGE_KEY = 'gta6-trophy-progress-v1';
const TROPHIES_FILE = 'data/trophies.json';

/** @type {Trophy[]} */
let trophies = [];
/** @type {Set<string>} */
let earned = new Set();
/** @type {Trophy|null} */
let selectedTrophy = null;
/** @type {string} */
let currentFilterKind = 'all';
/** @type {string} */
let currentFilterGrade = 'all';
/** @type {string} */
let currentSearch = '';
/** @type {boolean} */
let spoilerMode = false;
/** @type {'list'|'roadmap'} */
let currentView = 'list';

/** @type {HTMLElement} */
const trophyList = document.getElementById('trophyList');
/** @type {HTMLElement} */
const sidebarStats = document.getElementById('sidebarStats');
/** @type {HTMLElement} */
const progressFill = document.getElementById('progressFill');
/** @type {HTMLElement} */
const progressText = document.getElementById('progressText');
/** @type {HTMLElement} */
const detailPlaceholder = document.getElementById('detailPlaceholder');
/** @type {HTMLElement} */
const detailContent = document.getElementById('detailContent');
/** @type {HTMLElement} */
const roadmapPanel = document.getElementById('roadmapPanel');
/** @type {HTMLElement} */
const roadmapStages = document.getElementById('roadmapStages');

/** @type {HTMLSelectElement} */
const filterKind = document.getElementById('filterKind');
/** @type {HTMLSelectElement} */
const filterGrade = document.getElementById('filterGrade');
/** @type {HTMLInputElement} */
const searchInput = document.getElementById('searchInput');
/** @type {HTMLInputElement} */
const spoilerCheckbox = document.getElementById('spoilerCheckbox');
/** @type {HTMLButtonElement} */
const btnExport = document.getElementById('btnExport');
/** @type {HTMLInputElement} */
const fileImport = document.getElementById('fileImport');
/** @type {HTMLButtonElement} */
const btnRoadmap = document.getElementById('btnRoadmap');

/** @type {HTMLElement} */
const detailGrade = document.getElementById('detailGrade');
/** @type {HTMLElement} */
const detailName = document.getElementById('detailName');
/** @type {HTMLElement} */
const detailDescription = document.getElementById('detailDescription');
/** @type {HTMLElement} */
const detailGuide = document.getElementById('detailGuide');
/** @type {HTMLElement} */
const detailMeta = document.getElementById('detailMeta');
/** @type {HTMLInputElement} */
const detailEarned = document.getElementById('detailEarned');

/**
 * Load trophies from JSON file
 */
async function loadTrophies() {
  try {
    const response = await fetch(TROPHIES_FILE);
    const data = await response.json();
    // Handle both array and object with trophies property
    trophies = Array.isArray(data) ? data : data.trophies || [];
    // Sort by id
    trophies.sort((a, b) => (a.id || 0) - (b.id || 0));
  } catch (e) {
    console.error('Failed to load trophies:', e);
    trophies = [];
  }
}

/**
 * Load progress from localStorage
 */
function loadProgress() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      earned = new Set(JSON.parse(stored));
    }
  } catch (e) {
    console.error('Failed to load progress:', e);
    earned = new Set();
  }
}

/**
 * Save progress to localStorage
 */
function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
}

/**
 * Count trophies per filter kind for badge display
 */
function getFilterKindCounts() {
  const counts = {};
  for (const t of trophies) {
    if (!counts[t.kind]) counts[t.kind] = 0;
    counts[t.kind]++;
  }
  return counts;
}

/**
 * Update filter dropdown option texts with counts
 */
function updateFilterBadges() {
  const counts = getFilterKindCounts();
  
  // Update kind filter options
  for (const option of filterKind.options) {
    const val = option.value;
    if (val === 'all') {
      option.textContent = `All trophies (${trophies.length})`;
    } else if (counts[val] !== undefined) {
      const label = val.charAt(0).toUpperCase() + val.slice(1);
      option.textContent = `${label} (${counts[val]})`;
    }
  }
  
  // Update grade filter options
  const gradeCounts = {};
  for (const t of trophies) {
    if (!gradeCounts[t.grade]) gradeCounts[t.grade] = 0;
    gradeCounts[t.grade]++;
  }
  for (const option of filterGrade.options) {
    const val = option.value;
    if (val === 'all') {
      option.textContent = `All grades (${trophies.length})`;
    } else if (gradeCounts[val] !== undefined) {
      const label = val.charAt(0).toUpperCase() + val.slice(1);
      option.textContent = `${label} (${gradeCounts[val]})`;
    }
  }
}

/**
 * Update progress bar and text
 */
function updateProgress() {
  const total = trophies.length;
  const count = earned.size;
  const percent = total > 0 ? (count / total) * 100 : 0;
  progressFill.style.width = `${percent}%`;
  progressText.textContent = `${count} of ${total} earned`;
  
  // Update sidebar stats
  const storyCount = trophies.filter(t => t.kind === 'story').length;
  const storyEarned = trophies.filter(t => t.kind === 'story' && earned.has(t.name)).length;
  const missableCount = trophies.filter(t => t.missable).length;
  const missableEarned = trophies.filter(t => t.missable && earned.has(t.name)).length;
  
  sidebarStats.innerHTML = `
    <span>Story: ${storyEarned}/${storyCount}</span>
    <span style="margin-left: 12px;">Missable: ${missableEarned}/${missableCount}</span>
  `;
}

/**
 * Check if a trophy should be hidden due to spoiler mode
 */
function isSpoilerHidden(trophy) {
  if (!spoilerMode) return false;
  if (earned.has(trophy.name)) return false;
  // Hide story trophies (chapters and main missions)
  return trophy.kind === 'story';
}

/**
 * Check if trophy matches current filters
 */
function matchesFilters(trophy) {
  if (currentFilterKind !== 'all' && trophy.kind !== currentFilterKind) return false;
  if (currentFilterGrade !== 'all' && trophy.grade !== currentFilterGrade) return false;
  if (currentSearch) {
    const search = currentSearch.toLowerCase();
    const name = trophy.name.toLowerCase();
    const desc = (trophy.description || '').toLowerCase();
    if (!name.includes(search) && !desc.includes(search)) return false;
  }
  return true;
}

/**
 * Get visible (non-spoiler, filtered) trophies
 */
function getVisibleTrophies() {
  return trophies.filter(t => !isSpoilerHidden(t) && matchesFilters(t));
}

/**
 * Render the trophy list in the sidebar
 */
function renderTrophyList() {
  const visible = getVisibleTrophies();
  
  if (visible.length === 0) {
    // Empty state
    trophyList.innerHTML = `
      <li class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M9.172 16.172a4 4 0 0 1 5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p>No trophies match your current filters.</p>
        <button class="btn btn-sm" id="clearFiltersBtn">Clear filters</button>
      </li>
    `;
    document.getElementById('clearFiltersBtn').addEventListener('click', clearAllFilters);
    return;
  }
  
  trophyList.innerHTML = visible.map(trophy => {
    const isEarned = earned.has(trophy.name);
    const isMissable = trophy.missable;
    return `
      <li class="trophy-item${isEarned ? ' earned' : ''}${isMissable ? ' missable' : ''}" 
          data-name="${escapeHtml(trophy.name)}" 
          role="option" 
          aria-selected="${isEarned}"
          tabindex="0">
        <span class="trophy-grade ${getGradeClass(trophy.grade)}">${trophy.grade}</span>
        <span class="trophy-name">${escapeHtml(trophy.name)}${isMissable ? ' <span class="missable-badge" title="Missable">⚠</span>' : ''}</span>
        <span class="trophy-kind">${capitalize(trophy.kind)}</span>
        <input type="checkbox" class="trophy-checkbox" ${isEarned ? 'checked' : ''} aria-label="Mark ${escapeHtml(trophy.name)} as earned">
      </li>
    `;
  }).join('');
  
  // Add click listeners
  document.querySelectorAll('.trophy-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.type === 'checkbox') return;
      const name = item.dataset.name;
      const trophy = trophies.find(t => t.name === name);
      if (trophy) selectTrophy(trophy);
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const name = item.dataset.name;
        const trophy = trophies.find(t => t.name === name);
        if (trophy) selectTrophy(trophy);
      }
    });
  });
  
  // Checkbox listeners
  document.querySelectorAll('.trophy-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const item = e.target.closest('.trophy-item');
      const name = item.dataset.name;
      toggleEarned(name, e.target.checked);
    });
  });
}

/**
 * Clear all filters and search
 */
function clearAllFilters() {
  currentFilterKind = 'all';
  currentFilterGrade = 'all';
  currentSearch = '';
  filterKind.value = 'all';
  filterGrade.value = 'all';
  searchInput.value = '';
  renderTrophyList();
  updateProgress();
  
  const firstVisible = trophies.find(t => !isSpoilerHidden(t) && matchesFilters(t));
  if (firstVisible) {
    selectTrophy(firstVisible);
  }
}

/**
 * Toggle earned state of a trophy
 */
function toggleEarned(name, isEarned) {
  if (isEarned) {
    earned.add(name);
  } else {
    earned.delete(name);
  }
  saveProgress();
  updateProgress();
  renderTrophyList();
  if (selectedTrophy && selectedTrophy.name === name) {
    detailEarned.checked = isEarned;
  }
}

/**
 * Select a trophy and show its detail
 */
function selectTrophy(trophy) {
  selectedTrophy = trophy;
  
  // Update list selection
  document.querySelectorAll('.trophy-item').forEach(item => {
    item.classList.remove('selected');
    item.setAttribute('aria-selected', 'false');
    if (item.dataset.name === trophy.name) {
      item.classList.add('selected');
      item.setAttribute('aria-selected', 'true');
    }
  });
  
  // Show detail panel
  detailPlaceholder.hidden = true;
  detailContent.hidden = false;
  
  detailGrade.textContent = trophy.grade;
  detailGrade.className = `detail-grade ${getGradeClass(trophy.grade)}`;
  detailName.textContent = trophy.name;
  detailDescription.textContent = trophy.description;
  detailGuide.innerHTML = formatGuide(trophy.guide);
  detailEarned.checked = earned.has(trophy.name);
  
  // Meta details
  const missableText = trophy.missable ? 'Yes — can be missed if not obtained at the right time' : 'No';
  const roadmapStage = trophy.roadmap_stage || '—';
  detailMeta.innerHTML = `
    <dt>Grade</dt><dd>${capitalize(trophy.grade)}</dd>
    <dt>Type</dt><dd>${capitalize(trophy.kind)}</dd>
    <dt>Roadmap Stage</dt><dd>${roadmapStage}</dd>
    <dt>Missable</dt><dd>${missableText}</dd>
    <dt>Source</dt><dd><a href="${trophy.source_url}" target="_blank" rel="noopener">${trophy.source_url}</a></dd>
  `;
}

/**
 * Format guide text with line breaks and links
 */
function formatGuide(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .map(line => {
      // Convert URLs to links
      return line.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener">$1</a>'
      );
    })
    .join('<br>');
}

/**
 * Get CSS class for trophy grade
 */
function getGradeClass(grade) {
  switch (grade) {
    case 'platinum': return 'grade-platinum';
    case 'gold': return 'grade-gold';
    case 'silver': return 'grade-silver';
    case 'bronze': return 'grade-bronze';
    default: return '';
  }
}

/**
 * Render the roadmap view
 */
function renderRoadmap() {
  const stages = [
    {
      number: 1,
      title: 'Main Story Campaign',
      desc: 'Complete all story chapters and the final mission',
      trophies: trophies.filter(t => t.roadmap_stage === 'Story')
    },
    {
      number: 2,
      title: 'Stranger Missions',
      desc: 'Complete all stranger/freak mission strands',
      trophies: trophies.filter(t => t.kind === 'stranger' || (t.kind === 'story' && ['Andy', 'Kenton', 'Billy', 'Randy', 'Tyrone'].some(n => t.name.includes(n))))
    },
    {
      number: 3,
      title: 'Collectibles & Exploration',
      desc: 'Find all collectibles and explore Leonida',
      trophies: trophies.filter(t => t.roadmap_stage === 'Collectibles')
    },
    {
      number: 4,
      title: 'Activities & Challenges',
      desc: 'Complete activities, stunts, races, and challenges',
      trophies: trophies.filter(t => t.roadmap_stage === 'Activities')
    },
    {
      number: 5,
      title: 'Combat & Heists',
      desc: 'Robberies, combat feats, and heist activities',
      trophies: trophies.filter(t => t.kind === 'combat' || ['Hot Together', 'Retail Therapy', 'Whip It Good', 'Gunslinger', 'Catch Me If You Can', 'Challenging Tank', 'Sneakthief', 'Maximum Withdrawal', 'A Classic Blitz Play'].includes(t.name))
    },
    {
      number: 6,
      title: 'Miscellaneous & Cleanup',
      desc: 'Remaining trophies: properties, money, weird stuff',
      trophies: trophies.filter(t => t.kind === 'misc' || ['Pest Control', 'In The Beginning…', 'Capital Offense', 'Let\'s Go Bowling', 'Personal Best', 'Actions Speak Louder', 'Bad Luck, I Guess', 'The Truth Is Out There', 'Ten Pin', 'Dime on the Dollar', 'Treat Yo Self', 'Little Boxes', 'On the Spot'].includes(t.name))
    },
    {
      number: 7,
      title: 'Platinum & 100%',
      desc: 'Earn all trophies and reach 100% completion',
      trophies: trophies.filter(t => t.roadmap_stage === '100% Finale')
    }
  ];
  
  roadmapStages.innerHTML = '';
  
  for (const stage of stages) {
    const stageEl = document.createElement('div');
    stageEl.className = 'roadmap-stage';
    
    const earnedInStage = stage.trophies.filter(t => earned.has(t.name)).length;
    const totalInStage = stage.trophies.length;
    const hasMissable = stage.trophies.some(t => t.missable);
    
    stageEl.innerHTML = `
      <div class="stage-header" data-stage="${stage.number}">
        <span class="stage-number">${stage.number}</span>
        <div class="stage-info">
          <div class="stage-title">${escapeHtml(stage.title)}</div>
          <div class="stage-desc">${escapeHtml(stage.desc)}</div>
        </div>
        <span class="stage-trophy-count">${earnedInStage}/${totalInStage}</span>
        <span class="stage-toggle">▼</span>
      </div>
      <div class="stage-content">
        <div class="stage-list">
          ${stage.trophies.map(trophy => {
            const isEarned = earned.has(trophy.name);
            const isMissable = trophy.missable;
            return `
              <div class="stage-trophy${isMissable ? ' missable' : ''}">
                <input type="checkbox" class="stage-trophy-checkbox" data-name="${escapeHtml(trophy.name)}" ${isEarned ? 'checked' : ''} aria-label="Mark ${escapeHtml(trophy.name)} as earned">
                <div class="stage-trophy-info">
                  <div class="stage-trophy-name">${escapeHtml(trophy.name)}${isMissable ? ' ⚠' : ''}</div>
                </div>
                <span class="stage-trophy-grade ${getGradeClass(trophy.grade)}">${trophy.grade}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    roadmapStages.appendChild(stageEl);
  }
  
  // Add event listeners for stage expansion
  document.querySelectorAll('.stage-header').forEach(header => {
    header.addEventListener('click', () => {
      const stageEl = header.closest('.roadmap-stage');
      stageEl.classList.toggle('expanded');
    });
  });
  
  // Add event listeners for roadmap checkboxes
  document.querySelectorAll('.stage-trophy-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const name = e.target.dataset.name;
      toggleEarned(name, e.target.checked);
    });
  });
}

/**
 * Utility: Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Utility: Capitalize first letter
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Initialize the app
 */
async function init() {
  await loadTrophies();
  loadProgress();
  updateProgress();
  updateFilterBadges();
  renderTrophyList();
  renderRoadmap();
  
  // Select first visible trophy by default
  const firstVisible = trophies.find(t => !isSpoilerHidden(t) && matchesFilters(t));
  if (firstVisible) {
    selectTrophy(firstVisible);
  }
  
  // Event listeners
  filterKind.addEventListener('change', (e) => {
    currentFilterKind = e.target.value;
    renderTrophyList();
  });
  
  filterGrade.addEventListener('change', (e) => {
    currentFilterGrade = e.target.value;
    renderTrophyList();
  });
  
  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    renderTrophyList();
  });
  
  spoilerCheckbox.addEventListener('change', (e) => {
    spoilerMode = e.target.checked;
    renderTrophyList();
    const firstVisible = trophies.find(t => !isSpoilerHidden(t) && matchesFilters(t));
    if (firstVisible) selectTrophy(firstVisible);
    else {
      detailPlaceholder.hidden = false;
      detailContent.hidden = true;
      selectedTrophy = null;
    }
  });
  
  btnExport.addEventListener('click', () => {
    const data = JSON.stringify([...earned], null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gta6-trophy-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  });
  
  fileImport.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (Array.isArray(imported)) {
          earned = new Set(imported);
          saveProgress();
          updateProgress();
          renderTrophyList();
          if (selectedTrophy) {
            detailEarned.checked = earned.has(selectedTrophy.name);
          }
        }
      } catch (err) {
        console.error('Import failed:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
  
  detailEarned.addEventListener('change', (e) => {
    if (selectedTrophy) {
      toggleEarned(selectedTrophy.name, e.target.checked);
    }
  });
  
  btnRoadmap.addEventListener('click', () => {
    currentView = currentView === 'list' ? 'roadmap' : 'list';
    const layout = document.querySelector('.layout');
    if (currentView === 'roadmap') {
      layout.classList.add('roadmap-view');
      btnRoadmap.textContent = 'Back to List';
      btnRoadmap.setAttribute('aria-label', 'Show trophy list view');
    } else {
      layout.classList.remove('roadmap-view');
      btnRoadmap.textContent = 'Roadmap';
      btnRoadmap.setAttribute('aria-label', 'Show roadmap view');
    }
  });
}

// Start the app
init();
