export class Inventory {
  constructor(slotCount = 9) {
    this.slots = Array.from({ length: slotCount }, () => ({ id: 0, count: 0 }));
    this.selected = 0;
  }

  addItem(id, count = 1, maxStack = 64) {
    let remaining = count;
    for (const slot of this.slots) {
      if (slot.id === id && slot.count < maxStack) {
        const space = maxStack - slot.count;
        const add = Math.min(space, remaining);
        slot.count += add;
        remaining -= add;
      }
      if (remaining === 0) return true;
    }

    for (const slot of this.slots) {
      if (slot.count === 0) {
        const add = Math.min(maxStack, remaining);
        slot.id = id;
        slot.count = add;
        remaining -= add;
      }
      if (remaining === 0) return true;
    }

    return remaining === 0;
  }

  consumeSelected() {
    const slot = this.slots[this.selected];
    if (!slot || slot.count === 0) return 0;
    slot.count -= 1;
    const id = slot.id;
    if (slot.count === 0) slot.id = 0;
    return id;
  }

  selectedItem() {
    return this.slots[this.selected]?.id ?? 0;
  }
}
