const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 256;

function hash(x, z, seed) {
  let n = x * 374761393 + z * 668265263 + seed * 2147483647;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function valueNoise2D(x, z, seed) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;

  const v00 = hash(ix, iz, seed);
  const v10 = hash(ix + 1, iz, seed);
  const v01 = hash(ix, iz + 1, seed);
  const v11 = hash(ix + 1, iz + 1, seed);

  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const ix0 = v00 + (v10 - v00) * sx;
  const ix1 = v01 + (v11 - v01) * sx;
  return ix0 + (ix1 - ix0) * sz;
}

function fbm2D(x, z, seed, octaves = 4) {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise2D(x * freq, z * freq, seed + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function biomeAt(gx, gz, seed) {
  const climate = fbm2D(gx * 0.0025, gz * 0.0025, seed + 101, 3);
  if (climate < 0.26) return 'desert';
  if (climate < 0.5) return 'plains';
  if (climate < 0.76) return 'forest';
  return 'mountains';
}

function biomeConfig(biome) {
  switch (biome) {
    case 'desert': return { base: 58, relief: 18, top: 4, dirt: 4, stone: 3, tree: 0 };
    case 'forest': return { base: 70, relief: 26, top: 1, dirt: 2, stone: 3, tree: 0.16 };
    case 'mountains': return { base: 84, relief: 52, top: 3, dirt: 3, stone: 3, tree: 0.02 };
    default: return { base: 67, relief: 24, top: 1, dirt: 2, stone: 3, tree: 0.05 };
  }
}

self.onmessage = (event) => {
  const { cx, cz, seed } = event.data;
  const blocks = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);
  const heights = new Int16Array(CHUNK_SIZE * CHUNK_SIZE);
  const trees = [];

  for (let z = 0; z < CHUNK_SIZE; z += 1) {
    for (let x = 0; x < CHUNK_SIZE; x += 1) {
      const gx = cx * CHUNK_SIZE + x;
      const gz = cz * CHUNK_SIZE + z;
      const biome = biomeAt(gx, gz, seed);
      const cfg = biomeConfig(biome);
      const continental = fbm2D(gx * 0.004, gz * 0.004, seed, 5);
      const erosion = fbm2D(gx * 0.01, gz * 0.01, seed + 37, 3);
      const h = Math.floor(cfg.base + continental * cfg.relief - erosion * 12);
      heights[x + CHUNK_SIZE * z] = h;

      for (let y = 0; y < CHUNK_HEIGHT; y += 1) {
        const idx = x + CHUNK_SIZE * (z + CHUNK_SIZE * y);
        if (y > h) continue;
        const cave = fbm2D(gx * 0.05 + y * 0.01, gz * 0.05 + y * 0.01, seed + 991, 2) + fbm2D(gx * 0.08 + y * 0.02, gz * 0.08, seed + 123, 2);
        if (y < h - 8 && cave > 1.27) continue;
        if (y === h) blocks[idx] = cfg.top;
        else if (y > h - 4) blocks[idx] = cfg.dirt;
        else blocks[idx] = cfg.stone;
      }

      const treeRoll = hash(gx, gz, seed + 111);
      if (treeRoll < cfg.tree) trees.push({ x, z, h });
    }
  }

  // Phase2: procedural tree placement for forest/plains variety.
  for (const tree of trees) {
    const trunk = 4 + Math.floor(hash(tree.x, tree.z, seed + 444) * 3);
    for (let i = 1; i <= trunk; i += 1) {
      const y = tree.h + i;
      if (y >= CHUNK_HEIGHT) break;
      blocks[tree.x + CHUNK_SIZE * (tree.z + CHUNK_SIZE * y)] = 5;
    }
    const top = tree.h + trunk;
    for (let oy = -2; oy <= 2; oy += 1) {
      for (let oz = -2; oz <= 2; oz += 1) {
        for (let ox = -2; ox <= 2; ox += 1) {
          const radius = Math.abs(ox) + Math.abs(oz) + Math.abs(oy) * 0.7;
          if (radius > 3.25) continue;
          const x = tree.x + ox;
          const z = tree.z + oz;
          const y = top + oy;
          if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT) continue;
          const idx = x + CHUNK_SIZE * (z + CHUNK_SIZE * y);
          if (blocks[idx] === 0) blocks[idx] = 6;
        }
      }
    }
  }

  self.postMessage({ cx, cz, blocks }, [blocks.buffer]);
};
