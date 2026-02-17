export function createHud(hudRoot) {
  const stats = document.createElement('div');
  stats.className = 'stats';
  hudRoot.appendChild(stats);

  return {
    setStats(text) {
      stats.textContent = text;
    },
  };
}
