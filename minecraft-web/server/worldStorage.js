import fs from 'node:fs/promises';
import path from 'node:path';
import { createChunkBuffer, serializeChunk, deserializeChunk } from './chunkSerializer.js';

const WORLD_DIR = path.resolve(process.cwd(), 'minecraft-web-data', 'world');
const REGION_SIZE = 32; // Phase2
const regionWriteQueue = new Map(); // Phase2

function regionCoords(cx, cz) {
  return { rx: Math.floor(cx / REGION_SIZE), rz: Math.floor(cz / REGION_SIZE) };
}

function regionPath(rx, rz) {
  return path.join(WORLD_DIR, `r.${rx}.${rz}.json`);
}

function localChunkKey(cx, cz) {
  return `${cx},${cz}`;
}

async function readRegion(rx, rz) {
  const file = regionPath(rx, rz);
  try {
    const content = await fs.readFile(file, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') return { version: 2, chunks: {} };
    return { version: 2, chunks: {} }; // Phase2 corruption recovery
  }
}

async function writeRegionQueued(rx, rz, mutator) {
  const key = `${rx},${rz}`;
  const prev = regionWriteQueue.get(key) || Promise.resolve();
  const next = prev
    .then(async () => {
      await ensureWorldDir();
      const region = await readRegion(rx, rz);
      mutator(region);
      await fs.writeFile(regionPath(rx, rz), JSON.stringify(region));
    })
    .catch(() => {})
    .finally(() => {
      if (regionWriteQueue.get(key) === next) regionWriteQueue.delete(key);
    });
  regionWriteQueue.set(key, next);
  return next;
}

export async function ensureWorldDir() {
  await fs.mkdir(WORLD_DIR, { recursive: true });
}

export async function loadChunk(cx, cz) {
  await ensureWorldDir();
  const { rx, rz } = regionCoords(cx, cz);
  const region = await readRegion(rx, rz);
  const payload = region.chunks?.[localChunkKey(cx, cz)];
  if (!payload) return createChunkBuffer();
  try {
    return deserializeChunk(Buffer.from(payload, 'base64'));
  } catch {
    return createChunkBuffer(); // Phase2 corruption recovery
  }
}

export async function saveChunk(cx, cz, chunkData) {
  const { rx, rz } = regionCoords(cx, cz);
  await writeRegionQueued(rx, rz, (region) => {
    const binary = serializeChunk(chunkData);
    region.chunks[localChunkKey(cx, cz)] = binary.toString('base64');
  });
}

export async function setBlock(cx, cz, lx, y, lz, blockId) {
  const chunk = await loadChunk(cx, cz);
  const index = lx + 16 * (lz + 16 * y);
  chunk[index] = blockId;
  await saveChunk(cx, cz, chunk);
}
