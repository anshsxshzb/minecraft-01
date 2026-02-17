export function createCrosshair(hud) {
  const node = document.createElement('div');
  node.className = 'crosshair';
  hud.appendChild(node);
}
