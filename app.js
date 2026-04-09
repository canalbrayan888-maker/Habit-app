/* ══════════════════════════════════════════════════════
   HABIT PRO — app.js
══════════════════════════════════════════════════════ */

/* ── CONSTANTS ───────────────────────────────────────── */
const REWARDS = [
  { streak: 3,   name: "Inicio",    emoji: "🌱", type: "common"    },
  { streak: 5,   name: "Constante", emoji: "⚡", type: "common"    },
  { streak: 10,  name: "Activo",    emoji: "💪", type: "common"    },
  { streak: 20,  name: "Firme",     emoji: "🛡️", type: "common"    },
  { streak: 50,  name: "Máquina",   emoji: "🤖", type: "epic"      },
  { streak: 75,  name: "Guerrero",  emoji: "⚔️", type: "epic"      },
  { streak: 100, name: "Titán",     emoji: "👑", type: "legendary" }
];

const QUOTES = [
  "No rompas la racha. Cada día importa.",
  "La disciplina es elegirte a ti mismo.",
  "Hazlo aunque no quieras. Después te lo agradecerás.",
  "Vas mejor que el 80% de la gente.",
  "El hábito es la segunda naturaleza.",
  "Pequeñas acciones hoy, grandes cambios mañana.",
  "La consistencia es el secreto que nadie te dice.",
  "Un día a la vez. Sin excusas.",
  "El éxito es la suma de pequeños esfuerzos repetidos.",
  "No necesitas motivación. Necesitas disciplina.",
  "Cada vez que cumples, te demuestras que puedes.",
  "Los grandes resultados requieren grandes compromisos."
];

const GOAL_LABELS = {
  salud:          "💪 Salud y fitness",
  mente:          "🧘 Bienestar mental",
  estudio:        "📚 Estudio y aprendizaje",
  productividad:  "⚡ Productividad"
};

/* ── STATE ───────────────────────────────────────────── */
let data = JSON.parse(localStorage.getItem("habitpro_v3")) || {
  onboarded:       false,
  name:            "",
  goal:            "",
  photo:           "",
  habits:          [],
  streak:          0,
  history:         {},
  lastDate:        null,
  fails:           0,
  rewardsUnlocked: [],
  totalDone:       0
};

let dChart, bChart;
let obHabits     = [];
let selectedGoal = "";
let toastTimer;

/* ── HELPERS ─────────────────────────────────────────── */
function save()  { localStorage.setItem("habitpro_v3", JSON.stringify(data)); }
function today() { return new Date().toISOString().split("T")[0]; }
function esc(s)  { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

/* ══════════════════════════════════════════════════════
   ONBOARDING
══════════════════════════════════════════════════════ */
function obNext(step) {
  if (step === 2) {
    const n = document.getElementById("ob_name").value.trim();
    if (!n) { showToast("Escribe tu nombre 😊"); return; }
  }
  if (step === 3) {
    if (!selectedGoal) { showToast("Elige una meta 🎯"); return; }
  }

  document.querySelectorAll(".ob-step").forEach(s => s.classList.remove("active"));
  document.getElementById("ob" + step).classList.add("active");
  document.querySelectorAll(".ob-dot").forEach((d, i) => d.classList.toggle("active", i < step));
}

function selectGoal(btn, val) {
  document.querySelectorAll(".ob-goal-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  selectedGoal = val;
}

function obAddHabit() {
  const inp  = document.getElementById("obHabitInput");
  const name = inp.value.trim();
  if (!name) return;
  obHabits.push({ name, done: false, id: Date.now() });
  inp.value = "";
  renderObHabits();
}

function renderObHabits() {
  document.getElementById("obHabitList").innerHTML = obHabits.map((h, i) => `
    <div class="ob-habit-item">
      <span>✦</span>
      ${esc(h.name)}
      <button onclick="obRemoveHabit(${i})">×</button>
    </div>`).join("");
}

function obRemoveHabit(i) {
  obHabits.splice(i, 1);
  renderObHabits();
}

function finishOnboarding() {
  data.name      = document.getElementById("ob_name").value.trim() || "Amigo";
  data.goal      = selectedGoal || "productividad";
  data.habits    = obHabits.length ? obHabits : [];
  data.onboarded = true;
  save();

  document.getElementById("onboarding").classList.add("hidden");
  document.getElementById("app").classList.add("visible");
  initApp();
}

/* ══════════════════════════════════════════════════════
   CORE HABIT LOGIC
══════════════════════════════════════════════════════ */
function addHabit() {
  const inp  = document.getElementById("habitInput");
  const name = inp.value.trim();
  if (!name) return;
  data.habits.push({ name, done: false, id: Date.now() });
  inp.value = "";
  save();
  render();
  showToast("Hábito agregado ✓");
}

function toggleHabit(id) {
  const h = data.habits.find(x => x.id === id);
  if (!h) return;
  h.done = !h.done;

  const done = data.habits.filter(x => x.done).length;
  if (data.habits.length && (done / data.habits.length) * 100 >= 80) {
    data.history[today()] = true;
  }

  checkStreak();
  save();
  render();
}

function deleteHabit(id) {
  data.habits = data.habits.filter(x => x.id !== id);
  save();
  render();
}

function checkStreak() {
  const t = today();
  if (data.lastDate === t) return;

  const done = data.habits.filter(x => x.done).length;
  const pct  = data.habits.length ? (done / data.habits.length) * 100 : 0;

  if (pct >= 80) {
    data.streak++;
    data.fails    = 0;
    data.totalDone++;
    checkRewards();
  } else {
    data.fails++;
    if (data.fails >= 2) { data.streak = 0; data.fails = 0; }
  }
  data.lastDate = t;
}

function checkRewards() {
  REWARDS.forEach(r => {
    if (data.streak >= r.streak && !data.rewardsUnlocked.includes(r.streak)) {
      data.rewardsUnlocked.push(r.streak);
      showRewardModal(r);
    }
  });
}

/* ══════════════════════════════════════════════════════
   RENDER FUNCTIONS
══════════════════════════════════════════════════════ */
function render() {
  renderHome();
  renderStatsNumbers();
  renderCalendar();
  renderProfilePage();
}

/* HOME */
function renderHome() {
  const h  = new Date().getHours();
  const gr = h < 12 ? "Buenos días ☀️" : h < 18 ? "Buenas tardes 🌤️" : "Buenas noches 🌙";

  document.getElementById("greetingText").textContent = gr;
  document.getElementById("headerName").textContent   = data.name || "Usuario";
  document.getElementById("streakNum").textContent    = data.streak;
  document.getElementById("streakLabel").textContent  = data.streak === 1 ? "día seguido" : "días seguidos";

  const done  = data.habits.filter(h => h.done).length;
  const total = data.habits.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  document.getElementById("progPct").textContent    = pct + "%";
  document.getElementById("progFill").style.width   = pct + "%";

  updateHeaderAvatar();

  const list = document.getElementById("habitList");
  if (!total) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">🌿</div><p>Agrega tu primer hábito abajo</p></div>`;
    return;
  }

  list.innerHTML = data.habits.map(h => `
    <div class="habit-item ${h.done ? "done-item" : ""}">
      <button class="habit-check ${h.done ? "checked" : ""}" onclick="toggleHabit(${h.id})">${h.done ? "✓" : ""}</button>
      <span class="habit-name">${esc(h.name)}</span>
      <button class="habit-del" onclick="deleteHabit(${h.id})">×</button>
    </div>`).join("");
}

/* STATS NUMBERS */
function renderStatsNumbers() {
  document.getElementById("s_streak").textContent  = data.streak;
  document.getElementById("s_total").textContent   = data.totalDone;
  document.getElementById("s_days").textContent    = Object.keys(data.history).length;
  document.getElementById("s_rewards").textContent = data.rewardsUnlocked.length;
}

/* CHARTS */
function renderCharts() {
  const done  = data.habits.filter(h => h.done).length;
  const total = data.habits.length;
  const dark  = !document.body.classList.contains("light");

  /* Doughnut */
  const ctx1 = document.getElementById("doughnutChart");
  if (dChart) dChart.destroy();
  dChart = new Chart(ctx1, {
    type: "doughnut",
    data: {
      labels: ["Completados", "Pendientes"],
      datasets: [{
        data: [done, Math.max(total - done, 0)],
        backgroundColor: ["#FF6B6B", dark ? "#2A2A3A" : "#EDE8E1"],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      cutout: "70%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: dark ? "#F0EDE8" : "#1A1A2E",
            font: { family: "DM Sans", size: 13 }
          }
        }
      }
    }
  });

  /* Bar — last 7 days */
  const ctx2   = document.getElementById("barChart");
  const labels = [], vals = [];

  for (let i = 6; i >= 0; i--) {
    const d   = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    labels.push(["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][d.getDay()]);
    vals.push(data.history[key] ? 1 : 0);
  }

  if (bChart) bChart.destroy();
  bChart = new Chart(ctx2, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: vals,
        backgroundColor: vals.map(v => v ? "#2EC4B6" : (dark ? "#252535" : "#EDE8E1")),
        borderRadius: 10,
        borderSkipped: false
      }]
    },
    options: {
      scales: {
        y: { display: false, max: 1.5 },
        x: {
          grid: { display: false },
          ticks: { color: dark ? "#5A5A7A" : "#9A9AAF", font: { family: "DM Sans" } }
        }
      },
      plugins: { legend: { display: false } },
      responsive: true
    }
  });
}

/* CALENDAR */
function renderCalendar() {
  const cal = document.getElementById("calendar");
  if (!cal) return;

  const days = ["D", "L", "M", "X", "J", "V", "S"];
  let html   = days.map(d => `<div class="day-label">${d}</div>`).join("");
  const t    = today();

  for (let i = 30; i >= 0; i--) {
    const d   = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    html += `<div class="day${data.history[key] ? " done" : ""}${key === t ? " today" : ""}"></div>`;
  }

  cal.innerHTML = html;
}

/* PROFILE PAGE */
function renderProfilePage() {
  document.getElementById("profileNameDisplay").textContent = data.name || "Usuario";
  document.getElementById("profileGoalTag").textContent     = GOAL_LABELS[data.goal] || "Mi meta";
  document.getElementById("p_name").value                   = data.name || "";
  document.getElementById("p_goal").value                   = data.goal || "productividad";

  document.getElementById("habitEditList").innerHTML = data.habits.map(h => `
    <div class="habit-edit-item">
      <input value="${esc(h.name)}" onchange="updateHabitName(${h.id}, this.value)">
      <button onclick="deleteHabit(${h.id})">×</button>
    </div>`).join("");

  if (data.photo) {
    document.getElementById("profileAvatarImg").src          = data.photo;
    document.getElementById("profileAvatarImg").style.display  = "block";
    document.getElementById("profileAvatarEmoji").style.display = "none";
  } else {
    document.getElementById("profileAvatarImg").style.display  = "none";
    document.getElementById("profileAvatarEmoji").style.display = "block";
  }
}

/* HEADER AVATAR */
function updateHeaderAvatar() {
  const btn = document.getElementById("headerAvatar");
  btn.innerHTML = data.photo
    ? `<img src="${data.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : "👤";
}

/* ══════════════════════════════════════════════════════
   PROFILE ACTIONS
══════════════════════════════════════════════════════ */
function saveProfile() {
  data.name = document.getElementById("p_name").value.trim() || data.name;
  data.goal = document.getElementById("p_goal").value;
  save();
  render();
  showToast("Perfil actualizado ✓");
}

function profileAddHabit() {
  const inp  = document.getElementById("profileHabitInput");
  const name = inp.value.trim();
  if (!name) return;
  data.habits.push({ name, done: false, id: Date.now() });
  inp.value = "";
  save();
  render();
  showToast("Hábito agregado ✓");
}

function updateHabitName(id, val) {
  const h = data.habits.find(x => x.id === id);
  if (h && val.trim()) { h.name = val.trim(); save(); }
}

function handlePhoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = ev => {
    data.photo = ev.target.result;
    save();
    render();
    showToast("Foto actualizada ✓");
  };
  r.readAsDataURL(file);
}

/* ══════════════════════════════════════════════════════
   LEADERBOARD
══════════════════════════════════════════════════════ */

/**
 * renderLeaderboard(containerId, users)
 * Llama a esta función cuando tengas datos reales (Firebase, etc.)
 *
 * @param {string} containerId - ID del .lb-rows (ej: "rows-correr")
 * @param {Array}  users       - [{ name, avatar, streak }]
 */
function renderLeaderboard(containerId, users) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rankClasses = ["rank-1", "rank-2", "rank-3"];
  let html = "";

  users.forEach((user, i) => {
    const rank = i + 1;
    const rc   = rankClasses[i] || "rank-other";

    const avatarHtml = user.avatar
      ? `<img class="lb-avatar" src="${user.avatar}" alt="${esc(user.name)}">`
      : `<div class="lb-avatar-placeholder">👤</div>`;

    if (i > 0) html += `<div class="lb-divider"></div>`;

    html += `
      <div class="lb-row ${rc}">
        <div class="lb-rank"><div class="rank-num">${rank}</div></div>
        ${avatarHtml}
        <span class="lb-name">${esc(user.name)}</span>
        <div class="lb-streak">
          <div class="streak-pill">🔥 ${user.streak}</div>
          <span class="streak-label">días</span>
        </div>
      </div>`;
  });

  html += `<div class="lb-empty-hint">${
    users.length ? "· · · más usuarios aparecerán aquí · · ·" : "Nadie en el ranking aún 👀"
  }</div>`;

  container.innerHTML = html;

  /* update badge */
  const card  = container.closest(".lb-card");
  const badge = card ? card.querySelector(".lb-count-badge") : null;
  if (badge) badge.textContent = `${users.length} activo${users.length !== 1 ? "s" : ""}`;
}

/**
 * filterLb(btn, key)
 * Filtra las tarjetas del ranking por categoría.
 * key = "all" | "correr" | "leer" | "gym" | "comida" | "custom"
 */
function filterLb(btn, key) {
  document.querySelectorAll(".lb-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");

  document.querySelectorAll(".lb-card").forEach(card => {
    if (key === "all" || card.dataset.lb === key) {
      card.style.display = "";
    } else {
      card.style.display = "none";
    }
  });
}

/* ══════════════════════════════════════════════════════
   UI NAVIGATION
══════════════════════════════════════════════════════ */
function showScreen(id, btn) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  /* lazy-render heavy screens */
  if (id === "stats")       { renderStatsNumbers(); renderCharts(); renderCalendar(); }
  if (id === "profile")     { renderProfilePage(); }
}

/* ══════════════════════════════════════════════════════
   MOTIVATION
══════════════════════════════════════════════════════ */
function newQuote() {
  document.getElementById("quoteText").textContent =
    QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

/* ══════════════════════════════════════════════════════
   MODALS & TOASTS
══════════════════════════════════════════════════════ */
function showRewardModal(r) {
  document.getElementById("modalInner").innerHTML = `
    <div class="modal-emoji">${r.emoji}</div>
    <div class="modal-title">${r.name}</div>
    <div class="modal-sub">${r.type.toUpperCase()} · 🔥${r.streak} días</div>
    <button class="modal-close" onclick="document.getElementById('rewardModal').classList.remove('active')">¡Genial!</button>
  `;
  document.getElementById("rewardModal").classList.add("active");
}

document.getElementById("rewardModal").addEventListener("click", e => {
  if (e.target === document.getElementById("rewardModal")) {
    document.getElementById("rewardModal").classList.remove("active");
  }
});

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2300);
}

/* ══════════════════════════════════════════════════════
   EVENTS
══════════════════════════════════════════════════════ */

/* Theme toggle */
document.getElementById("toggleTheme").addEventListener("click", () => {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  document.getElementById("toggleTheme").textContent = isLight ? "🌙" : "☀️";
  if (document.getElementById("stats").classList.contains("active")) renderCharts();
});

/* Add habit on Enter */
document.getElementById("habitInput").addEventListener("keydown", e => {
  if (e.key === "Enter") addHabit();
});

/* Onboarding Enter key */
document.getElementById("obHabitInput").addEventListener("keydown", e => {
  if (e.key === "Enter") obAddHabit();
});

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
function initApp() {
  newQuote();
  render();
}

/* Boot */
if (data.onboarded) {
  document.getElementById("onboarding").classList.add("hidden");
  document.getElementById("app").classList.add("visible");
  initApp();
    }
              
