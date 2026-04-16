// Gameplay constants

export const COLS = 10;
export const ROWS = 20;
export const HIDDEN_ROWS = 2; // spawn buffer above visible area
export const TOTAL_ROWS = ROWS + HIDDEN_ROWS;

export const CELL = 30; // px

// Input timing (ms)
export const DAS = 170;
export const ARR = 50;
export const SOFT_DROP_FACTOR = 20;

// Lock delay
export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;

// Next queue
export const NEXT_QUEUE_SIZE = 5;

// Tetromino colors (classic palette)
export const COLORS = {
  I: "#00f0f0",
  O: "#f0f000",
  T: "#a000f0",
  S: "#00f000",
  Z: "#f00000",
  J: "#0000f0",
  L: "#f0a000",
  GHOST: "rgba(255,255,255,0.22)",
  EMPTY: "#14141f",
};

// Gravity: time in ms per cell at given level (Tetris Worlds formula)
export function gravityMs(level) {
  const L = Math.max(1, level);
  const sec = Math.pow(0.8 - (L - 1) * 0.007, L - 1);
  return sec * 1000;
}
