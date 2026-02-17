import { Inventory } from './inventory.js';

export function createPlayer() {
  const inventory = new Inventory(9);
  inventory.addItem(1, 64);
  inventory.addItem(2, 64);
  inventory.addItem(3, 64);

  return {
    position: { x: 8, y: 100, z: 8 },
    velocity: { x: 0, y: 0, z: 0 },
    grounded: false,
    health: 20, // Phase2
    hunger: 20, // Phase2
    inventory,
  };
}
