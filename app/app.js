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
 * Get grade CSS class
 */
function getGradeClass(grade) {
  return `grade-${grade.toLowerCase()}`;
}

/**
 * Render trophy list in sidebar
 */
function renderTrophyList() {
  trophyList.innerHTML = '';
  
  const filtered = trophies.filter(t => matchesFilters(t) && !isSpoilerHidden(t));
  
  for (const trophy of filtered) {
    const li = document.createElement('li');
    li.className = `trophy-item${selectedTrophy?.name === trophy.name ? ' selected' : ''}${isSpoilerHidden(trophy) ? ' hidden' : ''}`;
    li.dataset.trophyName = trophy.name;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', selectedTrophy?.name === trophy.name ? 'true' : 'false');
    
    const isEarned = earned.has(trophy.name);
    
    li.innerHTML = `
      <input type="checkbox" class="trophy-checkbox" ${isEarned ? 'checked' : ''} aria-label="Mark ${trophy.name} as earned">
      <div class="trophy-info">
        <div class="trophy-name">${escapeHtml(trophy.name)}</div>
        <div class="trophy-desc">${escapeHtml(trophy.description || '')}</div>
      </div>
      <span class="trophy-grade ${getGradeClass(trophy.grade)}">${trophy.grade}</span>
      ${trophy.missable ? '<span class="trophy-missable" aria-label="Missable trophy">⚠</span>' : ''}
    `;
    
    const checkbox = li.querySelector('.trophy-checkbox');
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      toggleEarned(trophy.name, checkbox.checked);
    });
    
    li.addEventListener('click', () => selectTrophy(trophy));
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectTrophy(trophy);
      }
    });
    
    trophyList.appendChild(li);
  }
  
  // If selected trophy is now hidden, clear selection
  if (selectedTrophy && (isSpoilerHidden(selectedTrophy) || !matchesFilters(selectedTrophy))) {
    selectTrophy(null);
  }
}

/**
 * Select a trophy to show details
 */
function selectTrophy(trophy) {
  selectedTrophy = trophy;
  
  // Update list selection
  document.querySelectorAll('.trophy-item').forEach(item => {
    const isSelected = item.dataset.trophyName === trophy?.name;
    item.classList.toggle('selected', isSelected);
    item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  });
  
  if (trophy) {
    showTrophyDetail(trophy);
  } else {
    showPlaceholder();
  }
}

/**
 * Show trophy detail in right panel
 */
function showTrophyDetail(trophy) {
  detailPlaceholder.hidden = true;
  detailContent.hidden = false;
  
  detailGrade.className = `detail-grade ${getGradeClass(trophy.grade)}`;
  detailGrade.textContent = trophy.grade;
  detailName.textContent = trophy.name;
  detailDescription.textContent = trophy.description || '';
  detailGuide.innerHTML = formatGuide(trophy.guide || '', trophy.source_url);
  detailEarned.checked = earned.has(trophy.name);
  
  // Build meta list
  detailMeta.innerHTML = `
    <dt>Grade</dt><dd>${capitalize(trophy.grade)}</dd>
    <dt>Type</dt><dd>${capitalize(trophy.kind || 'unknown')}</dd>
    <dt>Missable</dt><dd class="${trophy.missable ? 'missable-true' : 'missable-false'}">${trophy.missable ? 'Yes ⚠' : 'No'}</dd>
    ${trophy.source_url ? `<dt>Source</dt><dd><a href="${escapeHtml(trophy.source_url)}" target="_blank" rel="noopener">${escapeHtml(trophy.source_url)}</a></dd>` : ''}
  `;
}

/**
 * Show placeholder when no trophy selected
 */
function showPlaceholder() {
  detailPlaceholder.hidden = false;
  detailContent.hidden = true;
}

/**
 * Format guide text with source citation
 */
function formatGuide(guide, sourceUrl) {
  if (!guide) return '<p>No guide available.</p>';
  
  // Split into paragraphs and add source link at the end
  const paragraphs = guide.split('\n').filter(p => p.trim()).map(p => `<p>${escapeHtml(p.trim())}</p>`).join('');
  const sourceHtml = sourceUrl ? `<p class="source">Source: <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(sourceUrl)}</a></p>` : '';
  return paragraphs + sourceHtml;
}

/**
 * Toggle earned status
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
  renderRoadmap();
  
  // Update detail panel if this trophy is selected
  if (selectedTrophy?.name === name) {
    detailEarned.checked = isEarned;
  }
}

/**
 * Toggle earned from detail panel
 */
detailEarned.addEventListener('change', () => {
  if (selectedTrophy) {
    toggleEarned(selectedTrophy.name, detailEarned.checked);
  }
});

/**
 * Export progress to file
 */
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

/**
 * Import progress from file
 */
fileImport.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    if (Array.isArray(imported)) {
      earned = new Set(imported);
      saveProgress();
      updateProgress();
      renderTrophyList();
      renderRoadmap();
      if (selectedTrophy) {
        detailEarned.checked = earned.has(selectedTrophy.name);
      }
    }
  } catch (err) {
    console.error('Import failed:', err);
    alert('Failed to import progress. Please check the file format.');
  }
  
  // Reset file input
  e.target.value = '';
});

/**
 * Filter change handlers
 */
filterKind.addEventListener('change', () => {
  currentFilterKind = filterKind.value;
  renderTrophyList();
});

filterGrade.addEventListener('change', () => {
  currentFilterGrade = filterGrade.value;
  renderTrophyList();
});

searchInput.addEventListener('input', () => {
  currentSearch = searchInput.value.trim();
  renderTrophyList();
});

/**
 * Spoiler mode toggle
 */
spoilerCheckbox.addEventListener('change', () => {
  spoilerMode = spoilerCheckbox.checked;
  renderTrophyList();
});

/**
 * Roadmap view toggle
 */
btnRoadmap.addEventListener('click', () => {
  currentView = currentView === 'list' ? 'roadmap' : 'list';
  toggleView();
});

function toggleView() {
  const sidebar = document.getElementById('sidebar');
  const detailPanel = document.querySelector('.detail-panel');
  
  if (currentView === 'roadmap') {
    sidebar.hidden = true;
    detailPanel.hidden = true;
    roadmapPanel.hidden = false;
    btnRoadmap.textContent = 'Back to List';
    btnRoadmap.classList.add('btn-primary');
    btnRoadmap.classList.remove('btn-outline');
    renderRoadmap();
  } else {
    sidebar.hidden = false;
    detailPanel.hidden = false;
    roadmapPanel.hidden = true;
    btnRoadmap.textContent = 'Roadmap';
    btnRoadmap.classList.add('btn-outline');
    btnRoadmap.classList.remove('btn-primary');
  }
}

/**
 * Render roadmap to platinum
 */
function renderRoadmap() {
  if (!roadmapStages) return;
  
  // Define roadmap stages based on trophy types and logical progression
  const stages = [
    {
      number: 1,
      title: 'Main Story Campaign',
      desc: 'Complete all story chapters and main missions',
      trophies: trophies.filter(t => t.kind === 'story')
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
      trophies: trophies.filter(t => t.kind === 'collectibles' || t.kind === 'exploration' || ['The Goodtime State', 'Positive Mental Attitude', 'Fair Game', 'Don\'t Touch My Deck', 'You WAiNKer!'].includes(t.name))
    },
    {
      number: 4,
      title: 'Activities & Challenges',
      desc: 'Complete activities, stunts, races, and challenges',
      trophies: trophies.filter(t => t.kind === 'activities' || ['Cunning Stunts', 'Master of None', 'The Shootist', 'Top Fun', 'Earn Cash, Not Kudos', 'Baited My Tackle', 'Stick Fiddler', 'One Last Thing'].includes(t.name))
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
      trophies: trophies.filter(t => t.grade === 'platinum' || t.grade === 'gold')
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
  renderTrophyList();
  renderRoadmap();
  
  // Select first visible trophy by default
  const firstVisible = trophies.find(t => !isSpoilerHidden(t) && matchesFilters(t));
  if (firstVisible) {
    selectTrophy(firstVisible);
  }
}

// Start the app
init();
