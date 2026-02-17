# Minecraft Web Sandbox Foundation

This repository now contains a modular Minecraft-like voxel engine foundation in `minecraft-web/`.

## Features
- Deterministic chunked terrain generation (`16 x 16 x 256`) in a Web Worker.
- Biome variation (plains + desert) and cave carving.
- Chunk streaming with unloads, frustum-cullable meshes, and greedy meshing.
- First-person controls, AABB collision with gravity/jump/step assist.
- Block interaction (raycast break/place, max 5 blocks).
- 9-slot hotbar inventory with stacking + scroll/number selection.
- Day/night cycle with moving directional sun + sky interpolation.
- IndexedDB client chunk caching.
- Node/Express server + binary chunk serialization + WebSocket packet foundation.

## Run
```bash
cd minecraft-web
npm install
npm start
```

Open: `http://localhost:3000`

## Controls
- `WASD` movement
- `Space` jump
- `Mouse` look
- `Left click` break block
- `Right click` place block
- `Scroll` hotbar selection
- `Esc` unlock cursor
