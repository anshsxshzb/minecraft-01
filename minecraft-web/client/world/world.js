import * as THREE from 'https://unpkg.com/three@0.166.1/build/three.module.js';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './chunk.js';
import { BLOCK_TEXTURES, BLOCK_LIGHT } from './blockTypes.js';
import { buildChunkMesh } from './chunkMesh.js';

const CACHE_VERSION = 2; // Phase2

function chunkKey(cx, cz) {
  return `${cx},${cz}`;
}

function unpackChunkKey(key) {
  const [cx, cz] = key.split(',').map(Number);
  return { cx, cz };
}

async function openChunkDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('voxel-chunk-cache', CACHE_VERSION); // Phase2
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('chunks')) req.result.createObjectStore('chunks');
      if (!req.result.objectStoreNames.contains('meta')) req.result.createObjectStore('meta');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.seed = 1337;
    this.renderDistance = 8;
    this.chunks = new Map();
    this.pending = new Set();
    this.worker = new Worker('./world/terrainWorker.js', { type: 'module' });
    this.dbPromise = openChunkDB();
    this.texture = this.createAtlasTexture();
    this.material = new THREE.MeshLambertMaterial({ map: this.texture, vertexColors: true }); // Phase2
    this.saveQueue = new Set(); // Phase2

    this.worker.onmessage = (event) => {
      const { cx, cz, blocks } = event.data;
      const key = chunkKey(cx, cz);
      const chunk = this.chunks.get(key) ?? new Chunk(cx, cz);
      chunk.blocks = new Uint16Array(blocks);
      chunk.dirty = true;
      chunk.modified = false; // Phase2
      this.relightChunk(chunk); // Phase2
      this.chunks.set(key, chunk);
      this.pending.delete(key);
    };

    // Phase2: async modified-chunk saving with crash-safe cadence.
    setInterval(() => {
      this.flushSaveQueue();
    }, 1200);
  }

  setRenderDistance(value) {
    this.renderDistance = Math.max(2, Math.min(12, Math.floor(value))); // Phase2
  }

  createAtlasTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const colors = ['#4caf50', '#6d4c41', '#7f8c8d', '#e6c85f', '#8d6e63', '#5d4037', '#2e7d32', '#ffb300']; // Phase2
    colors.forEach((color, i) => {
      const x = (i % 8) * 16;
      const y = Math.floor(i / 8) * 16;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 16, 16);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (let j = 0; j < 18; j += 1) {
        ctx.fillRect(x + Math.random() * 16, y + Math.random() * 16, 1, 1);
      }
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapNearestFilter;
    return texture;
  }

  async cacheChunk(cx, cz, chunk) {
    const db = await this.dbPromise;
    const tx = db.transaction('chunks', 'readwrite');
    tx.objectStore('chunks').put({ version: CACHE_VERSION, blocks: chunk.blocks, modified: chunk.modified }, chunkKey(cx, cz)); // Phase2
  }

  async readCachedChunk(cx, cz) {
    const db = await this.dbPromise;
    const tx = db.transaction('chunks', 'readonly');
    const req = tx.objectStore('chunks').get(chunkKey(cx, cz));
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const data = req.result;
        if (!data || data.version !== CACHE_VERSION || !(data.blocks instanceof Uint16Array)) {
          resolve(null); // Phase2 corruption/version fallback
          return;
        }
        resolve(data);
      };
      req.onerror = () => resolve(null);
    });
  }

  getChunk(cx, cz) {
    return this.chunks.get(chunkKey(cx, cz));
  }

  getBlockGlobal(gx, y, gz) {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cz = Math.floor(gz / CHUNK_SIZE);
    const lx = ((gx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((gz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return 0;
    return chunk.getBlock(lx, y, lz);
  }

  getLightGlobal(gx, y, gz) {
    if (y < 0 || y >= CHUNK_HEIGHT) return 15;
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cz = Math.floor(gz / CHUNK_SIZE);
    const lx = ((gx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((gz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return 15;
    const idx = chunk.index(lx, y, lz);
    return Math.max(chunk.sunlight[idx], chunk.blockLight[idx]); // Phase2
  }

  async ensureChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    if (this.chunks.has(key) || this.pending.has(key)) return;
    this.pending.add(key);

    // Phase2: local cache first, server second, worker fallback.
    const cached = await this.readCachedChunk(cx, cz);
    if (cached) {
      const chunk = new Chunk(cx, cz);
      chunk.blocks = new Uint16Array(cached.blocks);
      chunk.modified = Boolean(cached.modified);
      this.relightChunk(chunk);
      this.chunks.set(key, chunk);
      this.pending.delete(key);
      return;
    }

    try {
      const response = await fetch(`/api/chunk/${cx}/${cz}`);
      if (response.ok) {
        const payload = await response.json();
        if (Array.isArray(payload.data) && payload.data.length === CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT) {
          const chunk = new Chunk(cx, cz);
          chunk.blocks = Uint16Array.from(payload.data);
          chunk.modified = false;
          this.relightChunk(chunk);
          this.chunks.set(key, chunk);
          this.pending.delete(key);
          return;
        }
      }
    } catch {
      // worker fallback below
    }

    this.worker.postMessage({ cx, cz, seed: this.seed });
  }

  updateStreaming(playerPos) {
    const pcx = Math.floor(playerPos.x / CHUNK_SIZE);
    const pcz = Math.floor(playerPos.z / CHUNK_SIZE);

    for (let dz = -this.renderDistance; dz <= this.renderDistance; dz += 1) {
      for (let dx = -this.renderDistance; dx <= this.renderDistance; dx += 1) {
        const dist = Math.max(Math.abs(dx), Math.abs(dz));
        if (dist <= this.renderDistance) this.ensureChunk(pcx + dx, pcz + dz);
      }
    }

    for (const [key, chunk] of this.chunks) {
      const dist = Math.max(Math.abs(chunk.cx - pcx), Math.abs(chunk.cz - pcz));
      if (dist > this.renderDistance + 2) {
        if (chunk.modified) this.enqueueChunkSave(key); // Phase2
        if (chunk.mesh) this.scene.remove(chunk.mesh);
        this.chunks.delete(key);
      }
    }
  }

  rebuildDirtyMeshes() {
    for (const chunk of this.chunks.values()) {
      if (!chunk.dirty) continue;
      if (chunk.mesh) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
      }
      chunk.mesh = buildChunkMesh(chunk, this.material, BLOCK_TEXTURES, (x, y, z) => this.getBlockGlobal(x, y, z), (x, y, z) => this.getLightGlobal(x, y, z)); // Phase2
      this.scene.add(chunk.mesh);
      chunk.dirty = false;
    }
  }

  enqueueChunkSave(key) {
    this.saveQueue.add(key); // Phase2
  }

  async flushSaveQueue() {
    if (this.saveQueue.size === 0) return;
    const keys = [...this.saveQueue];
    this.saveQueue.clear();
    await Promise.all(
      keys.map(async (key) => {
        const chunk = this.chunks.get(key);
        if (!chunk || !chunk.modified) return; // Phase2 save only modified chunks
        const { cx, cz } = unpackChunkKey(key);
        await this.cacheChunk(cx, cz, chunk);
        try {
          await fetch(`/api/chunk/${cx}/${cz}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: Array.from(chunk.blocks) }),
          });
          chunk.modified = false;
        } catch {
          this.saveQueue.add(key);
        }
      }),
    );
  }

  relightChunk(chunk) {
    // Phase2: localized chunk relight (sun + block light) without world-wide relight.
    chunk.sunlight.fill(0);
    chunk.blockLight.fill(0);

    for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
      for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
        let blocked = false;
        for (let y = CHUNK_HEIGHT - 1; y >= 0; y -= 1) {
          const idx = chunk.index(lx, y, lz);
          const block = chunk.blocks[idx];
          if (!blocked && block === 0) chunk.sunlight[idx] = 15;
          else {
            blocked = blocked || block !== 0;
            chunk.sunlight[idx] = blocked ? 0 : 15;
          }
        }
      }
    }

    const queue = [];
    for (let y = 0; y < CHUNK_HEIGHT; y += 1) {
      for (let z = 0; z < CHUNK_SIZE; z += 1) {
        for (let x = 0; x < CHUNK_SIZE; x += 1) {
          const idx = chunk.index(x, y, z);
          const emit = BLOCK_LIGHT[chunk.blocks[idx]] ?? 0;
          if (emit > 0) {
            chunk.blockLight[idx] = emit;
            queue.push([x, y, z, emit]);
          }
        }
      }
    }

    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    while (queue.length) {
      const [x, y, z, level] = queue.shift();
      if (level <= 1) continue;
      for (const [dx, dy, dz] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;
        if (ny < 0 || ny >= CHUNK_HEIGHT || nx < 0 || nx >= CHUNK_SIZE || nz < 0 || nz >= CHUNK_SIZE) continue;
        const nIdx = chunk.index(nx, ny, nz);
        if (chunk.blocks[nIdx] !== 0) continue;
        if (chunk.blockLight[nIdx] >= level - 1) continue;
        chunk.blockLight[nIdx] = level - 1;
        queue.push([nx, ny, nz, level - 1]);
      }
    }
  }

  setBlockGlobal(gx, y, gz, blockId) {
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cz = Math.floor(gz / CHUNK_SIZE);
    const lx = ((gx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((gz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return false;
    chunk.setBlock(lx, y, lz, blockId);
    this.relightChunk(chunk); // Phase2
    this.enqueueChunkSave(chunkKey(cx, cz)); // Phase2
    return true;
  }
}
