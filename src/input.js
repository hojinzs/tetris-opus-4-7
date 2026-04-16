// Keyboard input with DAS / ARR for horizontal movement.
// Emits semantic actions to the game via callbacks.

import { DAS, ARR } from "./config.js";

export class Input {
  constructor(actions) {
    this.actions = actions;
    // Horizontal DAS/ARR state
    this.dir = 0; // -1 left, +1 right, 0 none
    this.dasTimer = 0;
    this.arrTimer = 0;
    this.softDropHeld = false;

    this.keydown = this.keydown.bind(this);
    this.keyup = this.keyup.bind(this);
    this.blur = this.blur.bind(this);
  }

  attach() {
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
    window.addEventListener("blur", this.blur);
  }

  detach() {
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
    window.removeEventListener("blur", this.blur);
  }

  blur() {
    this.dir = 0;
    this.softDropHeld = false;
    this.actions.onSoftDrop?.(false);
  }

  keydown(e) {
    // Prevent default for game keys so page doesn't scroll
    const k = e.code;
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowDown",
        "ArrowUp",
        "Space",
        "KeyZ",
        "KeyX",
        "ShiftLeft",
        "ShiftRight",
        "KeyC",
        "KeyP",
        "KeyR",
        "Escape",
      ].includes(k)
    ) {
      e.preventDefault();
    }
    if (e.repeat) return; // we handle our own repeat via DAS/ARR

    switch (k) {
      case "ArrowLeft":
        this.dir = -1;
        this.dasTimer = 0;
        this.arrTimer = 0;
        this.actions.onMove?.(-1);
        break;
      case "ArrowRight":
        this.dir = 1;
        this.dasTimer = 0;
        this.arrTimer = 0;
        this.actions.onMove?.(1);
        break;
      case "ArrowDown":
        if (!this.softDropHeld) {
          this.softDropHeld = true;
          this.actions.onSoftDrop?.(true);
        }
        break;
      case "Space":
        this.actions.onHardDrop?.();
        break;
      case "ArrowUp":
      case "KeyX":
        this.actions.onRotate?.(1);
        break;
      case "KeyZ":
        this.actions.onRotate?.(-1);
        break;
      case "ShiftLeft":
      case "ShiftRight":
      case "KeyC":
        this.actions.onHold?.();
        break;
      case "KeyP":
      case "Escape":
        this.actions.onPause?.();
        break;
      case "KeyR":
        this.actions.onRestart?.();
        break;
    }
  }

  keyup(e) {
    const k = e.code;
    if (k === "ArrowLeft" && this.dir === -1) this.dir = 0;
    else if (k === "ArrowRight" && this.dir === 1) this.dir = 0;
    else if (k === "ArrowDown") {
      this.softDropHeld = false;
      this.actions.onSoftDrop?.(false);
    }
  }

  // Called each frame to process DAS/ARR for horizontal auto-repeat
  update(dtMs) {
    if (this.dir === 0) return;
    this.dasTimer += dtMs;
    if (this.dasTimer >= DAS) {
      this.arrTimer += dtMs;
      while (this.arrTimer >= ARR) {
        this.arrTimer -= ARR;
        this.actions.onMove?.(this.dir);
      }
    }
  }
}
