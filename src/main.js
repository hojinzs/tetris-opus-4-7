// Entry point: scenes, input wiring, audio, leaderboard, render loop.

import { Game, GameState } from "./game.js";
import { Input } from "./input.js";
import { renderBoard, renderMini, renderFlash } from "./renderer.js";
import { loadSettings, saveSettings } from "./settings.js";
import * as Audio from "./audio.js";
import { loadLeaderboard, isHighScore, submitEntry, clearLeaderboard } from "./leaderboard.js";
import { renderCharacter, triggerDance, resetDance } from "./character.js";

// DOM refs
const boardCanvas = document.getElementById("board-canvas");
const holdCanvas = document.getElementById("hold-canvas");
const nextCanvas = document.getElementById("next-canvas");
const boardCtx = boardCanvas.getContext("2d");
const holdCtx = holdCanvas.getContext("2d");
const nextCtx = nextCanvas.getContext("2d");
const characterCanvas = document.getElementById("character-canvas");
const characterCtx = characterCanvas.getContext("2d");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const linesEl = document.getElementById("lines");
const timeEl = document.getElementById("time");

const goScoreEl = document.getElementById("go-score");
const goLinesEl = document.getElementById("go-lines");
const goLevelEl = document.getElementById("go-level");

const boardWrap = document.querySelector(".board-wrap");
const levelUpFlashEl = document.getElementById("level-up-flash");
const crtOverlay = document.getElementById("crt-overlay");

const sceneTitle = document.querySelector('[data-scene="title"]');
const sceneHowTo = document.querySelector('[data-scene="howto"]');
const sceneSettings = document.querySelector('[data-scene="settings"]');
const sceneLeaderboard = document.querySelector('[data-scene="leaderboard"]');
const sceneNameInput = document.querySelector('[data-scene="name-input"]');
const sceneConfirm = document.querySelector('[data-scene="confirm"]');
const confirmTitle = document.getElementById("confirm-title");
const confirmBody = document.getElementById("confirm-body");
const scenePause = document.querySelector('[data-scene="pause"]');
const sceneGameOver = document.querySelector('[data-scene="gameover"]');

const setLevelInput = document.getElementById("set-level");
const setLevelVal = document.getElementById("set-level-val");
const setCrtInput = document.getElementById("set-crt");
const setGhostInput = document.getElementById("set-ghost");
const setSfxOn = document.getElementById("set-sfx-on");
const setSfxVol = document.getElementById("set-sfx-vol");
const setSfxVolVal = document.getElementById("set-sfx-vol-val");
const setBgmOn = document.getElementById("set-bgm-on");
const setBgmVol = document.getElementById("set-bgm-vol");
const setBgmVolVal = document.getElementById("set-bgm-vol-val");

const lbBody = document.getElementById("lb-body");
const lbEmpty = document.getElementById("lb-empty");
const niRank = document.getElementById("ni-rank");
const niScore = document.getElementById("ni-score");
const niInput = document.getElementById("ni-input");
const nameForm = document.getElementById("name-form");

// State
let settings = loadSettings();
let currentScene = "title";
let previousScene = "title";
let game = null;
let pendingEntry = null; // { rank, score, lines, level, durationSec }
let highlightedLbName = null; // highlight newly-added entry on leaderboard
let pendingConfirm = null; // { onOk, title, body }

// --- Audio setup ---
function applyAudioSettings() {
  Audio.setSfxEnabled(settings.sfxEnabled);
  Audio.setSfxVolume(settings.sfxVolume);
  Audio.setBgmEnabled(settings.bgmEnabled);
  Audio.setBgmVolume(settings.bgmVolume);
}

function startBgmIfEnabled() {
  if (settings.bgmEnabled) Audio.startBgm();
}

// First-click/keypress unlocks AudioContext (autoplay policy)
let audioUnlocked = false;
function unlockAudioOnce() {
  if (audioUnlocked) return;
  Audio.initAudio();
  Audio.unlockAudio();
  applyAudioSettings();
  audioUnlocked = true;
}
window.addEventListener("click", unlockAudioOnce, { once: false });
window.addEventListener("keydown", unlockAudioOnce, { once: false });

// --- Settings controls ---
function applyCrt() {
  crtOverlay.classList.toggle("hidden", !settings.crtScanlines);
}

function initSettingsControls() {
  setLevelInput.value = settings.startLevel;
  setLevelVal.textContent = settings.startLevel;
  setCrtInput.checked = !!settings.crtScanlines;
  setGhostInput.checked = !!settings.ghostPiece;
  setSfxOn.checked = !!settings.sfxEnabled;
  setBgmOn.checked = !!settings.bgmEnabled;
  setSfxVol.value = Math.round(settings.sfxVolume * 100);
  setBgmVol.value = Math.round(settings.bgmVolume * 100);
  setSfxVolVal.textContent = setSfxVol.value;
  setBgmVolVal.textContent = setBgmVol.value;

  setLevelInput.addEventListener("input", () => {
    settings.startLevel = parseInt(setLevelInput.value, 10);
    setLevelVal.textContent = settings.startLevel;
    saveSettings(settings);
  });
  setCrtInput.addEventListener("change", () => {
    settings.crtScanlines = setCrtInput.checked;
    saveSettings(settings);
    applyCrt();
  });
  setGhostInput.addEventListener("change", () => {
    settings.ghostPiece = setGhostInput.checked;
    saveSettings(settings);
  });
  setSfxOn.addEventListener("change", () => {
    settings.sfxEnabled = setSfxOn.checked;
    saveSettings(settings);
    Audio.setSfxEnabled(settings.sfxEnabled);
  });
  setSfxVol.addEventListener("input", () => {
    settings.sfxVolume = parseInt(setSfxVol.value, 10) / 100;
    setSfxVolVal.textContent = setSfxVol.value;
    saveSettings(settings);
    Audio.setSfxVolume(settings.sfxVolume);
  });
  setBgmOn.addEventListener("change", () => {
    settings.bgmEnabled = setBgmOn.checked;
    saveSettings(settings);
    Audio.setBgmEnabled(settings.bgmEnabled);
    if (settings.bgmEnabled && currentScene === "playing") Audio.startBgm();
    else Audio.stopBgm();
  });
  setBgmVol.addEventListener("input", () => {
    settings.bgmVolume = parseInt(setBgmVol.value, 10) / 100;
    setBgmVolVal.textContent = setBgmVol.value;
    saveSettings(settings);
    Audio.setBgmVolume(settings.bgmVolume);
  });
}

// --- Scenes ---
function showScene(name) {
  if (name !== currentScene) previousScene = currentScene;
  currentScene = name;
  sceneTitle.classList.toggle("hidden", name !== "title");
  sceneHowTo.classList.toggle("hidden", name !== "howto");
  sceneSettings.classList.toggle("hidden", name !== "settings");
  sceneLeaderboard.classList.toggle("hidden", name !== "leaderboard");
  sceneNameInput.classList.toggle("hidden", name !== "name-input");
  sceneConfirm.classList.toggle("hidden", name !== "confirm");
  if (name !== "playing") {
    scenePause.classList.add("hidden");
    sceneGameOver.classList.add("hidden");
  }
  // BGM: play only during "playing"
  if (name === "playing") startBgmIfEnabled();
  else Audio.stopBgm();
  if (name === "leaderboard") renderLeaderboard();
  if (name === "name-input") {
    niInput.value = "";
    setTimeout(() => niInput.focus(), 50);
  }
}

function startGame() {
  game = new Game({ startLevel: settings.startLevel });
  if (typeof window !== "undefined") window.__game = game;
  highlightedLbName = null;
  lastRenderedScore = 0;
  showScene("playing");
}

function returnToMainMenu() {
  game = null;
  pendingEntry = null;
  if (typeof window !== "undefined") window.__game = null;
  showScene("title");
}

// --- Leaderboard ---
function renderLeaderboard() {
  const entries = loadLeaderboard();
  lbBody.innerHTML = "";
  if (entries.length === 0) {
    lbEmpty.classList.remove("hidden");
    return;
  }
  lbEmpty.classList.add("hidden");
  entries.forEach((e, i) => {
    const tr = document.createElement("tr");
    if (highlightedLbName && e.name === highlightedLbName && !tr.dataset.marked) {
      tr.classList.add("me");
      tr.dataset.marked = "1";
      highlightedLbName = null; // only highlight the first match
    }
    const dur = formatDuration(e.durationSec);
    const date = new Date(e.date).toLocaleDateString();
    tr.innerHTML = `
      <td class="rank">#${i + 1}</td>
      <td>${escapeHtml(e.name)}</td>
      <td>${e.score.toLocaleString()}</td>
      <td>${e.lines}</td>
      <td>${e.level}</td>
      <td>${dur}</td>
      <td>${date}</td>
    `;
    lbBody.appendChild(tr);
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDuration(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// --- Name input form ---
nameForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!pendingEntry) return;
  const raw = niInput.value.trim().toUpperCase().replace(/[^A-Z]/g, "");
  const name = (raw || "AAA").slice(0, 3).padEnd(3, "A");
  const { rank } = submitEntry({ ...pendingEntry, name });
  highlightedLbName = name;
  pendingEntry = null;
  showScene("leaderboard");
});

// --- Button wiring ---
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  switch (action) {
    case "start":
      startGame();
      break;
    case "howto":
      showScene("howto");
      break;
    case "settings":
      showScene("settings");
      break;
    case "leaderboard":
      showScene("leaderboard");
      break;
    case "clear-scores":
      pendingConfirm = {
        title: "CLEAR SCORES",
        body: "All leaderboard records will be deleted. This cannot be undone.",
        onOk: () => {
          clearLeaderboard();
          renderLeaderboard();
        },
      };
      confirmTitle.textContent = pendingConfirm.title;
      confirmBody.textContent = pendingConfirm.body;
      showScene("confirm");
      break;
    case "confirm-cancel":
      pendingConfirm = null;
      showScene("leaderboard");
      break;
    case "confirm-ok":
      if (pendingConfirm) {
        pendingConfirm.onOk();
        pendingConfirm = null;
      }
      showScene("leaderboard");
      break;
    case "main-menu":
      returnToMainMenu();
      break;
    case "resume":
      if (game?.state === GameState.Paused) game.togglePause();
      break;
    case "restart":
      if (game) {
        game.restart();
        scenePause.classList.add("hidden");
        sceneGameOver.classList.add("hidden");
        if (currentScene !== "playing") showScene("playing");
      } else {
        startGame();
      }
      break;
  }
});

// --- Input ---
const input = new Input({
  onMove: (dir) => game?.move(dir),
  onRotate: (dir) => game?.rotate(dir),
  onSoftDrop: (active) => game?.setSoftDrop(active),
  onHardDrop: () => game?.hardDrop(),
  onHold: () => game?.holdPiece(),
  onPause: () => {
    if (currentScene !== "playing") return;
    game?.togglePause();
  },
  onRestart: () => {
    if (game?.state === GameState.GameOver) game.restart();
  },
});
input.attach();

// --- HUD / overlays ---
function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

let lastRenderedScore = 0;
function updateHud() {
  if (!game) return;
  const s = game.stats.score;
  if (s !== lastRenderedScore) {
    scoreEl.textContent = s.toLocaleString();
    if (s > lastRenderedScore) {
      scoreEl.classList.remove("ticker");
      // restart animation
      void scoreEl.offsetWidth;
      scoreEl.classList.add("ticker");
    }
    lastRenderedScore = s;
  }
  levelEl.textContent = game.stats.level;
  linesEl.textContent = game.stats.lines;
  timeEl.textContent = formatTime(game.elapsedMs);
}

let gameOverHandled = false;
function handleGameOver() {
  if (!game || gameOverHandled) return;
  gameOverHandled = true;
  Audio.stopBgm();
  const entry = {
    score: game.stats.score,
    lines: game.stats.lines,
    level: game.stats.level,
    durationSec: Math.floor(game.elapsedMs / 1000),
  };
  if (isHighScore(entry.score)) {
    pendingEntry = entry;
    // Rank preview: how many entries are strictly better
    const entries = loadLeaderboard();
    const rank = entries.filter((e) => e.score >= entry.score).length + 1;
    niRank.textContent = rank;
    niScore.textContent = entry.score.toLocaleString();
    showScene("name-input");
  }
}

function updateGameOverlays() {
  if (!game) {
    scenePause.classList.add("hidden");
    sceneGameOver.classList.add("hidden");
    return;
  }
  const showPause = currentScene === "playing" && game.state === GameState.Paused;
  const showGameOver = currentScene === "playing" && game.state === GameState.GameOver;
  scenePause.classList.toggle("hidden", !showPause);
  sceneGameOver.classList.toggle("hidden", !showGameOver);
  if (showGameOver) {
    goScoreEl.textContent = game.stats.score.toLocaleString();
    goLinesEl.textContent = game.stats.lines;
    goLevelEl.textContent = game.stats.level;
  }
  // Reset gameover handler when game restarts
  if (game.state === GameState.Playing) gameOverHandled = false;
}

function updateLevelUpEffect() {
  if (!game) {
    levelUpFlashEl.classList.remove("active");
    boardWrap.classList.remove("level-up-border");
    return;
  }
  const active = !!game.levelUpFlash;
  levelUpFlashEl.classList.toggle("active", active);
  boardWrap.classList.toggle("level-up-border", active);
}

// --- Event/sound pipeline ---
function processGameEvents() {
  if (!game || !game.events.length) return;
  for (const ev of game.events) {
    switch (ev.type) {
      case "move": Audio.Sfx.move(); break;
      case "rotate": Audio.Sfx.rotate(); break;
      case "hold": Audio.Sfx.hold(); break;
      case "hardDrop": Audio.Sfx.hardDrop(); break;
      case "lock": Audio.Sfx.lock(); break;
      case "lineClear":
        Audio.Sfx.lineClear(ev.count);
        if (ev.count >= 4) triggerDance(2800, 2); // Tetris → strong dance
        else if (ev.count === 3) triggerDance(1600, 1); // Triple
        // Combo continuation dance (combo >= 3)
        if (game.stats.combo >= 3) triggerDance(1400 + game.stats.combo * 150, 1);
        break;
      case "tSpin":
        Audio.Sfx.tSpin();
        triggerDance(2200, 2); // T-Spin → dance
        break;
      case "perfectClear":
        Audio.Sfx.perfectClear();
        triggerDance(4000, 3); // Perfect Clear → super dance
        break;
      case "levelUp":
        Audio.Sfx.levelUp();
        triggerDance(2000, 2); // Level up → celebratory dance
        break;
      case "gameOver":
        Audio.Sfx.gameOver();
        Audio.stopBgm();
        resetDance();
        handleGameOver();
        break;
    }
  }
  game.events.length = 0;
}

// --- Render loop ---
function renderEmptyBoard() {
  const ctx = boardCtx;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function render() {
  if (game) {
    renderBoard(boardCtx, game.board, game.piece, {
      clearAnim: game.clearAnim,
      elapsedMs: game.elapsedMs,
      showGhost: settings.ghostPiece,
    });
    renderFlash(boardCtx, game.flash, game.elapsedMs);
    renderMini(holdCtx, [game.hold], { cell: 20, slotH: 90 });
    renderMini(nextCtx, game.nextPieces, { cell: 20, slotH: 90 });
    const off = game.getShakeOffset();
    boardCanvas.style.transform = `translate(${off.x.toFixed(1)}px, ${off.y.toFixed(1)}px)`;
    updateHud();
    updateGameOverlays();
    updateLevelUpEffect();
  } else {
    renderEmptyBoard();
    renderMini(holdCtx, [null], { cell: 20, slotH: 90 });
    renderMini(nextCtx, [null, null, null, null, null], { cell: 20, slotH: 90 });
    boardCanvas.style.transform = "";
    levelUpFlashEl.classList.remove("active");
    boardWrap.classList.remove("level-up-border");
    scenePause.classList.add("hidden");
    sceneGameOver.classList.add("hidden");
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(50, now - last);
  last = now;
  input.update(dt);
  if (game && currentScene === "playing") game.update(dt);
  processGameEvents();
  render();
  // Character dances independently of game clock so idle sway is always visible
  renderCharacter(characterCtx, now);
  requestAnimationFrame(loop);
}

// Bootstrap
initSettingsControls();
applyCrt();
applyAudioSettings();
showScene("title");
requestAnimationFrame(loop);
