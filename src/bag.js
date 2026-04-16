// 7-bag randomizer: each set of 7 contains each tetromino exactly once

const IDS = ["I", "O", "T", "S", "Z", "J", "L"];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Bag {
  constructor() {
    this.queue = [];
    this._refill();
    this._refill();
  }
  _refill() {
    this.queue.push(...shuffle(IDS));
  }
  next() {
    if (this.queue.length <= 7) this._refill();
    return this.queue.shift();
  }
  peek(n) {
    while (this.queue.length < n) this._refill();
    return this.queue.slice(0, n);
  }
}
