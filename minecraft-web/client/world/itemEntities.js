import * as THREE from 'https://unpkg.com/three@0.166.1/build/three.module.js';

export class ItemEntities {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.items = [];
    this.geometry = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  }

  spawn(x, y, z, blockId) {
    // Phase2: gravity affected item drops.
    const mat = new THREE.MeshBasicMaterial({ color: 0xffdd77 + blockId * 1000 });
    const mesh = new THREE.Mesh(this.geometry, mat);
    mesh.position.set(x + 0.5, y + 0.6, z + 0.5);
    this.scene.add(mesh);
    this.items.push({ x: mesh.position.x, y: mesh.position.y, z: mesh.position.z, vx: 0, vy: 0, vz: 0, blockId, mesh, age: 0 });
  }

  update(dt, player, onPickup) {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const item = this.items[i];
      item.age += dt;
      item.vy = Math.max(-20, item.vy - 22 * dt);
      item.y += item.vy * dt;
      const belowSolid = this.world.getBlockGlobal(Math.floor(item.x), Math.floor(item.y - 0.2), Math.floor(item.z)) !== 0;
      if (belowSolid && item.vy < 0) {
        item.vy = 0;
      }
      item.mesh.position.set(item.x, item.y, item.z);
      item.mesh.rotation.y += dt * 2;

      const dx = player.position.x - item.x;
      const dy = player.position.y + 1 - item.y;
      const dz = player.position.z - item.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < 2.1) {
        onPickup(item.blockId);
        this.scene.remove(item.mesh);
        this.items.splice(i, 1);
      } else if (item.age > 120) {
        this.scene.remove(item.mesh);
        this.items.splice(i, 1);
      }
    }
  }
}
