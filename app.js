// Chronos Planner - Application Logic

// State variables
let state = {
  profile: null,
  tasks: [],
  currentDate: new Date(), // Focus date for planners
  activeTab: 'overview'
};

// Year selection limits (+/- 5 years)
const minYear = new Date().getFullYear() - 5;
const maxYear = new Date().getFullYear() + 5;

// Initializer
document.addEventListener('DOMContentLoaded', () => {
  // loadData() is now called by Firebase onAuthStateChanged in firebase-config.js
  applyInitialTheme();
  initApp();
});

// Load mock data if Firestore is empty
function loadData() {
    state.tasks = [];
    saveTasksToLocalStorage();
}

function saveProfileToLocalStorage() {
  localStorage.setItem('chronos_profile', JSON.stringify(state.profile));
  // Save to Firebase
  if (typeof saveToFirestore === 'function') {
    saveToFirestore();
  }
}

function saveTasksToLocalStorage() {
  // Fallback to localStorage just in case Firebase fails or isn't set up
  localStorage.setItem('chronos_tasks', JSON.stringify(state.tasks));
  // Save to Firebase
  if (typeof saveToFirestore === 'function') {
    saveToFirestore();
  }
}

// Initialize App controls
function initApp() {
  const appContainerEl = document.getElementById('app-container');
  
  // Note: Visibility is handled by firebase-config.js onAuthStateChanged
  
  // Setup controls & dropdowns
  populateYearDropdowns();
  updateProfileUI();
  
  // Set picker selections based on current focus date
  setMonthToToday();
  
  // Initial draw
  switchTab(state.activeTab);
  
  lucide.createIcons();
}

// Update Header Profile Cards and Avatar details
function updateProfileUI() {
  if (!state.profile) return;
  
  const initials = state.profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  // Sidebar Profile badge
  document.getElementById('profile-avatar').textContent = initials;
  document.getElementById('profile-name').textContent = state.profile.name;
  document.getElementById('profile-role').textContent = `${state.profile.work} | ${state.profile.education}`;

  // Overview main card
  document.getElementById('overview-avatar').textContent = initials;
  document.getElementById('overview-name').textContent = state.profile.name;
  document.getElementById('overview-education').textContent = state.profile.education;
  document.getElementById('overview-work').textContent = state.profile.work;
}

// Populate year selectors dynamically
function populateYearDropdowns() {
  const monthlyYearSel = document.getElementById('monthly-year-select');
  const yearlyYearSel = document.getElementById('yearly-year-select');
  
  monthlyYearSel.innerHTML = '';
  yearlyYearSel.innerHTML = '';

  for (let y = minYear; y <= maxYear; y++) {
    const opt1 = document.createElement('option');
    opt1.value = y;
    opt1.textContent = y;
    monthlyYearSel.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = y;
    opt2.textContent = y;
    yearlyYearSel.appendChild(opt2);
  }
}

// Logout handler
function handleLogout() {
  if (confirm("Are you sure you want to sign out?")) {
    if (typeof logout === 'function') logout(); // Firebase sign out

    localStorage.removeItem('chronos_profile');
    localStorage.removeItem('chronos_tasks');
    state.profile = null;
    state.tasks = [];
    
    // Reset forms
    document.getElementById('profile-form').reset();
    
    // Auth mode is handled by onAuthStateChanged
    lucide.createIcons();
  }
}

// TAB NAVIGATION SWITCHING
function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Update nav link styles
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.classList.remove('active');
  });
  document.getElementById(`nav-${tabId}`).classList.add('active');

  // Update section views
  const sections = document.querySelectorAll('.view-section');
  sections.forEach(sec => {
    sec.classList.remove('active');
  });
  document.getElementById(`view-${tabId}`).classList.add('active');

  // Load specific renders
  if (tabId === 'overview') {
    renderOverview();
  } else if (tabId === 'weekly') {
    renderWeekly();
  } else if (tabId === 'monthly') {
    renderMonthly();
  } else if (tabId === 'yearly') {
    renderYearly();
  }
  lucide.createIcons();
}

// LOCAL DATE MATH UTILITIES
function getLocalDateString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseLocalDate(dateStr) {
  const parts = dateStr.split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

// --- OVERVIEW TAB CONTROLLER ---
function renderOverview() {
  updateProfileUI();

  // Statistics calculation
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const rate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  document.getElementById('stats-completed').textContent = `${completedTasks}/${totalTasks}`;
  document.getElementById('stats-pending').textContent = pendingTasks;
  document.getElementById('stats-rate-pct').textContent = `${rate}%`;
  document.getElementById('stats-pct-label').textContent = `${rate}%`;

  // Draw circular SVG progress ring
  const circleProgress = document.getElementById('overview-progress-ring');
  // stroke-dasharray formula is (dash, gap) where total is 100
  circleProgress.setAttribute('stroke-dasharray', `${rate}, 100`);

  // Upcoming Tasks (Next 7 Days, sorted chronologically)
  const container = document.getElementById('overview-upcoming-tasks');
  container.innerHTML = '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endLimit = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  endLimit.setHours(23, 59, 59, 999);

  // Filter tasks in the window
  const upcomingTasks = state.tasks.filter(task => {
    const taskDate = parseLocalDate(task.date);
    return taskDate >= today && taskDate <= endLimit;
  });

  // Sort by date ascending, then priority high -> low
  upcomingTasks.sort((a, b) => {
    const diff = parseLocalDate(a.date) - parseLocalDate(b.date);
    if (diff !== 0) return diff;
    const prios = { high: 3, medium: 2, low: 1 };
    return prios[b.priority] - prios[a.priority];
  });

  if (upcomingTasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="sparkles" class="empty-state-icon"></i>
        <p>No tasks scheduled for the next 7 days.</p>
        <p style="font-size: 12px; margin-top:4px; opacity:0.6;">Enjoy your free time or schedule a new task!</p>
      </div>
    `;
  } else {
    upcomingTasks.forEach(task => {
      const parsedDate = parseLocalDate(task.date);
      const formattedDate = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
      
      const item = document.createElement('div');
      item.className = `task-item ${task.completed ? 'completed' : ''}`;
      
      item.innerHTML = `
        <div class="task-left">
          <div class="custom-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTaskCompletion('${task.id}')"></div>
          <div class="task-details">
            <span class="task-text">${escapeHtml(task.text)}</span>
            <span class="task-date-tag">
              <i data-lucide="calendar" style="width:11px; height:11px;"></i>
              ${formattedDate}
            </span>
          </div>
        </div>
        <div class="task-right">
          <span class="priority-tag priority-${task.priority}">${task.priority}</span>
          <button class="delete-task-btn" onclick="deleteTask('${task.id}')" title="Delete Task">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      `;
      container.appendChild(item);
    });
  }
}

// Escape HTML utility
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// --- WEEKLY PLAN VIEW ---
function navigateWeek(weeksOffset) {
  state.currentDate.setDate(state.currentDate.getDate() + (weeksOffset * 7));
  renderWeekly();
}

function setWeekToToday() {
  state.currentDate = new Date();
  renderWeekly();
}

function renderWeekly() {
  const grid = document.getElementById('weekly-calendar-grid');
  grid.innerHTML = '';

  // Calculate start of current week (Monday)
  const currentDayOfWeek = state.currentDate.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(state.currentDate);
  monday.setDate(state.currentDate.getDate() + distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  // Set week range label
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const mLabel = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const sLabel = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  document.getElementById('weekly-range-label').textContent = `${mLabel} - ${sLabel}`;

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const todayStr = getLocalDateString(new Date());

  // Render columns for each day of the week
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const dayDateStr = getLocalDateString(dayDate);

    const isToday = dayDateStr === todayStr;

    const column = document.createElement('div');
    column.className = `week-day-col ${isToday ? 'today' : ''}`;
    
    // Filter tasks for this day
    const dayTasks = state.tasks.filter(t => t.date === dayDateStr);

    let tasksHtml = '';
    if (dayTasks.length === 0) {
      tasksHtml = `
        <div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:11px; text-align:center; padding: 20px 0;">
          No tasks
        </div>
      `;
    } else {
      // Sort tasks (high priority first)
      const prios = { high: 3, medium: 2, low: 1 };
      dayTasks.sort((a, b) => prios[b.priority] - prios[a.priority]);
      
      tasksHtml = dayTasks.map(task => `
        <div class="weekly-task-card ${task.completed ? 'checked' : ''}" onclick="toggleTaskCompletion('${task.id}')">
          <div class="weekly-task-top">
            <span class="weekly-task-text">${escapeHtml(task.text)}</span>
            <button class="delete-task-btn" onclick="event.stopPropagation(); deleteTask('${task.id}')">
              <i data-lucide="x" style="width: 12px; height: 12px;"></i>
            </button>
          </div>
          <span class="priority-tag priority-${task.priority}" style="align-self: flex-start; padding: 2px 6px; font-size: 8px;">
            ${task.priority}
          </span>
        </div>
      `).join('');
    }

    column.innerHTML = `
      <div class="day-header">
        <div class="day-name">${dayNames[i]}</div>
        <div class="day-number">${dayDate.getDate()}</div>
      </div>
      <div class="weekly-tasks-list">
        ${tasksHtml}
      </div>
      <button class="day-add-btn" onclick="openAddTaskModal('${dayDateStr}')">
        <i data-lucide="plus" style="width: 13px; height: 13px;"></i>
        Add Task
      </button>
    `;

    grid.appendChild(column);
  }
  lucide.createIcons();
}


// --- MONTHLY PLAN VIEW ---
function setMonthToToday() {
  const today = new Date();
  state.currentDate = today;
  
  // Set month & year picker selectors
  document.getElementById('monthly-month-select').value = today.getMonth();
  document.getElementById('monthly-year-select').value = today.getFullYear();
  
  if (state.activeTab === 'monthly') {
    renderMonthly();
  }
}

function onMonthlyNavigationChange() {
  const year = parseInt(document.getElementById('monthly-year-select').value);
  const month = parseInt(document.getElementById('monthly-month-select').value);
  
  state.currentDate.setFullYear(year);
  state.currentDate.setMonth(month);
  
  renderMonthly();
}

function renderMonthly() {
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();

  // Sync dropdown values in header
  document.getElementById('monthly-month-select').value = month;
  document.getElementById('monthly-year-select').value = year;

  const grid = document.getElementById('monthly-calendar-grid');
  grid.innerHTML = '';

  // Render grid headers (S M T W T F S)
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekdays.forEach(day => {
    const el = document.createElement('div');
    el.className = 'calendar-header-day';
    el.textContent = day;
    grid.appendChild(el);
  });

  // Calculate dates in month grid
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // Day index (0-6)
  const daysInMonth = new Date(year, month + 1, 0).getDate(); // Days count
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const totalGridCells = 42; // standard 6-row calendar
  const todayStr = getLocalDateString(new Date());

  for (let i = 0; i < totalGridCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

    let cellDateStr = '';
    let dayNum = 0;

    if (i < firstDayOfMonth) {
      // Prev month filler
      cell.classList.add('inactive');
      dayNum = daysInPrevMonth - firstDayOfMonth + i + 1;
    } else if (i >= firstDayOfMonth + daysInMonth) {
      // Next month filler
      cell.classList.add('inactive');
      dayNum = i - (firstDayOfMonth + daysInMonth) + 1;
    } else {
      // Current month active cells
      dayNum = i - firstDayOfMonth + 1;
      const targetDate = new Date(year, month, dayNum);
      cellDateStr = getLocalDateString(targetDate);
      
      if (cellDateStr === todayStr) {
        cell.classList.add('today');
      }

      // Prefill task date when clicked
      cell.onclick = () => openAddTaskModal(cellDateStr);
    }

    cell.innerHTML = `<span class="cell-number">${dayNum}</span>`;

    if (cellDateStr) {
      const cellTasks = state.tasks.filter(t => t.date === cellDateStr);
      if (cellTasks.length > 0) {
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'cell-tasks';

        // Render up to 2 items in cell
        const displayTasks = cellTasks.slice(0, 2);
        displayTasks.forEach(task => {
          const dot = document.createElement('div');
          dot.className = `cell-task-dot p-${task.priority}`;
          dot.textContent = task.text;
          tasksContainer.appendChild(dot);
        });

        if (cellTasks.length > 2) {
          const more = document.createElement('div');
          more.className = 'cell-more-tasks';
          more.textContent = `+${cellTasks.length - 2} more`;
          tasksContainer.appendChild(more);
        }

        cell.appendChild(tasksContainer);
      }
    }

    grid.appendChild(cell);
  }
}


// --- YEARLY PLAN VIEW ---
function setYearToToday() {
  const today = new Date();
  state.currentDate = today;
  
  document.getElementById('yearly-year-select').value = today.getFullYear();
  
  if (state.activeTab === 'yearly') {
    renderYearly();
  }
}

function onYearlyNavigationChange() {
  const year = parseInt(document.getElementById('yearly-year-select').value);
  state.currentDate.setFullYear(year);
  renderYearly();
}

function renderYearly() {
  const year = state.currentDate.getFullYear();
  
  // Sync dropdown values in header
  document.getElementById('yearly-year-select').value = year;

  const container = document.getElementById('yearly-roadmap-grid');
  container.innerHTML = '';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  months.forEach((monthName, monthIndex) => {
    const card = document.createElement('div');
    card.className = 'mini-month-card';
    
    // Clicking a month redirects to Monthly Plan tab focusing that month
    card.onclick = () => {
      state.currentDate.setFullYear(year);
      state.currentDate.setMonth(monthIndex);
      switchTab('monthly');
    };

    const firstDay = new Date(year, monthIndex, 1).getDay();
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();

    let gridHtml = `
      <div class="mini-month-title">${monthName}</div>
      <div class="mini-grid">
        <div class="mini-grid-header">S</div>
        <div class="mini-grid-header">M</div>
        <div class="mini-grid-header">T</div>
        <div class="mini-grid-header">W</div>
        <div class="mini-grid-header">T</div>
        <div class="mini-grid-header">F</div>
        <div class="mini-grid-header">S</div>
    `;

    // Fill blank padding
    for (let i = 0; i < firstDay; i++) {
      gridHtml += '<div class="mini-cell inactive"></div>';
    }

    // Render numbers
    for (let d = 1; d <= totalDays; d++) {
      const cellDateStr = getLocalDateString(new Date(year, monthIndex, d));
      const hasTasks = state.tasks.some(t => t.date === cellDateStr);
      
      const isToday = (year === todayYear && monthIndex === todayMonth && d === todayDay);

      gridHtml += `
        <div class="mini-cell ${hasTasks ? 'has-tasks' : ''} ${isToday ? 'today' : ''}">
          ${d}
        </div>
      `;
    }

    gridHtml += '</div>';
    card.innerHTML = gridHtml;
    container.appendChild(card);
  });
}


// --- TASK MODAL ACTIONS ---
function openAddTaskModal(prefilledDateStr = '') {
  document.getElementById('task-id').value = '';
  document.getElementById('task-form').reset();
  
  document.getElementById('task-modal-title').textContent = 'Create New Task';

  const dateInput = document.getElementById('task-date-input');
  
  if (prefilledDateStr) {
    dateInput.value = prefilledDateStr;
  } else {
    dateInput.value = getLocalDateString(new Date());
  }

  // Pre-select Low priority
  document.getElementById('p-low').checked = true;

  document.getElementById('task-modal').classList.add('active');
}

function closeTaskModal() {
  document.getElementById('task-modal').classList.remove('active');
}

// Add/Save new task
function saveTask(e) {
  e.preventDefault();
  
  const text = document.getElementById('task-text-input').value.trim();
  const date = document.getElementById('task-date-input').value;
  const priority = document.querySelector('input[name="priority"]:checked').value;
  
  if (!text || !date) return;

  const newTask = {
    id: 't-' + Date.now() + Math.random().toString(36).substr(2, 5),
    text,
    date,
    priority,
    completed: false
  };

  state.tasks.push(newTask);
  saveTasksToLocalStorage();
  closeTaskModal();
  
  // Re-render
  switchTab(state.activeTab);
}

function toggleTaskCompletion(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveTasksToLocalStorage();
    switchTab(state.activeTab);
  }
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter(t => t.id !== taskId);
  saveTasksToLocalStorage();
  switchTab(state.activeTab);
}


// --- USER PROFILE MODAL ACTIONS ---
function openProfileModal() {
  if (!state.profile) return;
  document.getElementById('edit-username').value = state.profile.name;
  document.getElementById('edit-education').value = state.profile.education;
  document.getElementById('edit-work').value = state.profile.work;

  document.getElementById('profile-modal').classList.add('active');
}

function closeProfileModal() {
  document.getElementById('profile-modal').classList.remove('active');
}

function saveProfile(e) {
  e.preventDefault();
  
  const name = document.getElementById('edit-username').value.trim();
  const education = document.getElementById('edit-education').value.trim();
  const work = document.getElementById('edit-work').value.trim();

  if (name && education && work) {
    state.profile = { name, education, work };
    saveProfileToLocalStorage();
    closeProfileModal();
    updateProfileUI();
    
    // Re-render active view in case display references profile
    if (state.activeTab === 'overview') {
      renderOverview();
    }
  }
}

// --- THEME SWITCHER CONTROLLER ---
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('chronos_theme', isLight ? 'light' : 'dark');
  updateThemeUI(isLight);
}

function updateThemeUI(isLight) {
  document.querySelectorAll('.theme-text-node').forEach(el => {
    el.textContent = isLight ? 'Dark Mode' : 'Light Mode';
  });
  document.querySelectorAll('.theme-icon-node').forEach(el => {
    el.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
  });
  if (window.lucide) {
    lucide.createIcons();
  }
}

function applyInitialTheme() {
  const savedTheme = localStorage.getItem('chronos_theme');
  const isLight = (savedTheme === 'light');
  if (isLight) {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
  updateThemeUI(isLight);
}

// --- CURSOR GLOW BACKGROUND TRACKER ---
document.addEventListener('mousemove', (e) => {
  document.body.style.setProperty('--mouse-x', e.clientX + 'px');
  document.body.style.setProperty('--mouse-y', e.clientY + 'px');
});

// --- LUFFY ATTACK LOGIC ---
let isLuffyAttacking = false;

function triggerLuffyAttack() {
  if (isLuffyAttacking) return;
  isLuffyAttacking = true;

  // 1. Zoom in and prepare
  const avatar = document.getElementById('luffy-avatar');
  if (avatar) avatar.style.transform = 'scale(1.5) rotate(-15deg)';

  // 2. King Kong Gun Impact! (Shake the whole app)
  setTimeout(() => {
    const appContainer = document.getElementById('app-container');
    appContainer.classList.add('attack-shake');
    
    // Add the crack overlay if it doesn't exist
    let crackOverlay = document.getElementById('crack-overlay');
    if (!crackOverlay) {
      crackOverlay = document.createElement('div');
      crackOverlay.id = 'crack-overlay';
      crackOverlay.innerHTML = '<div class="crack-lines"></div>';
      document.body.appendChild(crackOverlay);
    }
    
    // Show cracks and red flash
    setTimeout(() => {
      crackOverlay.classList.add('active');
    }, 100);

  }, 400);

  // 3. Stop shaking after 1.5 seconds
  setTimeout(() => {
    const appContainer = document.getElementById('app-container');
    appContainer.classList.remove('attack-shake');
  }, 1900);

  // 4. Fade everything back to normal after 3 seconds total
  setTimeout(() => {
    const crackOverlay = document.getElementById('crack-overlay');
    if (crackOverlay) crackOverlay.classList.remove('active');
    
    if (avatar) avatar.style.transform = 'scale(1.15)';
    
    setTimeout(() => {
      isLuffyAttacking = false;
    }, 500); // Cooldown
  }, 3000);
}
