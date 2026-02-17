const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 256;
const BLOCK_COUNT = CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT;

export function createChunkBuffer() {
  return new Uint16Array(BLOCK_COUNT);
}

export function chunkIndex(x, y, z) {
  return x + CHUNK_SIZE * (z + CHUNK_SIZE * y);
}

export function serializeChunk(chunk) {
  const source = chunk instanceof Uint16Array ? chunk : new Uint16Array(chunk);
  if (source.length !== BLOCK_COUNT) {
    throw new Error(`Invalid chunk length: expected ${BLOCK_COUNT}, received ${source.length}`);
  }

  const out = Buffer.allocUnsafe(source.length * 2);
  for (let i = 0; i < source.length; i += 1) {
    out.writeUInt16LE(source[i], i * 2);
  }
  return out;
}

export function deserializeChunk(buffer) {
  const view = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (view.length !== BLOCK_COUNT * 2) {
    throw new Error(`Invalid chunk byte length: expected ${BLOCK_COUNT * 2}, received ${view.length}`);
  }

  const chunk = createChunkBuffer();
  for (let i = 0; i < chunk.length; i += 1) {
    chunk[i] = view.readUInt16LE(i * 2);
  }
  return chunk;
}

export { CHUNK_SIZE, CHUNK_HEIGHT, BLOCK_COUNT };
