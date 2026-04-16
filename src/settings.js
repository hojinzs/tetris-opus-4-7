// Persistent settings via localStorage.

const KEY = "tetris_settings_v1";

const DEFAULTS = {
  startLevel: 1,
  crtScanlines: false,
  ghostPiece: true,
  sfxEnabled: true,
  sfxVolume: 0.6,
  bgmEnabled: true,
  bgmVolume: 0.25,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors (private mode / quota)
  }
}
