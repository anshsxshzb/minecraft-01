function intBound(s, ds) {
  if (ds > 0) return (Math.ceil(s) - s) / ds;
  if (ds < 0) return (s - Math.floor(s)) / -ds;
  return Number.POSITIVE_INFINITY;
}

export function raycastBlock(world, origin, direction, maxDistance = 5) {
  // Phase2: DDA voxel traversal with precise face normal detection.
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = Math.sign(direction.x);
  const stepY = Math.sign(direction.y);
  const stepZ = Math.sign(direction.z);

  const tDeltaX = stepX !== 0 ? Math.abs(1 / direction.x) : Number.POSITIVE_INFINITY;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / direction.y) : Number.POSITIVE_INFINITY;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / direction.z) : Number.POSITIVE_INFINITY;

  let tMaxX = intBound(origin.x, direction.x);
  let tMaxY = intBound(origin.y, direction.y);
  let tMaxZ = intBound(origin.z, direction.z);

  let face = { x: 0, y: 0, z: 0 };

  while (true) {
    const block = world.getBlockGlobal(x, y, z);
    if (block !== 0) {
      return {
        hit: { x, y, z, block },
        face,
        place: { x: x + face.x, y: y + face.y, z: z + face.z },
      };
    }

    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        if (tMaxX > maxDistance) break;
        x += stepX;
        face = { x: -stepX, y: 0, z: 0 };
        tMaxX += tDeltaX;
      } else {
        if (tMaxZ > maxDistance) break;
        z += stepZ;
        face = { x: 0, y: 0, z: -stepZ };
        tMaxZ += tDeltaZ;
      }
    } else if (tMaxY < tMaxZ) {
      if (tMaxY > maxDistance) break;
      y += stepY;
      face = { x: 0, y: -stepY, z: 0 };
      tMaxY += tDeltaY;
    } else {
      if (tMaxZ > maxDistance) break;
      z += stepZ;
      face = { x: 0, y: 0, z: -stepZ };
      tMaxZ += tDeltaZ;
    }
  }

  return null;
}
