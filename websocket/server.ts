import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import { addClient, removeClient } from "./clients";
import prisma from "@/utils/database";

export function startWebsocketServer() {
  const port = Number(process.env.WEBSOCKET_PORT ?? 3001);

  const server = new WebSocketServer({
    port,
  });

  console.log(`[WS] Listening on ${port}`);

  server.on("connection", async (socket, request) => {
    const id = randomUUID();

    // TODO: setup auth here

    let client: any;

    socket.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "auth") {
          const session = await prisma.authSession.findUnique({
            where: {
              token: msg.token,
            },

            include: {
              user: true,
            },
          });

          if (!session) {
            socket.close();
            return;
          }

          client = {
            id,

            userId: session.userId,

            workspaceIds: [],
          };

          addClient({
            ...client,
            socket,
          });

          socket.send(
            JSON.stringify({
              event: "authenticated",
            }),
          );
        }
      } catch (err) {
        console.error("[WS]", err);
      }
    });

    socket.on("close", () => {
      if (client) removeClient(client.id);
    });
  });

  return server;
}
