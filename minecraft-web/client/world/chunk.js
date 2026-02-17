export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 256;

export class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);
    this.dirty = true;
    this.mesh = null;
  }

  index(x, y, z) {
    return x + CHUNK_SIZE * (z + CHUNK_SIZE * y);
  }

  getBlock(x, y, z) {
    if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT) return 0;
    return this.blocks[this.index(x, y, z)];
  }

  setBlock(x, y, z, block) {
    if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT) return;
    this.blocks[this.index(x, y, z)] = block;
    this.dirty = true;
  }
}
