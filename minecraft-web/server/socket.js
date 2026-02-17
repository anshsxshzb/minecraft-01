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
        protocol: 1,
        motd: 'Voxel sandbox server ready',
      }),
    );

    socket.on('message', (raw) => {
      try {
        const packet = JSON.parse(raw.toString());
        if (packet.type === 'playerPosition') {
          const state = clients.get(id);
          if (state) {
            state.position = packet.payload;
          }
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
    const packet = createPacket('worldUpdate', update);
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
