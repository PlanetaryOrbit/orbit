import type { Server } from 'node:http';

import { WebSocketServer, WebSocket } from 'ws';

const clients = new Set<WebSocket>();
const healthStatus = new Map<WebSocket, boolean>();

let wss: WebSocketServer | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

export function setupWebSocket(server: Server) {
  if (wss) {
    return;
  }

  wss = new WebSocketServer({
    noServer: true,
  });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '', `http://${request.headers.host}`);

    if (url.pathname !== '/api/ws') {
      return;
    }

    wss!.handleUpgrade(request, socket, head, (ws) => {
      wss!.emit('connection', ws, request);
    });
  });

  wss.on('connection', (socket) => {
    clients.add(socket);
    healthStatus.set(socket, true);

    socket.on('pong', () => {
      healthStatus.set(socket, true);
    });

    socket.send(
      JSON.stringify({
        type: 'connected',
        data: {
          message: 'Hello World!',
        },
      }),
    );

    socket.on('close', () => {
      clients.delete(socket);
      healthStatus.delete(socket);
    });

    socket.on('error', () => {
      clients.delete(socket);
      healthStatus.delete(socket);
    });
  });

  heartbeatInterval = setInterval(() => {
    for (const client of clients) {
      if (!healthStatus.get(client)) {
        client.terminate();
        clients.delete(client);
        healthStatus.delete(client);
        continue;
      }

      healthStatus.set(client, false);
      client.ping();
    }

    broadcast({
      type: 'health',
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        clients: clients.size,
      },
    });
  }, 30_000);
}

export function broadcast(event: { type: string; data: unknown }) {
  const payload = JSON.stringify(event);

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

export function closeWebSocket() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  for (const client of clients) {
    client.terminate();
  }

  clients.clear();
  healthStatus.clear();

  wss?.close();
  wss = null;
}
