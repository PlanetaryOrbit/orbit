import { createServer as createHttpsServer } from "node:https";
import fs from "node:fs";
import next from "next";
import { setupWebSocket } from "@/utils/websocket";

const dev = process.env.NODE_ENV !== "production";

const hostname = "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

const keyPath = "./certs/key.pem";
const certPath = "./certs/cert.pem";

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  throw new Error(
    "Error: HTTPS certificates are missing. Expected ./certs/key.pem and ./certs/cert.pem. Make sure you ran `bun run certs` and the certs were generated successfully."
  );
}

const app = next({
  dev,
  hostname,
  port,
});

const handle = app.getRequestHandler();

await app.prepare();

const server = createHttpsServer(
  {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  },
  (req, res) => handle(req, res)
);

setupWebSocket(server);

server.listen(port, hostname, () => {
  if (dev) {
    console.log("[Orbit] Development server running");
    console.log(`[Orbit] HTTPS server available at https://localhost:${port}`);
    console.log(`[Orbit] WebSocket endpoint available at wss://localhost:${port}/api/ws`);
  }
});
