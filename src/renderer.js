// Canvas rendering for board, ghost, active piece, hold, next queue, clear animation, and flash labels.

import { COLS, ROWS, HIDDEN_ROWS, CELL, COLORS } from "./config.js";
import { PIECES, pieceCells } from "./piece.js";
import { hardDropDistance } from "./board.js";

function drawCell(ctx, x, y, color, size = CELL) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(x, y, size, 3);
  ctx.fillRect(x, y, 3, size);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x, y + size - 3, size, 3);
  ctx.fillRect(x + size - 3, y, 3, size);
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

function drawGhostCell(ctx, x, y, size = CELL) {
  ctx.fillStyle = COLORS.GHOST;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

export function renderFlash(ctx, flash, elapsedMs) {
  if (!flash) return;
  const remaining = flash.expiresAt - elapsedMs;
  if (remaining <= 0) return;
  const alpha = Math.min(1, remaining / 400);
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = '16px "Press Start 2P", monospace';
  ctx.fillStyle = "#ffd54a";
  ctx.shadowColor = "#aa7a00";
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillText(flash.label, w / 2, h * 0.38);

  if (flash.subLabel) {
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = "#e8e8f0";
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(flash.subLabel, w / 2, h * 0.46);
  }
  ctx.restore();
}

export function renderBoard(ctx, board, piece, opts = {}) {
  const { clearAnim = null, elapsedMs = 0, showGhost = true } = opts;
  const w = COLS * CELL;
  const h = ROWS * CELL;

  ctx.fillStyle = COLORS.EMPTY;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#1c1c2b";
  ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, h);
    ctx.stroke();
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(w, y * CELL + 0.5);
    ctx.stroke();
  }

  // Locked cells
  for (let y = HIDDEN_ROWS; y < board.grid.length; y++) {
    for (let x = 0; x < COLS; x++) {
      const id = board.grid[y][x];
      if (id) {
        drawCell(ctx, x * CELL, (y - HIDDEN_ROWS) * CELL, COLORS[id]);
      }
    }
  }

  if (piece) {
    if (showGhost) {
      const dropDist = hardDropDistance(board, piece);
      const cells = pieceCells(piece);
      for (const [cx, cy] of cells) {
        const gx = piece.x + cx;
        const gy = piece.y + cy + dropDist;
        const py = gy - HIDDEN_ROWS;
        if (py >= 0 && py < ROWS) drawGhostCell(ctx, gx * CELL, py * CELL);
      }
    }
    for (const [cx, cy] of pieceCells(piece)) {
      const px = piece.x + cx;
      const py = piece.y + cy - HIDDEN_ROWS;
      if (py >= 0 && py < ROWS) {
        drawCell(ctx, px * CELL, py * CELL, COLORS[piece.id]);
      }
    }
  }

  // Line clear animation flash overlay
  if (clearAnim) {
    const t = (elapsedMs - clearAnim.startMs) / clearAnim.durationMs;
    const alpha = Math.max(0, 1 - t);
    // Alternating strobe for retro feel
    const strobe = Math.floor(t * 8) % 2 === 0 ? 1 : 0.4;
    ctx.save();
    ctx.globalAlpha = alpha * strobe;
    ctx.fillStyle = "#ffffff";
    for (const y of clearAnim.rows) {
      const py = y - HIDDEN_ROWS;
      if (py >= 0 && py < ROWS) {
        ctx.fillRect(0, py * CELL, w, CELL);
      }
    }
    ctx.restore();
  }
}

export function renderMini(ctx, pieceIds, opts = {}) {
  const cell = opts.cell ?? 20;
  const slotH = opts.slotH ?? 60;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = COLORS.EMPTY;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  pieceIds.forEach((id, i) => {
    if (!id) return;
    const def = PIECES[id];
    const cells = def.rotations[0];
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const maxY = Math.max(...cells.map(([, y]) => y));
    const pw = (maxX - minX + 1) * cell;
    const ph = (maxY - minY + 1) * cell;
    const ox = (ctx.canvas.width - pw) / 2 - minX * cell;
    const oy = i * slotH + (slotH - ph) / 2 - minY * cell;
    for (const [cx, cy] of cells) {
      drawCell(ctx, ox + cx * cell, oy + cy * cell, COLORS[id], cell);
    }
  });
}
