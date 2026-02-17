export const BLOCKS = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  LOG: 5,
  LEAVES: 6,
  TORCH: 7,
};

export const BLOCK_TEXTURES = {
  1: { top: 0, side: 1, bottom: 2 },
  2: { top: 2, side: 2, bottom: 2 },
  3: { top: 3, side: 3, bottom: 3 },
  4: { top: 4, side: 4, bottom: 4 },
  5: { top: 5, side: 5, bottom: 5 },
  6: { top: 6, side: 6, bottom: 6 },
  7: { top: 7, side: 7, bottom: 7 },
};

export const BLOCK_SOLID = new Set([1, 2, 3, 4, 5, 6, 7]);
export const BLOCK_LIGHT = {
  7: 14,
};
