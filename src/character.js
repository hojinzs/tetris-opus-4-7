// Retro pixel dancer — boxy creature mascot with arms and 4 legs.
// Always grooves lightly; goes wild on events.

const BODY = "#e07848";
const BODY_SHADOW = "#a24a22";
const EYE = "#111122";
const PIXEL = 7;

// Body only (no arms baked in) — 10 wide x 7 tall, flat top.
// Legend: 0=transparent, 1=body, 2=eye, 3=body shadow
const BODY_SPRITE = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // row 0 — flat top (no notch)
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 2, 1, 1, 1, 1, 2, 1, 1], // row 2 — eye top
  [1, 1, 2, 1, 1, 1, 1, 2, 1, 1], // row 3 — eye bottom (2px tall)
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], // row 6 — shaded base
];

// 4-leg stances — each leg is 1 pixel wide, 2 tall. Columns 1, 3, 6, 8.
const LEGS_REST = [
  [0, 1, 0, 1, 0, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 0, 1, 0, 1, 0],
];
const LEGS_SHUFFLE = [
  [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
];
const LEGS_KICK_OUT = [
  [1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
];
const LEGS_KICK_IN = [
  [0, 0, 1, 0, 1, 1, 0, 1, 0, 0],
  [0, 0, 1, 0, 1, 1, 0, 1, 0, 0],
];

function drawGrid(ctx, grid, offsetX, offsetY) {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === 0) continue;
      ctx.fillStyle = c === 2 ? EYE : c === 3 ? BODY_SHADOW : BODY;
      ctx.fillRect(offsetX + x * PIXEL, offsetY + y * PIXEL, PIXEL, PIXEL);
    }
  }
}

// Arms are single pixels protruding from body sides; row position animates.
// leftRow/rightRow are floating-point rows relative to BODY_SPRITE top.
function drawArms(ctx, bodyX, bodyY, leftRow, rightRow) {
  ctx.fillStyle = BODY;
  const leftY = bodyY + Math.round(leftRow) * PIXEL;
  const rightY = bodyY + Math.round(rightRow) * PIXEL;
  // Left arm sticks out of col -1 (just left of body)
  ctx.fillRect(bodyX - PIXEL, leftY, PIXEL, PIXEL);
  // Right arm sticks out of col 10 (just right of body)
  ctx.fillRect(bodyX + 10 * PIXEL, rightY, PIXEL, PIXEL);
}

let danceUntilMs = 0;
let lastNowMs = 0;
let dancePower = 1;

export function triggerDance(durationMs = 2000, power = 1) {
  const proposedEnd = lastNowMs + durationMs;
  if (proposedEnd > danceUntilMs) danceUntilMs = proposedEnd;
  if (power > dancePower || danceUntilMs <= lastNowMs) dancePower = power;
}

export function resetDance() {
  danceUntilMs = 0;
  dancePower = 1;
}

export function renderCharacter(ctx, nowMs) {
  lastNowMs = nowMs;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.fillStyle = "#14141f";
  ctx.fillRect(0, 0, w, h);

  const dancing = nowMs < danceUntilMs;
  if (!dancing) dancePower = 1;

  const bodyRows = BODY_SPRITE.length;
  const bodyCols = BODY_SPRITE[0].length;
  const spriteW = (bodyCols + 2) * PIXEL; // +2 for arms on each side
  const spriteH = (bodyRows + LEGS_REST.length) * PIXEL;

  // bodyX is the left edge of the BODY (arms extend 1 PIXEL to the left of this)
  const bodyBaseX = Math.floor((w - bodyCols * PIXEL) / 2);
  const bodyBaseY = Math.floor((h - spriteH) / 2) + 6;

  let bobX = 0;
  let bobY = 0;
  let legs;
  let leftArmRow;
  let rightArmRow;

  if (dancing) {
    // Excited: big bounce, big arm swings, leg kicks
    const p = dancePower;
    const phase = nowMs / 110;
    bobY = -Math.abs(Math.sin(phase)) * (10 + 3 * (p - 1));
    bobX = Math.sin(nowMs / 140) * (4 + p);
    legs = Math.floor(nowMs / 180) % 2 === 0 ? LEGS_KICK_OUT : LEGS_KICK_IN;
    // Arms swing in opposite phases — alternating up/down
    const armSwing = Math.sin(nowMs / 140);
    leftArmRow = 4 + armSwing * 2;   // 2..6
    rightArmRow = 4 - armSwing * 2;  // 2..6 (opposite)
  } else {
    // Idle groove — always lightly dancing
    const t = nowMs / 480;
    bobX = Math.sin(t) * 2;
    bobY = -Math.abs(Math.sin(t * 2)) * 2.5;

    // Cycle between 4 leg poses
    const legPhase = Math.floor((nowMs / 240) % 4);
    legs = [LEGS_REST, LEGS_SHUFFLE, LEGS_REST, LEGS_SHUFFLE][legPhase];

    // Arms gently wave — opposite phases so it looks like relaxed swinging
    const armSwing = Math.sin(nowMs / 320);
    leftArmRow = 4 + armSwing * 1;   // 3..5
    rightArmRow = 4 - armSwing * 1;  // 3..5
  }

  const bodyX = bodyBaseX + bobX;
  const bodyY = bodyBaseY + bobY;

  // Ground shadow — squishes with bounce
  const groundY = bodyBaseY + spriteH + 6;
  const liftRatio = Math.min(1, Math.abs(bobY) / 13);
  const shadowW = spriteW * (1 - liftRatio * 0.35);
  const shadowX = bodyBaseX - PIXEL + (spriteW - shadowW) / 2;
  ctx.fillStyle = `rgba(0, 0, 0, ${0.45 - liftRatio * 0.25})`;
  ctx.fillRect(Math.floor(shadowX), groundY, Math.floor(shadowW), 3);

  // Body + arms + legs
  drawGrid(ctx, BODY_SPRITE, bodyX, bodyY);
  drawArms(ctx, bodyX, bodyY, leftArmRow, rightArmRow);
  drawGrid(ctx, legs, bodyX, bodyY + bodyRows * PIXEL);

  // Sparkles during excited dance only
  if (dancing) {
    const count = 4 + Math.floor(dancePower);
    for (let i = 0; i < count; i++) {
      const t = (nowMs / 500 + i / count) % 1;
      const angle = i * ((Math.PI * 2) / count) + nowMs / 800;
      const radius = 42 + Math.sin(nowMs / 220 + i) * 6;
      const sx = w / 2 + Math.cos(angle) * radius;
      const sy = groundY - 26 + Math.sin(angle) * 14;
      if (Math.floor(nowMs / 90 + i) % 3 !== 0) {
        ctx.fillStyle = t < 0.5 ? "#ffd54a" : "#ffffff";
        ctx.fillRect(Math.floor(sx), Math.floor(sy), 3, 3);
      }
    }
  }
}
