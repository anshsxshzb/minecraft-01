# Minecraft Web Sandbox Foundation

Phase 2 upgrades extend the original engine with smoother physics, improved interaction, localized lighting, richer terrain biomes, stronger persistence, and survival-loop primitives.

## Features
- Deterministic chunked terrain generation (`16 x 16 x 256`) in a Web Worker.
- Biomes: plains, mountains, desert, and forest with procedural tree placement.
- Chunk streaming with unloads, frustum-cullable meshes, and greedy meshing.
- First-person controls, improved AABB collision with gravity, terminal velocity, step-climb, air-control reduction, and sprint double-tap.
- Accurate block raycast with face detection, selection wireframe, break progression overlay, and placement safety checks.
- Localized voxel lighting: sunlight + torch block-light propagation and relight on modified chunks.
- 9-slot hotbar inventory with stacking + scroll/number selection.
- Basic survival stats (health/hunger) and gravity-affected dropped item entities.
- IndexedDB client chunk caching with versioning and corruption fallback; modified-only client chunk save queue.
- Node/Express server + versioned binary chunk serialization + region-file persistence with async queued writes.
- WebSocket protocol foundation packets: `connect`, `player_state`, `block_update`, `chunk_request`, `chunk_data`.

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
- `Double-tap W` sprint
- `Mouse` look
- `Left click` break block
- `Right click` place block
- `Scroll` hotbar selection
- `Esc` unlock cursor and open pause menu
