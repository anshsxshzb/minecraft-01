import * as THREE from 'https://unpkg.com/three@0.166.1/build/three.module.js';
import { createRenderer } from './engine/renderer.js';
import { createCamera } from './engine/camera.js';
import { createControls } from './engine/controls.js';
import { integratePlayer, playerIntersectsAABB } from './engine/physics.js';
import { raycastBlock } from './engine/raycast.js';
import { startGameLoop } from './engine/gameLoop.js';
import { World } from './world/world.js';
import { createPlayer } from './player/player.js';
import { createHotbar } from './player/hotbar.js';
import { createHud } from './ui/hud.js';
import { createCrosshair } from './ui/crosshair.js';
import { setupMenu } from './ui/menu.js';
import { ItemEntities } from './world/itemEntities.js';

const canvas = document.querySelector('#game');
const hudRoot = document.querySelector('#hud');
const menu = document.querySelector('#menu');
const startBtn = document.querySelector('#start-btn');
const breakOverlay = document.querySelector('#break-overlay');

const { renderer, scene, sun, ambient } = createRenderer(canvas);
const camera = createCamera();
const controls = createControls(canvas, camera, menu);
const world = new World(scene);
const player = createPlayer();
const itemEntities = new ItemEntities(scene, world);
const menuUi = setupMenu(menu, startBtn, canvas, () => world.flushSaveQueue(), (dist) => world.setRenderDistance(dist));
const hud = createHud(hudRoot);
createCrosshair(hudRoot);

const hotbar = createHotbar(hudRoot, player.inventory);

const ws = new WebSocket(`ws://${location.host}/ws`);
ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'player_state', payload: { position: player.position, health: player.health, hunger: player.hunger } })); // Phase2
});

const selectionBox = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)),
  new THREE.LineBasicMaterial({ color: 0xffffff }),
);
selectionBox.visible = false;
selectionBox.layers.set(1); // Phase2 separate layer
scene.add(selectionBox);
camera.layers.enableAll();

let breakTarget = null;
let breakProgress = 0;
let fpsSmoothing = 60;
let hungerTick = 0; // Phase2

window.addEventListener('beforeunload', () => {
  world.flushSaveQueue(); // Phase2
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
    if (!breakTarget || breakTarget.x !== result.hit.x || breakTarget.y !== result.hit.y || breakTarget.z !== result.hit.z) {
      breakProgress = 0;
      breakTarget = result.hit;
    }
  }

  if (event.button === 2 && result.place) {
    if (playerIntersectsAABB(player.position, result.place.x, result.place.y, result.place.z)) return; // Phase2
    const item = player.inventory.consumeSelected();
    if (item !== 0 && world.setBlockGlobal(result.place.x, result.place.y, result.place.z, item)) {
      hotbar.render();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'block_update', payload: { x: result.place.x, y: result.place.y, z: result.place.z, blockId: item } })); // Phase2
      }
    }
  }
});

window.addEventListener('mouseup', () => {
  breakTarget = null;
  breakProgress = 0;
  breakOverlay.style.opacity = '0';
});

let hudTick = 0;
startGameLoop((dt, timeSec) => {
  world.updateStreaming(player.position);
  world.rebuildDirtyMeshes();
  integratePlayer(player, controls, world, dt);
  itemEntities.update(dt, player, (blockId) => {
    player.inventory.addItem(blockId, 1);
    hotbar.render();
  });

  camera.position.set(player.position.x, player.position.y + 1.62, player.position.z);

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const target = raycastBlock(world, camera.position, dir, 5);
  if (target?.hit) {
    selectionBox.visible = true;
    selectionBox.position.set(target.hit.x + 0.5, target.hit.y + 0.5, target.hit.z + 0.5);
  } else {
    selectionBox.visible = false;
  }

  if (breakTarget && target?.hit && breakTarget.x === target.hit.x && breakTarget.y === target.hit.y && breakTarget.z === target.hit.z) {
    breakProgress += dt * 2.2; // Phase2 break stages
    breakOverlay.style.opacity = `${Math.min(1, breakProgress)}`;
    if (breakProgress >= 1 && world.setBlockGlobal(breakTarget.x, breakTarget.y, breakTarget.z, 0)) {
      itemEntities.spawn(breakTarget.x, breakTarget.y, breakTarget.z, breakTarget.block);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'block_update', payload: { x: breakTarget.x, y: breakTarget.y, z: breakTarget.z, blockId: 0 } }));
      }
      breakTarget = null;
      breakProgress = 0;
      breakOverlay.style.opacity = '0';
    }
  } else if (breakTarget) {
    breakTarget = null;
    breakProgress = 0;
    breakOverlay.style.opacity = '0';
  }

  const day = (Math.sin(timeSec * 0.03) + 1) * 0.5;
  sun.position.set(Math.cos(timeSec * 0.03) * 120, 20 + day * 130, Math.sin(timeSec * 0.03) * 120);
  sun.intensity = 0.2 + day * 1.2;
  ambient.intensity = 0.08 + day * 0.3;
  scene.background = new THREE.Color().lerpColors(new THREE.Color(0x0b1026), new THREE.Color(0x87ceeb), day);

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'player_state', payload: { position: player.position, health: player.health, hunger: player.hunger } })); // Phase2
  }

  hudTick += dt;
  hungerTick += dt;
  if (hungerTick > 9) {
    hungerTick = 0;
    player.hunger = Math.max(0, player.hunger - 1); // Phase2
    if (player.hunger === 0) player.health = Math.max(1, player.health - 1);
  }
  fpsSmoothing = fpsSmoothing * 0.9 + (1 / Math.max(0.0001, dt)) * 0.1;
  if (hudTick > 0.2) {
    hudTick = 0;
    const mem = performance.memory ? `${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)}MB` : 'n/a';
    const chunkCount = world.chunks.size;
    hud.setStats(`FPS ${fpsSmoothing.toFixed(0)} | Chunks ${chunkCount} | Mem ${mem}`);
    hud.setPrompt(`XYZ ${player.position.x.toFixed(1)} ${player.position.y.toFixed(1)} ${player.position.z.toFixed(1)} | HP ${player.health} | Hunger ${player.hunger}`);
  }

  renderer.render(scene, camera);
  if (!controls.locked) menuUi.show();
  else menuUi.hide();
});
