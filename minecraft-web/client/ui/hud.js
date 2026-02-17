export function createHud(hudRoot) {
  const stats = document.createElement('div');
  stats.className = 'stats';
  hudRoot.appendChild(stats);

  const prompt = document.createElement('div');
  prompt.className = 'stats';
  prompt.style.top = '34px';
  hudRoot.appendChild(prompt);

  return {
    setStats(text) {
      stats.textContent = text;
    },
    setPrompt(text) {
      prompt.textContent = text;
    },
  };
}
