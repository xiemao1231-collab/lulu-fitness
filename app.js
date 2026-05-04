const templates = {
  lower: ["哈克深蹲", "臀推", "罗马尼亚硬拉", "史密斯深蹲", "大腿伸展", "大腿外展+内收", "爬坡"],
  upper: ["高位下拉", "坐姿划船", "单臂哑铃划船", "器械夹胸", "哑铃侧平举", "山羊挺身", "爬坡"],
};

const splitNames = {
  lower: "臀腿日",
  upper: "上肢日",
};

const weightFormats = {
  哈克深蹲: { prefix: "每边", suffix: "kg", max: 200, step: 2.5 },
  臀推: { prefix: "每边", suffix: "kg", max: 240, step: 2.5 },
  罗马尼亚硬拉: { prefix: "每只手", suffix: "磅", max: 150, step: 2.5 },
  史密斯深蹲: { prefix: "每边", suffix: "kg", max: 200, step: 2.5 },
  大腿伸展: { prefix: "", suffix: "kg", max: 160, step: 2.5 },
  "大腿外展+内收": { prefix: "", suffix: "kg", max: 160, step: 2.5 },
  高位下拉: { prefix: "", suffix: "kg", max: 160, step: 2.5 },
  坐姿划船: { prefix: "", suffix: "kg", max: 160, step: 2.5 },
  单臂哑铃划船: { prefix: "", suffix: "磅", max: 150, step: 2.5 },
  器械夹胸: { prefix: "", suffix: "kg", max: 160, step: 2.5 },
  哑铃侧平举: { prefix: "每只手", suffix: "磅", max: 80, step: 2.5 },
  山羊挺身: { prefix: "", suffix: "kg", max: 100, step: 2.5 },
  爬坡: { prefix: "坡度", suffix: "", max: 20, step: 0.5 },
};

const exerciseDefaults = {
  default: { sets: 4, reps: 12, weight: 0 },
  爬坡: { sets: 1, reps: 20, weight: 4 },
};

const storageKey = "gym.training.entries.v1";
let entries = loadEntries();
let currentSession = null;
let totalCards = 0;
let loopTimer = 0;
let suppressLoopCheck = false;
let remainingExercises = [];
const loopCycleCount = 5;

const homeScreen = document.querySelector("#homeScreen");
const workoutScreen = document.querySelector("#workoutScreen");
const historyScreen = document.querySelector("#historyScreen");
const workoutTitle = document.querySelector("#workoutTitle");
const progressText = document.querySelector("#progressText");
const progressFill = document.querySelector("#progressFill");
const workoutHint = document.querySelector("#workoutHint");
const progressDots = document.querySelector("#progressDots");
const cardTrack = document.querySelector("#cardTrack");
const cardTemplate = document.querySelector("#exerciseCardTemplate");
const finishPanel = document.querySelector("#finishPanel");
const finishText = document.querySelector("#finishText");
const endWorkoutButton = document.querySelector("#endWorkoutButton");
const workoutCarouselMeta = document.querySelector("#workoutCarouselMeta");
const historyList = document.querySelector("#historyList");
const importInput = document.querySelector("#importInput");
const assistantOverlay = document.querySelector("#assistantOverlay");
const assistantList = document.querySelector("#assistantList");
const assistantCloseButton = document.querySelector("#assistantCloseButton");
let assistantTapTimer = 0;
let assistantLastTap = 0;
let assistantEditingIndex = null;

document.querySelectorAll("[data-start-split]").forEach((button) => {
  button.addEventListener("click", () => startWorkout(button.dataset.startSplit));
});

document.querySelector("#backButton").addEventListener("click", showHome);
document.querySelector("#finishHomeButton").addEventListener("click", showHome);
document.querySelector("#historyButton").addEventListener("click", showHistory);
document.querySelector("#historyBackButton").addEventListener("click", showHome);
document.querySelector("#endWorkoutButton").addEventListener("click", endWorkout);
document.querySelector("#exportButton").addEventListener("click", exportEntries);
importInput.addEventListener("change", importEntries);
document.querySelectorAll(".workout-mascot").forEach((button) => {
  button.addEventListener("click", handleMascotTap);
  button.addEventListener("dblclick", (event) => event.preventDefault());
});
assistantCloseButton.addEventListener("click", closeAssistant);
assistantOverlay.addEventListener("click", (event) => {
  if (event.target.closest("[data-assistant-close]")) closeAssistant();
});
assistantList.addEventListener("click", handleAssistantAction);

cardTrack.addEventListener("click", (event) => {
  const button = event.target.closest(".confirm-button");
  if (button) {
    confirmExercise(button.closest(".exercise-card"));
    return;
  }
});

cardTrack.addEventListener("scroll", scheduleLoopCheck, { passive: true });
cardTrack.addEventListener("scroll", handleWheelScroll, true);
cardTrack.addEventListener("touchstart", stopWheelTouch, { passive: true, capture: true });
cardTrack.addEventListener("touchmove", stopWheelTouch, { passive: true, capture: true });
document.addEventListener("gesturestart", preventZoom);
document.addEventListener("gesturechange", preventZoom);
document.addEventListener("touchmove", preventMultiTouchZoom, { passive: false });

function startWorkout(split) {
  const exercises = templates[split] || templates.lower;
  totalCards = exercises.length;
  remainingExercises = [...exercises];
  currentSession = {
    id: createId(),
    date: toDateKey(new Date()),
    split,
    mood: "",
    notes: "",
    exercises: [],
    createdAt: new Date().toISOString(),
  };

  workoutTitle.textContent = splitNames[split];
  workoutScreen.dataset.split = split;
  cardTrack.innerHTML = "";
  cardTrack.hidden = false;
  endWorkoutButton.hidden = false;
  if (workoutCarouselMeta) workoutCarouselMeta.hidden = false;
  finishPanel.hidden = true;
  closeAssistant();
  homeScreen.hidden = true;
  historyScreen.hidden = true;
  workoutScreen.hidden = false;
  renderCardLoop();
  updateProgress();
}

function createCard(name) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  const defaults = exerciseDefaults[name] || exerciseDefaults.default;
  const weightFormat = weightFormats[name] || { prefix: "", suffix: "kg", max: 160, step: 2.5 };
  const doneCount = currentSession ? currentSession.exercises.length : 0;
  const exerciseNumber = doneCount + Math.max(remainingExercises.indexOf(name), 0) + 1;
  card.dataset.exercise = name;
  card.querySelector(".exercise-name").textContent = name;
  card.querySelector(".exercise-index").textContent = `${Math.min(exerciseNumber, totalCards)} / ${totalCards}`;
  card.querySelector(".exercise-target").textContent = targetText(name, defaults);
  fillWheel(card.querySelector(".sets"), numberRange(1, 20, 1), defaults.sets);
  fillWheel(card.querySelector(".reps"), numberRange(1, 200, 1), defaults.reps);
  fillWheel(card.querySelector(".weight"), numberRange(0, weightFormat.max, weightFormat.step), defaults.weight);
  card.querySelector(".weight-prefix").textContent = weightFormat.prefix;
  card.querySelector(".weight-suffix").textContent = weightFormat.suffix;

  if (isCardioName(name)) {
    card.querySelector(".sets-field").remove();
    card.querySelector(".reps-label").textContent = "时间";
    card.querySelector(".weight-label").textContent = "坡度";
    card.querySelector(".weight-prefix").textContent = "";
  }

  return card;
}

function confirmExercise(card) {
  if (!card || card.classList.contains("is-removing") || !currentSession) return;
  const exercise = {
    name: card.dataset.exercise,
    sets: isCardioName(card.dataset.exercise) ? 1 : getWheelValue(card.querySelector(".sets")),
    reps: getWheelValue(card.querySelector(".reps")),
    weight: getWheelValue(card.querySelector(".weight")),
    effort: null,
  };

  if (!exercise.name || exercise.sets <= 0 || exercise.reps <= 0) return;

  const confirmedIndex = remainingExercises.indexOf(exercise.name);
  currentSession.exercises.push(exercise);
  remainingExercises = remainingExercises.filter((name) => name !== exercise.name);
  const nextExercise = remainingExercises[confirmedIndex] || remainingExercises[0];
  persistCurrentSession();
  const sameCards = cardTrack.querySelectorAll(`[data-exercise="${cssEscape(exercise.name)}"]`);
  sameCards.forEach((sameCard) => sameCard.classList.add("is-removing"));

  window.setTimeout(() => {
    updateProgress();
    renderCardLoop(nextExercise);
    if (!remainingExercises.length) showFinish();
  }, 620);
}

function persistCurrentSession() {
  const existingIndex = entries.findIndex((entry) => entry.id === currentSession.id);
  if (!currentSession.exercises.length) {
    if (existingIndex >= 0) entries.splice(existingIndex, 1);
    saveEntries();
    return;
  }
  if (existingIndex >= 0) entries[existingIndex] = currentSession;
  else entries.unshift(currentSession);
  saveEntries();
}

function updateProgress() {
  const done = currentSession ? currentSession.exercises.length : 0;
  progressText.textContent = `${done} / ${totalCards}`;
  if (progressFill) {
    const percent = totalCards ? Math.min(100, (done / totalCards) * 100) : 0;
    progressFill.style.width = `${percent}%`;
  }
  updateProgressDots(done);
  updateWorkoutHint(done);
  renderAssistantPanel();
}

function updateProgressDots(done) {
  if (!progressDots) return;
  const activeIndex = Math.min(done, Math.max(totalCards - 1, 0));
  progressDots.innerHTML = Array.from({ length: totalCards }, (_, index) => {
    const activeClass = index === activeIndex ? " is-active" : "";
    return `<span class="progress-dot${activeClass}"></span>`;
  }).join("");
}

function updateWorkoutHint(done) {
  if (!workoutHint) return;
  if (!currentSession) {
    workoutHint.textContent = "准备开始今天的训练吧";
    return;
  }
  if (!remainingExercises.length || done >= totalCards) {
    workoutHint.textContent = "今天完成啦，记得好好休息";
    return;
  }
  const nextName = remainingExercises[0];
  workoutHint.textContent = done
    ? `下一项轮到${nextName}，保持节奏`
    : `今天先从${nextName}开始吧`;
}

function targetText(name, defaults) {
  if (isCardioName(name)) return `目标：${defaults.reps}分钟 × 坡度${defaults.weight}`;
  return `目标：${defaults.sets}组 × ${defaults.reps}次`;
}

function showFinish() {
  updateFinishText();
  cardTrack.hidden = true;
  endWorkoutButton.hidden = true;
  if (workoutCarouselMeta) workoutCarouselMeta.hidden = true;
  finishPanel.hidden = false;
}

function showHome() {
  workoutScreen.hidden = true;
  historyScreen.hidden = true;
  homeScreen.hidden = false;
  cardTrack.innerHTML = "";
  cardTrack.hidden = false;
  endWorkoutButton.hidden = false;
  if (workoutCarouselMeta) workoutCarouselMeta.hidden = false;
  finishPanel.hidden = true;
  closeAssistant();
  currentSession = null;
  remainingExercises = [];
  delete workoutScreen.dataset.split;
}

function showHistory() {
  renderHistory();
  homeScreen.hidden = true;
  workoutScreen.hidden = true;
  historyScreen.hidden = false;
}

function endWorkout() {
  if (!currentSession) return;
  if (currentSession.exercises.length) persistCurrentSession();
  showFinish();
}

function handleMascotTap(event) {
  event.preventDefault();
  if (!currentSession || workoutScreen.hidden) return;

  const now = Date.now();
  if (now - assistantLastTap < 320) {
    window.clearTimeout(assistantTapTimer);
    assistantLastTap = 0;
    if (!undoCompletedExercise()) openAssistant();
    return;
  }

  assistantLastTap = now;
  window.clearTimeout(assistantTapTimer);
  assistantTapTimer = window.setTimeout(() => {
    assistantLastTap = 0;
    openAssistant();
  }, 230);
}

function openAssistant() {
  if (!assistantOverlay || !currentSession) return;
  assistantEditingIndex = null;
  assistantOverlay.hidden = false;
  renderAssistantPanel();
}

function closeAssistant() {
  if (!assistantOverlay) return;
  assistantEditingIndex = null;
  assistantOverlay.hidden = true;
}

function handleAssistantAction(event) {
  const button = event.target.closest("[data-assistant-action]");
  if (!button || !currentSession) return;
  const item = button.closest(".assistant-item");
  const index = item ? Number(item.dataset.index) : -1;
  const action = button.dataset.assistantAction;

  if (action === "edit") {
    assistantEditingIndex = index;
    renderAssistantPanel();
    return;
  }

  if (action === "cancel-edit") {
    assistantEditingIndex = null;
    renderAssistantPanel();
    return;
  }

  if (action === "save-edit") {
    saveAssistantEdit(index);
    return;
  }

  if (action === "undo") {
    if (undoCompletedExercise(index)) closeAssistant();
  }
}

function renderAssistantPanel() {
  if (!assistantList || !currentSession || assistantOverlay.hidden) return;
  const completed = currentSession.exercises;
  if (!completed.length) {
    assistantList.innerHTML = `<div class="assistant-empty">还没有完成动作</div>`;
    return;
  }

  assistantList.innerHTML = completed.map((exercise, index) => renderAssistantItem(exercise, index)).join("");
}

function renderAssistantItem(exercise, index) {
  const editing = assistantEditingIndex === index;
  const editPanel = editing ? renderAssistantEdit(exercise) : "";
  return `
    <article class="assistant-item${editing ? " is-editing" : ""}" data-index="${index}">
      <div class="assistant-item-main">
        <div class="assistant-item-copy">
          <h3>${escapeHtml(exercise.name)}</h3>
          <p>${escapeHtml(formatExerciseLine(exercise))}</p>
        </div>
        <div class="assistant-actions">
          <button class="assistant-action" type="button" data-assistant-action="edit">编辑</button>
          <button class="assistant-action assistant-action-danger" type="button" data-assistant-action="undo">撤回</button>
        </div>
      </div>
      ${editPanel}
    </article>
  `;
}

function renderAssistantEdit(exercise) {
  const format = weightFormats[exercise.name] || { prefix: "", suffix: "kg", max: 160, step: 2.5 };
  const weightLabel = format.prefix ? `重量 · ${format.prefix}` : "重量";
  const setsField = isCardioName(exercise.name)
    ? ""
    : renderEditField("组数", "sets", exercise.sets, 1, 20, 1);

  return `
    <div class="assistant-edit">
      <div class="assistant-edit-grid">
        ${setsField}
        ${renderEditField(isCardioName(exercise.name) ? "时间" : "次数", "reps", exercise.reps, 1, 200, 1)}
        ${renderEditField(isCardioName(exercise.name) ? "坡度" : weightLabel, "weight", exercise.weight || 0, 0, format.max, format.step, format.suffix)}
      </div>
      <div class="assistant-edit-actions">
        <button class="assistant-edit-button" type="button" data-assistant-action="cancel-edit">取消</button>
        <button class="assistant-edit-button is-primary" type="button" data-assistant-action="save-edit">保存</button>
      </div>
    </div>
  `;
}

function renderEditField(label, field, value, min, max, step, suffix = "") {
  return `
    <label class="assistant-edit-field">
      <span>${escapeHtml(label)}</span>
      <span class="assistant-edit-input-wrap">
        <input data-edit-field="${field}" type="number" min="${min}" max="${max}" step="${step}" value="${value}" />
        ${suffix ? `<em>${escapeHtml(suffix)}</em>` : ""}
      </span>
    </label>
  `;
}

function saveAssistantEdit(index) {
  const exercise = currentSession?.exercises[index];
  const item = assistantList.querySelector(`.assistant-item[data-index="${index}"]`);
  if (!exercise || !item) return;
  const format = weightFormats[exercise.name] || { max: 160, step: 2.5 };
  const setsInput = item.querySelector('[data-edit-field="sets"]');
  const repsInput = item.querySelector('[data-edit-field="reps"]');
  const weightInput = item.querySelector('[data-edit-field="weight"]');

  if (!isCardioName(exercise.name)) {
    exercise.sets = normalizeEditNumber(setsInput?.value, exercise.sets, 1, 20, 1);
  }
  exercise.reps = normalizeEditNumber(repsInput?.value, exercise.reps, 1, 200, 1);
  exercise.weight = normalizeEditNumber(weightInput?.value, exercise.weight || 0, 0, format.max, format.step);
  assistantEditingIndex = null;
  persistCurrentSession();
  updateFinishText();
  renderAssistantPanel();
}

function updateFinishText() {
  if (!currentSession) return;
  const volume = entryVolume(currentSession);
  finishText.textContent = `记录 ${currentSession.exercises.length} 项，力量总量 ${formatNumber(volume)} kg。`;
}

function undoCompletedExercise(index = currentSession ? currentSession.exercises.length - 1 : -1) {
  if (!currentSession || index < 0 || index >= currentSession.exercises.length) return false;
  const [exercise] = currentSession.exercises.splice(index, 1);
  restoreRemainingExercise(exercise.name);
  persistCurrentSession();
  cardTrack.hidden = false;
  endWorkoutButton.hidden = false;
  if (workoutCarouselMeta) workoutCarouselMeta.hidden = false;
  finishPanel.hidden = true;
  updateProgress();
  renderCardLoop(exercise.name);
  renderAssistantPanel();
  return true;
}

function restoreRemainingExercise(name) {
  if (!name || remainingExercises.includes(name)) return;
  const order = templates[currentSession.split] || templates.lower;
  const targetOrder = order.indexOf(name);
  const insertAt = remainingExercises.findIndex((exerciseName) => order.indexOf(exerciseName) > targetOrder);
  if (insertAt >= 0) remainingExercises.splice(insertAt, 0, name);
  else remainingExercises.push(name);
}

function scheduleLoopCheck() {
  if (suppressLoopCheck) return;
  window.clearTimeout(loopTimer);
  loopTimer = window.setTimeout(recenterLoopIfNeeded, 260);
}

function renderCardLoop(targetName = remainingExercises[0]) {
  cardTrack.classList.add("is-layouting");
  cardTrack.innerHTML = "";
  if (!remainingExercises.length) {
    cardTrack.classList.remove("is-layouting", "is-jumping");
    return;
  }
  const cycles = remainingExercises.length > 1 ? loopCycleCount : 1;
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    remainingExercises.forEach((name, index) => {
      const card = createCard(name);
      card.dataset.cycle = String(cycle);
      card.dataset.index = String(index);
      cardTrack.append(card);
    });
  }
  const targetIndex = Math.max(0, remainingExercises.indexOf(targetName));
  requestAnimationFrame(() => centerMiddleCycle(targetIndex, true));
}

function recenterLoopIfNeeded() {
  if (remainingExercises.length < 2) return;
  const cards = Array.from(cardTrack.querySelectorAll(".exercise-card"));
  const nearest = getNearestCard(cards);
  if (!nearest) return;
  const cycle = Number(nearest.dataset.cycle);
  if (cycle === middleLoopCycle()) return;
  const index = Number(nearest.dataset.index);
  centerMiddleCycle(index);
}

function centerMiddleCycle(index, hideDuringJump = false) {
  if (remainingExercises.length < 2) {
    const onlyCard = cardTrack.querySelector(".exercise-card");
    if (onlyCard) jumpToCard(onlyCard, hideDuringJump);
    return;
  }

  const card = cardTrack.querySelector(`.exercise-card[data-cycle="${middleLoopCycle()}"][data-index="${index}"]`);
  if (card) jumpToCard(card, hideDuringJump);
}

function middleLoopCycle() {
  return remainingExercises.length > 1 ? Math.floor(loopCycleCount / 2) : 0;
}

function jumpToCard(card, hideDuringJump = false) {
  const targetLeft = card.offsetLeft - (cardTrack.clientWidth - card.offsetWidth) / 2;
  suppressLoopCheck = true;
  window.clearTimeout(loopTimer);
  cardTrack.classList.add("is-jumping");
  if (hideDuringJump) cardTrack.classList.add("is-layouting");
  cardTrack.scrollLeft = Math.max(0, targetLeft);
  requestAnimationFrame(() => {
    cardTrack.scrollLeft = Math.max(0, targetLeft);
    requestAnimationFrame(() => {
      cardTrack.classList.remove("is-jumping", "is-layouting");
      suppressLoopCheck = false;
    });
  });
}

function getNearestCard(cards) {
  const center = cardTrack.scrollLeft + cardTrack.clientWidth / 2;
  return cards.reduce((nearest, card) => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const distance = Math.abs(center - cardCenter);
    if (!nearest || distance < nearest.distance) return { card, distance };
    return nearest;
  }, null)?.card;
}

function renderHistory() {
  if (!entries.length) {
    historyList.innerHTML = `<div class="empty-history">暂无记录</div>`;
    return;
  }

  historyList.innerHTML = entries
    .map((entry) => {
      const splitName = splitNames[entry.split] || "训练";
      const volume = entryVolume(entry);
      const items = entry.exercises
        .map((exercise) => `<li>${formatExerciseLine(exercise)}</li>`)
        .join("");
      return `
        <article class="history-item">
          <h2>${entry.date} · ${splitName}</h2>
          <p>${entry.exercises.length} 项 · ${formatNumber(volume)} kg</p>
          <ul>${items}</ul>
        </article>
      `;
    })
    .join("");
}

function exportEntries() {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `training-log-${toDateKey(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importEntries(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error("Invalid format");
    entries = imported.filter((entry) => entry.date && Array.isArray(entry.exercises));
    saveEntries();
    alert("恢复完成");
  } catch {
    alert("恢复失败");
  } finally {
    event.target.value = "";
  }
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(storageKey, JSON.stringify(entries));
}

function entryVolume(entry) {
  if (!entry) return 0;
  return entry.exercises.reduce((sum, exercise) => {
    if (isCardioName(exercise.name)) return sum;
    return sum + exercise.sets * exercise.reps * (exercise.weight || 0);
  }, 0);
}

function formatExerciseLine(exercise) {
  const format = weightFormats[exercise.name] || { prefix: "", suffix: "kg" };
  const weightText = `${format.prefix ? `${format.prefix} ` : ""}${exercise.weight || 0}${format.suffix ? ` ${format.suffix}` : ""}`;
  if (isCardioName(exercise.name)) {
    return `${exercise.name} · 坡度 ${exercise.weight || 0} · ${exercise.reps} 分钟`;
  }
  return `${exercise.name} · ${exercise.sets} 组 × ${exercise.reps} 次 · ${weightText}`;
}

function isCardioName(name) {
  return name.includes("爬坡");
}

function createId() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatNumber(value) {
  return Math.round(value).toLocaleString("zh-CN");
}

function normalizeEditNumber(value, fallback, min, max, step) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const clamped = Math.min(Math.max(number, min), max);
  if (step >= 1) return Math.round(clamped);
  return Number(clamped.toFixed(1));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function numberRange(min, max, step) {
  const values = [];
  for (let value = min; value <= max + step / 10; value += step) {
    values.push(Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, ""));
  }
  return values;
}

function fillWheel(wheel, values, selected) {
  wheel.innerHTML = values.map((value) => `<div class="wheel-option" data-value="${value}">${value}</div>`).join("");
  wheel.dataset.value = String(selected);
  requestAnimationFrame(() => scrollWheelToValue(wheel, selected, "auto"));
}

function scrollWheelToValue(wheel, value, behavior = "smooth") {
  const option = Array.from(wheel.querySelectorAll(".wheel-option")).find((item) => item.dataset.value === String(value));
  if (!option) return;
  scrollWheelOptionIntoCenter(wheel, option, behavior);
  updateWheelSelection(wheel);
}

function handleWheelScroll(event) {
  const wheel = event.target.closest?.(".inline-wheel");
  if (!wheel) return;
  window.clearTimeout(wheel._snapTimer);
  wheel._snapTimer = window.setTimeout(() => snapWheel(wheel), 120);
  updateWheelSelection(wheel);
}

function snapWheel(wheel) {
  const option = getNearestWheelOption(wheel);
  if (!option) return;
  scrollWheelOptionIntoCenter(wheel, option, "smooth");
  wheel.dataset.value = option.dataset.value;
  updateWheelSelection(wheel);
}

function scrollWheelOptionIntoCenter(wheel, option, behavior = "auto") {
  const top = option.offsetTop - (wheel.clientHeight - option.offsetHeight) / 2;
  const safeTop = Math.max(0, top);
  if (behavior === "smooth") {
    wheel.scrollTo({ top: safeTop, behavior: "smooth" });
    return;
  }
  wheel.scrollTop = safeTop;
}

function updateWheelSelection(wheel) {
  const selected = getNearestWheelOption(wheel);
  if (!selected) return;
  wheel.dataset.value = selected.dataset.value;
  wheel.querySelectorAll(".wheel-option").forEach((option) => {
    option.classList.toggle("is-selected", option === selected);
  });
}

function getNearestWheelOption(wheel) {
  const center = wheel.scrollTop + wheel.clientHeight / 2;
  return Array.from(wheel.querySelectorAll(".wheel-option")).reduce((nearest, option) => {
    const optionCenter = option.offsetTop + option.offsetHeight / 2;
    const distance = Math.abs(center - optionCenter);
    if (!nearest || distance < nearest.distance) return { option, distance };
    return nearest;
  }, null)?.option;
}

function getWheelValue(wheel) {
  if (!wheel) return 0;
  updateWheelSelection(wheel);
  return Number(wheel.dataset.value || 0);
}

function stopWheelTouch(event) {
  if (event.target.closest(".inline-wheel")) event.stopPropagation();
}

function preventZoom(event) {
  event.preventDefault();
}

function preventMultiTouchZoom(event) {
  if (event.touches && event.touches.length > 1) event.preventDefault();
}

function cssEscape(value) {
  if (globalThis.CSS && CSS.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
