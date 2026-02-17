export function setupMenu(menuEl, startButton, canvas, onSaveQuit, onDistanceChange) {
  // Phase2: pause menu controls.
  const resumeButton = menuEl.querySelector('#resume-btn');
  const saveQuitButton = menuEl.querySelector('#savequit-btn');
  const renderDistanceInput = menuEl.querySelector('#render-distance');

  function lockGame() {
    canvas.requestPointerLock();
  }

  startButton.addEventListener('click', lockGame);
  resumeButton?.addEventListener('click', lockGame);
  saveQuitButton?.addEventListener('click', () => {
    onSaveQuit?.();
    show();
  });

  renderDistanceInput?.addEventListener('input', () => {
    onDistanceChange?.(Number(renderDistanceInput.value));
  });

  function show() {
    menuEl.style.display = 'grid';
  }

  function hide() {
    menuEl.style.display = 'none';
  }

  return { show, hide };
}
