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

function valueNoise3D(x, y, z, seed) {
  return hash(Math.floor(x + y * 19), Math.floor(z + y * 31), seed);
}

function biomeAt(gx, gz, seed) {
  const humidity = fbm2D(gx * 0.002, gz * 0.002, seed + 101, 3);
  return humidity > 0.48 ? 'plains' : 'desert';
}

self.onmessage = (event) => {
  const { cx, cz, seed } = event.data;
  const blocks = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);

  for (let z = 0; z < CHUNK_SIZE; z += 1) {
    for (let x = 0; x < CHUNK_SIZE; x += 1) {
      const gx = cx * CHUNK_SIZE + x;
      const gz = cz * CHUNK_SIZE + z;
      const biome = biomeAt(gx, gz, seed);
      const continental = fbm2D(gx * 0.004, gz * 0.004, seed, 5);
      const erosion = fbm2D(gx * 0.01, gz * 0.01, seed + 37, 3);
      const baseHeight = biome === 'desert' ? 58 : 70;
      const relief = biome === 'desert' ? 18 : 35;
      const h = Math.floor(baseHeight + continental * relief - erosion * 12);

      for (let y = 0; y < CHUNK_HEIGHT; y += 1) {
        const idx = x + CHUNK_SIZE * (z + CHUNK_SIZE * y);
        if (y > h) {
          blocks[idx] = 0;
          continue;
        }

        const cave = fbm2D(gx * 0.05 + y * 0.01, gz * 0.05 + y * 0.01, seed + 991, 2) + valueNoise3D(gx * 0.1, y * 0.1, gz * 0.1, seed + 123);
        if (y < h - 8 && cave > 1.35) {
          blocks[idx] = 0;
          continue;
        }

        if (y === h) blocks[idx] = biome === 'desert' ? 4 : 1;
        else if (y > h - 4) blocks[idx] = 2;
        else blocks[idx] = 3;
      }
    }
  }

  self.postMessage({ cx, cz, blocks }, [blocks.buffer]);
};
