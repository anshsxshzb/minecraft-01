import * as THREE from 'https://unpkg.com/three@0.166.1/build/three.module.js';
import { createRenderer } from './engine/renderer.js';
import { createCamera } from './engine/camera.js';
import { createControls } from './engine/controls.js';
import { integratePlayer } from './engine/physics.js';
import { raycastBlock } from './engine/raycast.js';
import { startGameLoop } from './engine/gameLoop.js';
import { World } from './world/world.js';
import { createPlayer } from './player/player.js';
import { createHotbar } from './player/hotbar.js';
import { createHud } from './ui/hud.js';
import { createCrosshair } from './ui/crosshair.js';
import { setupMenu } from './ui/menu.js';

const canvas = document.querySelector('#game');
const hudRoot = document.querySelector('#hud');
const menu = document.querySelector('#menu');
const startBtn = document.querySelector('#start-btn');

const { renderer, scene, sun, ambient } = createRenderer(canvas);
const camera = createCamera();
const controls = createControls(canvas, camera, menu);
const menuUi = setupMenu(menu, startBtn, canvas);
const hud = createHud(hudRoot);
createCrosshair(hudRoot);

const world = new World(scene);
const player = createPlayer();
const hotbar = createHotbar(hudRoot, player.inventory);

const ws = new WebSocket(`ws://${location.host}/ws`);
ws.addEventListener('message', () => {
  // reserved for multiplayer updates
});

window.addEventListener('contextmenu', (event) => event.preventDefault());
window.addEventListener('mousedown', (event) => {
  if (!controls.locked) return;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const origin = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  const result = raycastBlock(world, origin, dir, 5);
  if (!result) return;

  if (event.button === 0) {
    world.setBlockGlobal(result.hit.x, result.hit.y, result.hit.z, 0);
    player.inventory.addItem(result.hit.block, 1);
    hotbar.render();
  }

  if (event.button === 2 && result.place) {
    const item = player.inventory.consumeSelected();
    if (item !== 0) {
      world.setBlockGlobal(result.place.x, result.place.y, result.place.z, item);
      hotbar.render();
    }
  }
});

startGameLoop((dt, timeSec) => {
  world.updateStreaming(player.position);
  world.rebuildDirtyMeshes();
  integratePlayer(player, controls, world, dt);

  camera.position.set(player.position.x, player.position.y + 1.62, player.position.z);

  const day = (Math.sin(timeSec * 0.03) + 1) * 0.5;
  sun.position.set(Math.cos(timeSec * 0.03) * 120, 20 + day * 130, Math.sin(timeSec * 0.03) * 120);
  sun.intensity = 0.2 + day * 1.2;
  ambient.intensity = 0.08 + day * 0.3;
  scene.background = new THREE.Color().lerpColors(new THREE.Color(0x0b1026), new THREE.Color(0x87ceeb), day);

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'playerPosition', payload: player.position }));
  }

  const chunkCount = world.chunks.size;
  hud.setStats(`XYZ ${player.position.x.toFixed(1)} ${player.position.y.toFixed(1)} ${player.position.z.toFixed(1)} | Chunks ${chunkCount}`);
  renderer.render(scene, camera);

  if (!controls.locked) menuUi.show();
});
