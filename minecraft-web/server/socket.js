import { WebSocketServer } from 'ws';

function createPacket(type, payload) {
  return JSON.stringify({ type, payload, t: Date.now() });
}

export function attachSocketServer(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Map();

  wss.on('connection', (socket) => {
    const id = crypto.randomUUID();
    clients.set(id, { socket, position: { x: 0, y: 0, z: 0 } });

    socket.send(
      createPacket('connect', {
        id,
        protocol: 2, // Phase2
        motd: 'Voxel sandbox server ready',
      }),
    );

    socket.on('message', (raw) => {
      try {
        const packet = JSON.parse(raw.toString());
        if (packet.type === 'player_state') {
          const state = clients.get(id);
          if (state) state.position = packet.payload?.position ?? state.position;
        }
        if (packet.type === 'chunk_request') {
          socket.send(createPacket('chunk_data', { cx: packet.payload?.cx ?? 0, cz: packet.payload?.cz ?? 0, data: null })); // Phase2 structure
        }
      } catch {
        // ignore malformed packets
      }
    });

    socket.on('close', () => {
      clients.delete(id);
    });
  });

  function broadcastWorldUpdate(update) {
    const packet = createPacket('block_update', update); // Phase2
    for (const client of clients.values()) {
      if (client.socket.readyState === client.socket.OPEN) {
        client.socket.send(packet);
      }
    }
  }

  return {
    broadcastWorldUpdate,
    close: () => wss.close(),
  };
}
