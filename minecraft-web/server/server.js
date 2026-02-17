import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachSocketServer } from './socket.js';
import { loadChunk, saveChunk, setBlock } from './worldStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, '../client');

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.static(clientDir));

app.get('/api/chunk/:cx/:cz', async (req, res) => {
  const cx = Number(req.params.cx);
  const cz = Number(req.params.cz);
  const chunk = await loadChunk(cx, cz);
  res.json({ cx, cz, data: Array.from(chunk) });
});

app.post('/api/chunk/:cx/:cz', async (req, res) => {
  const cx = Number(req.params.cx);
  const cz = Number(req.params.cz);
  const { data } = req.body;
  await saveChunk(cx, cz, Uint16Array.from(data));
  res.status(204).end();
});

app.post('/api/block', async (req, res) => {
  const { cx, cz, lx, y, lz, blockId } = req.body;
  await setBlock(cx, cz, lx, y, lz, blockId);
  socketLayer.broadcastWorldUpdate({ cx, cz, lx, y, lz, blockId });
  res.status(204).end();
});

const server = http.createServer(app);
const socketLayer = attachSocketServer(server);

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Minecraft web server running on http://localhost:${port}`);
});
