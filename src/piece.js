// Tetromino definitions using SRS spawn orientations.
// Each piece is represented as a list of filled cells for each of the 4 rotation states (0,R,2,L).
// Coordinates are (x, y) within the piece's local bounding box.

import { COLORS } from "./config.js";

// Helper: rotate a 4x4 or 3x3 matrix clockwise
function rotateMatrixCW(m) {
  const n = m.length;
  const r = Array.from({ length: n }, () => Array(n).fill(0));
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      r[x][n - 1 - y] = m[y][x];
    }
  }
  return r;
}

function matrixToCells(m) {
  const out = [];
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (m[y][x]) out.push([x, y]);
    }
  }
  return out;
}

function buildRotations(spawnMatrix) {
  const rotations = [];
  let cur = spawnMatrix;
  for (let i = 0; i < 4; i++) {
    rotations.push(matrixToCells(cur));
    cur = rotateMatrixCW(cur);
  }
  return rotations;
}

// SRS spawn matrices
const SPAWN = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

export const PIECES = {};
for (const [id, matrix] of Object.entries(SPAWN)) {
  PIECES[id] = {
    id,
    color: COLORS[id],
    size: matrix.length,
    rotations: buildRotations(matrix),
  };
}

// Create a new active piece spawning centered at top
export function spawnPiece(id) {
  const def = PIECES[id];
  return {
    id,
    color: def.color,
    size: def.size,
    rotation: 0,
    // centered near top; y offset uses the hidden rows above playfield
    x: Math.floor((10 - def.size) / 2),
    y: 0, // in total-row coords; caller adjusts as needed
  };
}

export function pieceCells(piece) {
  return PIECES[piece.id].rotations[piece.rotation];
}
