import fs from 'node:fs/promises';
import path from 'node:path';
import { createChunkBuffer, serializeChunk, deserializeChunk } from './chunkSerializer.js';

const WORLD_DIR = path.resolve(process.cwd(), 'minecraft-web-data', 'world');

function chunkPath(cx, cz) {
  return path.join(WORLD_DIR, `${cx}_${cz}.bin`);
}

export async function ensureWorldDir() {
  await fs.mkdir(WORLD_DIR, { recursive: true });
}

export async function loadChunk(cx, cz) {
  await ensureWorldDir();
  const file = chunkPath(cx, cz);
  try {
    const data = await fs.readFile(file);
    return deserializeChunk(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return createChunkBuffer();
    }
    throw error;
  }
}

export async function saveChunk(cx, cz, chunkData) {
  await ensureWorldDir();
  const file = chunkPath(cx, cz);
  const payload = serializeChunk(chunkData);
  await fs.writeFile(file, payload);
}

export async function setBlock(cx, cz, lx, y, lz, blockId) {
  const chunk = await loadChunk(cx, cz);
  const index = lx + 16 * (lz + 16 * y);
  chunk[index] = blockId;
  await saveChunk(cx, cz, chunk);
}
