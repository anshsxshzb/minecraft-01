import * as THREE from 'https://unpkg.com/three@0.166.1/build/three.module.js';
import { Chunk, CHUNK_SIZE } from './chunk.js';
import { BLOCK_TEXTURES } from './blockTypes.js';
import { buildChunkMesh } from './chunkMesh.js';

function chunkKey(cx, cz) {
  return `${cx},${cz}`;
}

async function openChunkDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('voxel-chunk-cache', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('chunks');
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
    this.material = new THREE.MeshLambertMaterial({ map: this.texture });

    this.worker.onmessage = (event) => {
      const { cx, cz, blocks } = event.data;
      const key = chunkKey(cx, cz);
      const chunk = this.chunks.get(key) ?? new Chunk(cx, cz);
      chunk.blocks = new Uint16Array(blocks);
      chunk.dirty = true;
      this.chunks.set(key, chunk);
      this.pending.delete(key);
      this.cacheChunk(cx, cz, chunk.blocks);
    };
  }

  createAtlasTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const colors = ['#4caf50', '#6d4c41', '#7f8c8d', '#e6c85f', '#8d6e63', '#5d4037'];
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

  async cacheChunk(cx, cz, blocks) {
    const db = await this.dbPromise;
    const tx = db.transaction('chunks', 'readwrite');
    tx.objectStore('chunks').put(blocks, chunkKey(cx, cz));
  }

  async readCachedChunk(cx, cz) {
    const db = await this.dbPromise;
    const tx = db.transaction('chunks', 'readonly');
    const req = tx.objectStore('chunks').get(chunkKey(cx, cz));
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  getChunk(cx, cz) {
    return this.chunks.get(chunkKey(cx, cz));
  }

  getBlockGlobal(gx, y, gz) {
    if (y < 0 || y >= 256) return 0;
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cz = Math.floor(gz / CHUNK_SIZE);
    const lx = ((gx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((gz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return 0;
    return chunk.getBlock(lx, y, lz);
  }

  async ensureChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    if (this.chunks.has(key) || this.pending.has(key)) return;
    this.pending.add(key);

    const cached = await this.readCachedChunk(cx, cz);
    if (cached) {
      const chunk = new Chunk(cx, cz);
      chunk.blocks = new Uint16Array(cached);
      this.chunks.set(key, chunk);
      this.pending.delete(key);
      return;
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
      chunk.mesh = buildChunkMesh(chunk, this.material, BLOCK_TEXTURES, (x, y, z) => this.getBlockGlobal(x, y, z));
      this.scene.add(chunk.mesh);
      chunk.dirty = false;
    }
  }

  setBlockGlobal(gx, y, gz, blockId) {
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cz = Math.floor(gz / CHUNK_SIZE);
    const lx = ((gx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((gz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return;
    chunk.setBlock(lx, y, lz, blockId);
  }
}
