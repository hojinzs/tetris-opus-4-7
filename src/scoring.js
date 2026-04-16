// Modern scoring: line clears, T-Spin (full/mini), Back-to-Back, Combo, Perfect Clear.

export function createStats(startLevel = 1) {
  return {
    score: 0,
    level: startLevel,
    lines: 0,
    startLevel,
    b2b: false, // true when last scoring clear was "difficult" (Tetris or any line-clearing T-Spin)
    combo: -1, // -1 = no combo in progress
  };
}

// Base points (before level multiplier). B2B multiplies these by 1.5 when active.
const BASE = {
  single: 100,
  double: 300,
  triple: 500,
  tetris: 800,
  tspin: 400, // T-Spin with no lines
  tspinSingle: 800,
  tspinDouble: 1200,
  tspinTriple: 1600,
  tspinMini: 100,
  tspinMiniSingle: 200,
  tspinMiniDouble: 400,
};

const PC_BONUS = { 1: 800, 2: 1200, 3: 1800, 4: 2000 };

function computeBase(linesCleared, tSpin) {
  if (tSpin === "full") {
    if (linesCleared === 0) return { base: BASE.tspin, label: "T-SPIN", difficult: false };
    if (linesCleared === 1) return { base: BASE.tspinSingle, label: "T-SPIN SINGLE", difficult: true };
    if (linesCleared === 2) return { base: BASE.tspinDouble, label: "T-SPIN DOUBLE", difficult: true };
    if (linesCleared === 3) return { base: BASE.tspinTriple, label: "T-SPIN TRIPLE", difficult: true };
  }
  if (tSpin === "mini") {
    if (linesCleared === 0) return { base: BASE.tspinMini, label: "T-SPIN MINI", difficult: false };
    if (linesCleared === 1) return { base: BASE.tspinMiniSingle, label: "T-SPIN MINI SINGLE", difficult: true };
    if (linesCleared === 2) return { base: BASE.tspinMiniDouble, label: "T-SPIN MINI DOUBLE", difficult: true };
  }
  if (linesCleared === 1) return { base: BASE.single, label: "SINGLE", difficult: false };
  if (linesCleared === 2) return { base: BASE.double, label: "DOUBLE", difficult: false };
  if (linesCleared === 3) return { base: BASE.triple, label: "TRIPLE", difficult: false };
  if (linesCleared === 4) return { base: BASE.tetris, label: "TETRIS", difficult: true };
  return { base: 0, label: null, difficult: false };
}

// Apply a clear result to stats. Returns detailed info for the renderer.
export function applyClear(stats, { linesCleared, tSpin = null, isPerfectClear = false }) {
  const { base, label, difficult } = computeBase(linesCleared, tSpin);

  let total = base * stats.level;
  let b2bApplied = false;
  if (difficult && stats.b2b && total > 0) {
    total = Math.floor(total * 1.5);
    b2bApplied = true;
  }

  // Combo — only line-clearing moves increment; reset on 0-line non-T-spin
  let comboBonus = 0;
  if (linesCleared > 0) {
    stats.combo += 1;
    if (stats.combo > 0) {
      comboBonus = 50 * stats.combo * stats.level;
    }
  } else if (tSpin == null) {
    stats.combo = -1;
  }
  // (0-line T-spins leave combo unchanged — they don't reset nor extend it)

  // B2B state: updated only on line-clearing moves.
  // Line clear with difficult=true -> enables B2B.
  // Line clear with difficult=false -> breaks B2B.
  if (linesCleared > 0) {
    stats.b2b = difficult;
  }

  // Perfect clear bonus
  let pcBonus = 0;
  let pcLabel = null;
  if (isPerfectClear && linesCleared > 0) {
    pcBonus = (PC_BONUS[linesCleared] || 0) * stats.level;
    pcLabel = "PERFECT CLEAR";
  }

  const added = total + comboBonus + pcBonus;
  stats.score += added;
  stats.lines += linesCleared;

  // Level up every 10 lines
  const targetLevel = stats.startLevel + Math.floor(stats.lines / 10);
  if (targetLevel > stats.level) stats.level = targetLevel;

  return {
    added,
    label,
    difficult,
    b2bApplied,
    combo: stats.combo,
    comboBonus,
    pcBonus,
    pcLabel,
  };
}

export function addSoftDrop(stats, cells) {
  stats.score += cells;
}

export function addHardDrop(stats, cells) {
  stats.score += cells * 2;
}
