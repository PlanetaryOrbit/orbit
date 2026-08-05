import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";

const clients = new Set<WebSocket>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({
    noServer: true,
  });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "", `http://${request.headers.host}`);

    if (url.pathname !== "/api/ws") {
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (socket, request) => {
    clients.add(socket);

    socket.send(
      JSON.stringify({
        type: "connected",
        data: {
          message: "Hello World!",
        },
      }),
    );

    socket.on("close", () => {
      clients.delete(socket);
    });

    socket.on("error", () => {
      clients.delete(socket);
    });
  });

  setInterval(() => {
    broadcast({
      type: "health",
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        // connections: clients.size,
      },
    });
  }, 5000);
}

export function broadcast(event: { type: string; data: unknown }) {
  const payload = JSON.stringify(event);

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
