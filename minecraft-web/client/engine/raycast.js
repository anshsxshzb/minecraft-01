export function raycastBlock(world, origin, direction, maxDistance = 5) {
  const step = 0.05;
  let lastAir = null;
  for (let t = 0; t <= maxDistance; t += step) {
    const x = Math.floor(origin.x + direction.x * t);
    const y = Math.floor(origin.y + direction.y * t);
    const z = Math.floor(origin.z + direction.z * t);
    const block = world.getBlockGlobal(x, y, z);
    if (block !== 0) {
      return { hit: { x, y, z, block }, place: lastAir };
    }
    lastAir = { x, y, z };
  }
  return null;
}
