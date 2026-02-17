export function setupMenu(menuEl, startButton, canvas) {
  startButton.addEventListener('click', () => {
    canvas.requestPointerLock();
  });

  return {
    show() {
      menuEl.style.display = 'grid';
    },
    hide() {
      menuEl.style.display = 'none';
    },
  };
}
