export function startGameLoop(tick) {
  let last = performance.now();

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    tick(dt, now / 1000);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
