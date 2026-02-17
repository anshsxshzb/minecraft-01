export function createControls(canvas, camera, menu) {
  const state = {
    locked: false,
    yaw: 0,
    pitch: 0,
    moveForward: 0,
    moveRight: 0,
    jump: false,
    sprint: false,
    // Phase2: sprint double-tap tracking for FPS-like movement behavior.
    sprintLatch: false,
    sprintUntil: 0,
  };

  let lastWTap = 0;

  canvas.addEventListener('click', () => {
    if (!state.locked) canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    state.locked = document.pointerLockElement === canvas;
    menu.style.display = state.locked ? 'none' : 'grid';
  });

  document.addEventListener('mousemove', (event) => {
    if (!state.locked) return;
    state.yaw -= event.movementX * 0.0024;
    state.pitch -= event.movementY * 0.0024;
    state.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.pitch));
    camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
  });

  document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyW') {
      // Phase2: double-tap W sprint support.
      const now = performance.now();
      if (now - lastWTap < 280) {
        state.sprintLatch = true;
        state.sprintUntil = now + 1500;
      }
      lastWTap = now;
      state.moveForward = 1;
    }
    if (event.code === 'KeyS') state.moveForward = -1;
    if (event.code === 'KeyA') state.moveRight = -1;
    if (event.code === 'KeyD') state.moveRight = 1;
    if (event.code === 'Space') state.jump = true;
    if (event.code === 'ShiftLeft') state.sprint = true;
  });

  document.addEventListener('keyup', (event) => {
    if ((event.code === 'KeyW' && state.moveForward > 0) || (event.code === 'KeyS' && state.moveForward < 0)) state.moveForward = 0;
    if ((event.code === 'KeyA' && state.moveRight < 0) || (event.code === 'KeyD' && state.moveRight > 0)) state.moveRight = 0;
    if (event.code === 'Space') state.jump = false;
    if (event.code === 'ShiftLeft') state.sprint = false;
    if (event.code === 'KeyW') state.sprintLatch = false;
  });

  // Phase2: expose normalized sprint state consumed by physics.
  state.isSprinting = () => state.sprint || (state.sprintLatch && performance.now() < state.sprintUntil && state.moveForward > 0);

  return state;
}
