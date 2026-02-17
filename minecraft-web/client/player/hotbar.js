export function createHotbar(hud, inventory) {
  const el = document.createElement('div');
  el.className = 'hotbar';
  hud.appendChild(el);

  const slots = inventory.slots.map(() => {
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot';
    el.appendChild(slot);
    return slot;
  });

  function render() {
    slots.forEach((slot, i) => {
      const data = inventory.slots[i];
      slot.className = `hotbar-slot ${i === inventory.selected ? 'active' : ''}`;
      slot.textContent = data.count > 0 ? `${data.id}:${data.count}` : '';
    });
  }

  document.addEventListener('wheel', (event) => {
    const dir = Math.sign(event.deltaY);
    inventory.selected = (inventory.selected + dir + inventory.slots.length) % inventory.slots.length;
    render();
  });

  document.addEventListener('keydown', (event) => {
    const n = Number(event.key);
    if (n >= 1 && n <= 9) {
      inventory.selected = n - 1;
      render();
    }
  });

  render();
  return { render };
}
