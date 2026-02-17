import * as THREE from 'https://unpkg.com/three@0.166.1/build/three.module.js';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './chunk.js';

const ATLAS_TILES = 8;
const TILE_UV = 1 / ATLAS_TILES;

function tileUV(tile) {
  const x = tile % ATLAS_TILES;
  const y = Math.floor(tile / ATLAS_TILES);
  const u0 = x * TILE_UV;
  const v0 = 1 - (y + 1) * TILE_UV;
  return [u0, v0, u0 + TILE_UV, v0 + TILE_UV];
}

function getFaceTile(block, axis, dir, textures) {
  const mapping = textures[block] ?? textures[1];
  if (axis === 1 && dir > 0) return mapping.top;
  if (axis === 1 && dir < 0) return mapping.bottom;
  return mapping.side;
}

export function buildChunkMesh(chunk, material, textures, sampleGlobal) {
  const dims = [CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_SIZE];
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let indexOffset = 0;

  const mask = new Int32Array(Math.max(CHUNK_SIZE * CHUNK_HEIGHT, CHUNK_SIZE * CHUNK_SIZE, CHUNK_HEIGHT * CHUNK_SIZE));

  for (let axis = 0; axis < 3; axis += 1) {
    const u = (axis + 1) % 3;
    const v = (axis + 2) % 3;
    const x = [0, 0, 0];
    const q = [0, 0, 0];
    q[axis] = 1;

    for (x[axis] = -1; x[axis] < dims[axis]; ) {
      let n = 0;
      for (x[v] = 0; x[v] < dims[v]; x[v] += 1) {
        for (x[u] = 0; x[u] < dims[u]; x[u] += 1) {
          const a = x[axis] >= 0 ? sample(axis, x[0], x[1], x[2]) : 0;
          const b = x[axis] < dims[axis] - 1 ? sample(axis, x[0] + q[0], x[1] + q[1], x[2] + q[2]) : 0;
          if ((a !== 0) === (b !== 0)) {
            mask[n++] = 0;
          } else if (a !== 0) {
            mask[n++] = a;
          } else {
            mask[n++] = -b;
          }
        }
      }

      x[axis] += 1;
      n = 0;

      for (let j = 0; j < dims[v]; j += 1) {
        for (let i = 0; i < dims[u]; ) {
          const block = mask[n];
          if (block === 0) {
            i += 1;
            n += 1;
            continue;
          }

          let width = 1;
          while (i + width < dims[u] && mask[n + width] === block) width += 1;

          let height = 1;
          outer: while (j + height < dims[v]) {
            for (let k = 0; k < width; k += 1) {
              if (mask[n + k + height * dims[u]] !== block) break outer;
            }
            height += 1;
          }

          const du = [0, 0, 0];
          const dv = [0, 0, 0];
          du[u] = width;
          dv[v] = height;

          const p = [x[0], x[1], x[2]];
          p[u] = i;
          p[v] = j;

          const dir = Math.sign(block);
          const blockId = Math.abs(block);
          const tile = getFaceTile(blockId, axis, dir, textures);
          const [u0, v0, u1, v1] = tileUV(tile);

          const corners = [
            [p[0], p[1], p[2]],
            [p[0] + du[0], p[1] + du[1], p[2] + du[2]],
            [p[0] + du[0] + dv[0], p[1] + du[1] + dv[1], p[2] + du[2] + dv[2]],
            [p[0] + dv[0], p[1] + dv[1], p[2] + dv[2]],
          ];

          if (dir < 0) {
            corners.reverse();
          }

          for (const c of corners) {
            positions.push(c[0], c[1], c[2]);
            const normal = [0, 0, 0];
            normal[axis] = dir;
            normals.push(normal[0], normal[1], normal[2]);
          }

          uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);
          indices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);
          indexOffset += 4;

          for (let y = 0; y < height; y += 1) {
            for (let x2 = 0; x2 < width; x2 += 1) {
              mask[n + x2 + y * dims[u]] = 0;
            }
          }

          i += width;
          n += width;
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(chunk.cx * CHUNK_SIZE, 0, chunk.cz * CHUNK_SIZE);
  mesh.frustumCulled = true;
  return mesh;

  function sample(axis, x, y, z) {
    const gx = x + chunk.cx * CHUNK_SIZE;
    const gz = z + chunk.cz * CHUNK_SIZE;
    return sampleGlobal(gx, y, gz);
  }
}
