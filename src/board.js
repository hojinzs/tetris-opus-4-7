// Playfield/board logic

import { COLS, TOTAL_ROWS, HIDDEN_ROWS, ROWS } from "./config.js";
import { pieceCells } from "./piece.js";
import { getKicks } from "./srs.js";

export function createBoard() {
  // 2D array [row][col]; null = empty, else piece id string
  const grid = Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
  return { grid };
}

export function cellAt(board, x, y) {
  if (x < 0 || x >= COLS || y < 0 || y >= TOTAL_ROWS) return "#"; // out of bounds sentinel
  return board.grid[y][x];
}

export function isBlocked(board, x, y) {
  const v = cellAt(board, x, y);
  return v !== null; // walls and filled cells block
}

export function collides(board, piece, offX = 0, offY = 0, rotation = piece.rotation) {
  const cells = pieceCellsAt(piece, rotation);
  for (const [cx, cy] of cells) {
    const x = piece.x + cx + offX;
    const y = piece.y + cy + offY;
    if (isBlocked(board, x, y)) return true;
  }
  return false;
}

function pieceCellsAt(piece, rotation) {
  const saved = piece.rotation;
  piece.rotation = rotation;
  const cells = pieceCells(piece);
  piece.rotation = saved;
  return cells;
}

// Try to move piece; return true on success
export function tryMove(board, piece, dx, dy) {
  if (!collides(board, piece, dx, dy)) {
    piece.x += dx;
    piece.y += dy;
    return true;
  }
  return false;
}

// Try to rotate with SRS kicks; direction = +1 (CW) or -1 (CCW).
// Returns the index of the kick test that succeeded (0..N-1), or -1 on failure.
// The kick index is used for T-Spin Mini detection (last-kick exception).
export function tryRotate(board, piece, dir) {
  const from = piece.rotation;
  const to = (from + (dir > 0 ? 1 : 3)) % 4;
  const kicks = getKicks(piece.id, from, to);
  for (let i = 0; i < kicks.length; i++) {
    const [kx, ky] = kicks[i];
    // SRS convention: y axis down = negative in standard tables; adapt
    const dx = kx;
    const dy = -ky;
    if (!collides(board, piece, dx, dy, to)) {
      piece.x += dx;
      piece.y += dy;
      piece.rotation = to;
      return i;
    }
  }
  return -1;
}

export function hardDropDistance(board, piece) {
  let d = 0;
  while (!collides(board, piece, 0, d + 1)) d++;
  return d;
}

// Lock piece cells into board grid.
// Returns { lockOut: boolean } — lockOut true if every block is in hidden rows
export function lockPiece(board, piece) {
  const cells = pieceCells(piece);
  let lockOut = true;
  for (const [cx, cy] of cells) {
    const x = piece.x + cx;
    const y = piece.y + cy;
    if (y >= 0 && y < TOTAL_ROWS && x >= 0 && x < COLS) {
      board.grid[y][x] = piece.id;
    }
    if (y >= HIDDEN_ROWS) lockOut = false;
  }
  return { lockOut };
}

// Find completed line indices, clear them, return number cleared
export function clearLines(board) {
  const completed = [];
  for (let y = 0; y < TOTAL_ROWS; y++) {
    if (board.grid[y].every((c) => c !== null)) {
      completed.push(y);
    }
  }
  for (const y of completed) {
    board.grid.splice(y, 1);
    board.grid.unshift(Array(COLS).fill(null));
  }
  return completed.length;
}

// Check if the board is completely empty (used for perfect clear detection later)
export function isBoardEmpty(board) {
  for (let y = 0; y < TOTAL_ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board.grid[y][x] !== null) return false;
    }
  }
  return true;
}

export { ROWS, COLS, TOTAL_ROWS, HIDDEN_ROWS };
