// Local leaderboard stored in localStorage.

const KEY = "tetris_leaderboard_v1";
const MAX_ENTRIES = 10;

export function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.entries)) return [];
    return parsed.entries;
  } catch {
    return [];
  }
}

function save(entries) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ entries }));
  } catch {
    // ignore
  }
}

export function isHighScore(score) {
  if (score <= 0) return false;
  const entries = loadLeaderboard();
  if (entries.length < MAX_ENTRIES) return true;
  return score > entries[entries.length - 1].score;
}

// Insert entry, return its final rank (1-indexed) or -1 if not in top 10
export function submitEntry({ name, score, lines, level, durationSec }) {
  const entry = {
    name: String(name || "AAA").toUpperCase().slice(0, 3).padEnd(3, "A"),
    score: Math.max(0, Math.floor(score)),
    lines: Math.max(0, Math.floor(lines)),
    level: Math.max(1, Math.floor(level)),
    durationSec: Math.max(0, Math.floor(durationSec)),
    date: new Date().toISOString(),
  };
  const entries = loadLeaderboard();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  const trimmed = entries.slice(0, MAX_ENTRIES);
  const rank = trimmed.findIndex((e) => e === entry) + 1;
  save(trimmed);
  return { rank, entry };
}

export function clearLeaderboard() {
  save([]);
}
