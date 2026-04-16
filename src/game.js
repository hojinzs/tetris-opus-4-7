// Core game state machine & loop

import {
  COLS,
  HIDDEN_ROWS,
  NEXT_QUEUE_SIZE,
  SOFT_DROP_FACTOR,
  LOCK_DELAY_MS,
  MAX_LOCK_RESETS,
  gravityMs,
} from "./config.js";
import { Bag } from "./bag.js";
import { spawnPiece } from "./piece.js";
import {
  createBoard,
  collides,
  tryMove,
  tryRotate,
  lockPiece,
  hardDropDistance,
  isBoardEmpty,
  isBlocked,
} from "./board.js";
import {
  createStats,
  applyClear,
  addSoftDrop,
  addHardDrop,
} from "./scoring.js";

export const GameState = {
  Playing: "playing",
  Paused: "paused",
  GameOver: "gameover",
};

const FLASH_DURATION_MS = 1400;
const LINE_CLEAR_ANIM_MS = 260;
const LEVEL_UP_FLASH_MS = 650;

export class Game {
  constructor({ startLevel = 1 } = {}) {
    this.startLevel = startLevel;
    this.reset();
  }

  reset() {
    this.board = createBoard();
    this.bag = new Bag();
    this.stats = createStats(this.startLevel);
    this.hold = null;
    this.holdLocked = false;
    this.piece = null;
    this.gravityAccum = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.softDrop = false;
    this.state = GameState.Playing;
    this.elapsedMs = 0;
    this.lastMoveWasRotation = false;
    this.lastKickIndex = -1;
    this.flash = null;
    this.clearAnim = null; // { rows, tSpin, startMs, durationMs }
    this.levelUpFlash = null; // { startMs, durationMs }
    this.shake = null; // { startMs, durationMs, magnitude }
    this.events = []; // drained each frame by main.js: {type, ...}
    this._spawn();
  }

  _emit(type, data = {}) {
    this.events.push({ type, ...data });
  }

  _spawn(overrideId = null) {
    const id = overrideId ?? this.bag.next();
    const piece = spawnPiece(id);
    piece.y = HIDDEN_ROWS - 2;
    if (collides(this.board, piece, 0, 0)) {
      this.piece = piece;
      this.state = GameState.GameOver;
      this._emit("gameOver");
      return;
    }
    this.piece = piece;
    this.holdLocked = false;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.lastMoveWasRotation = false;
    this.lastKickIndex = -1;
  }

  get nextPieces() {
    return this.bag.peek(NEXT_QUEUE_SIZE);
  }

  // --- Actions ---
  move(dir) {
    if (!this._isInteractive()) return;
    if (tryMove(this.board, this.piece, dir, 0)) {
      this.lastMoveWasRotation = false;
      this._onPieceMoved();
      this._emit("move");
    }
  }

  rotate(dir) {
    if (!this._isInteractive()) return;
    const kickIndex = tryRotate(this.board, this.piece, dir);
    if (kickIndex >= 0) {
      this.lastMoveWasRotation = true;
      this.lastKickIndex = kickIndex;
      this._onPieceMoved();
      this._emit("rotate");
    }
  }

  setSoftDrop(active) {
    this.softDrop = active;
  }

  hardDrop() {
    if (!this._isInteractive()) return;
    const dist = hardDropDistance(this.board, this.piece);
    if (dist > 0) {
      this.piece.y += dist;
      addHardDrop(this.stats, dist);
      this.lastMoveWasRotation = false;
    }
    this._emit("hardDrop");
    this._lockAndAdvance();
  }

  holdPiece() {
    if (!this._isInteractive()) return;
    if (this.holdLocked) return;
    const currentId = this.piece.id;
    if (this.hold == null) {
      this.hold = currentId;
      this._spawn();
    } else {
      const swapId = this.hold;
      this.hold = currentId;
      this._spawn(swapId);
    }
    this.holdLocked = true;
    this._emit("hold");
  }

  togglePause() {
    if (this.state === GameState.Playing) this.state = GameState.Paused;
    else if (this.state === GameState.Paused) this.state = GameState.Playing;
  }

  restart() {
    this.reset();
  }

  _isInteractive() {
    return (
      this.state === GameState.Playing && this.piece !== null && !this.clearAnim
    );
  }

  // --- T-Spin detection (3-corner rule + mini exception) ---
  _detectTSpin() {
    const p = this.piece;
    if (!p || p.id !== "T") return null;
    if (!this.lastMoveWasRotation) return null;

    const corners = [
      [p.x + 0, p.y + 0],
      [p.x + 2, p.y + 0],
      [p.x + 0, p.y + 2],
      [p.x + 2, p.y + 2],
    ];
    const filled = corners.map(([x, y]) => isBlocked(this.board, x, y));
    const count = filled.reduce((n, v) => n + (v ? 1 : 0), 0);
    if (count < 3) return null;

    const frontIdxByRot = {
      0: [0, 1],
      1: [1, 3],
      2: [2, 3],
      3: [0, 2],
    };
    const [a, b] = frontIdxByRot[p.rotation];
    const frontFilled = (filled[a] ? 1 : 0) + (filled[b] ? 1 : 0);

    if (this.lastKickIndex === 4) return "full";
    return frontFilled === 2 ? "full" : "mini";
  }

  _onPieceMoved() {
    if (this._isOnGround()) {
      if (this.lockResets < MAX_LOCK_RESETS) {
        this.lockTimer = 0;
        this.lockResets++;
      }
    } else {
      this.lockTimer = 0;
    }
  }

  _isOnGround() {
    return collides(this.board, this.piece, 0, 1);
  }

  _findCompletedRows() {
    const rows = [];
    for (let y = 0; y < this.board.grid.length; y++) {
      if (this.board.grid[y].every((c) => c !== null)) rows.push(y);
    }
    return rows;
  }

  _lockAndAdvance() {
    const tSpin = this._detectTSpin();
    const { lockOut } = lockPiece(this.board, this.piece);
    this._emit("lock");

    if (lockOut) {
      this.state = GameState.GameOver;
      this.piece = null;
      this._emit("gameOver");
      return;
    }

    const completedRows = this._findCompletedRows();

    if (completedRows.length > 0) {
      // Start line clear animation; actual grid removal + scoring deferred
      this.piece = null;
      this.clearAnim = {
        rows: completedRows,
        tSpin,
        startMs: this.elapsedMs,
        durationMs: LINE_CLEAR_ANIM_MS,
      };
      if (tSpin) this._emit("tSpin", { tSpin });
      return;
    }

    // No lines — still apply scoring (handles T-Spin no-line + combo reset)
    this._applyClearAndFlash({ linesCleared: 0, tSpin, isPerfectClear: false });
    if (tSpin) this._emit("tSpin", { tSpin });
    this._spawn();
  }

  _finishLineClearAnim() {
    const { rows, tSpin } = this.clearAnim;
    // Remove all completed rows first (high index -> low to keep indices valid),
    // THEN prepend empty rows. Unshifting between splices would shift indices
    // and leave some completed rows untouched.
    rows.sort((a, b) => a - b);
    for (let i = rows.length - 1; i >= 0; i--) {
      this.board.grid.splice(rows[i], 1);
    }
    for (let i = 0; i < rows.length; i++) {
      this.board.grid.unshift(Array(COLS).fill(null));
    }
    const linesCleared = rows.length;
    const isPerfectClear = isBoardEmpty(this.board);
    const oldLevel = this.stats.level;
    const result = this._applyClearAndFlash({
      linesCleared,
      tSpin,
      isPerfectClear,
    });

    this._emit("lineClear", { count: linesCleared });
    if (result.pcLabel) this._emit("perfectClear");

    // Screen shake for heavy clears
    if (linesCleared >= 4 || (tSpin && linesCleared >= 2)) {
      this._triggerShake(320, 8);
    } else if (linesCleared === 3) {
      this._triggerShake(200, 4);
    }
    if (result.pcLabel) this._triggerShake(480, 10);

    // Level-up flash
    if (this.stats.level > oldLevel) {
      this.levelUpFlash = {
        startMs: this.elapsedMs,
        durationMs: LEVEL_UP_FLASH_MS,
      };
      this._emit("levelUp");
    }

    this.clearAnim = null;
    this._spawn();
  }

  _applyClearAndFlash({ linesCleared, tSpin, isPerfectClear }) {
    const result = applyClear(this.stats, { linesCleared, tSpin, isPerfectClear });
    if (result.label || result.pcLabel || (result.combo > 0 && linesCleared > 0)) {
      const mainLine =
        result.pcLabel ||
        result.label ||
        (result.combo > 0 ? `COMBO x${result.combo}` : "");
      const subParts = [];
      if (result.label && result.pcLabel) subParts.push(result.label);
      if (result.b2bApplied) subParts.push("B2B");
      if (result.combo > 0 && mainLine !== `COMBO x${result.combo}`) {
        subParts.push(`COMBO x${result.combo}`);
      }
      if (result.added > 0) subParts.push(`+${result.added.toLocaleString()}`);
      this.flash = {
        label: mainLine,
        subLabel: subParts.join(" • "),
        expiresAt: this.elapsedMs + FLASH_DURATION_MS,
      };
    }
    return result;
  }

  _triggerShake(durationMs, magnitude) {
    this.shake = { startMs: this.elapsedMs, durationMs, magnitude };
  }

  getShakeOffset() {
    if (!this.shake) return { x: 0, y: 0 };
    const t = this.elapsedMs - this.shake.startMs;
    if (t >= this.shake.durationMs) {
      this.shake = null;
      return { x: 0, y: 0 };
    }
    const decay = 1 - t / this.shake.durationMs;
    const mag = this.shake.magnitude * decay;
    return {
      x: (Math.random() * 2 - 1) * mag,
      y: (Math.random() * 2 - 1) * mag,
    };
  }

  // --- Per-frame update ---
  update(dtMs) {
    if (this.state === GameState.Paused || this.state === GameState.GameOver) return;
    this.elapsedMs += dtMs;

    // Expire flash
    if (this.flash && this.elapsedMs > this.flash.expiresAt) this.flash = null;
    // Expire level-up flash
    if (
      this.levelUpFlash &&
      this.elapsedMs - this.levelUpFlash.startMs >= this.levelUpFlash.durationMs
    ) {
      this.levelUpFlash = null;
    }

    // Progress line-clear animation
    if (this.clearAnim) {
      if (this.elapsedMs - this.clearAnim.startMs >= this.clearAnim.durationMs) {
        this._finishLineClearAnim();
      }
      return; // freeze gameplay during animation
    }

    if (!this.piece) return;

    const effectiveGravity = this.softDrop
      ? gravityMs(this.stats.level) / SOFT_DROP_FACTOR
      : gravityMs(this.stats.level);

    this.gravityAccum += dtMs;
    while (this.gravityAccum >= effectiveGravity) {
      this.gravityAccum -= effectiveGravity;
      if (tryMove(this.board, this.piece, 0, 1)) {
        if (this.softDrop) addSoftDrop(this.stats, 1);
        this.lockTimer = 0;
        this.lastMoveWasRotation = false;
      } else {
        break;
      }
    }

    if (this._isOnGround()) {
      this.lockTimer += dtMs;
      if (this.lockTimer >= LOCK_DELAY_MS) {
        this._lockAndAdvance();
      }
    } else {
      this.lockTimer = 0;
    }
  }
}
