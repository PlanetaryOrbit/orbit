import { getWorkspaceClients } from "./clients";

import type { OrbitEvent } from "./types";

export function broadcast<T>(event: OrbitEvent<T>) {
  if (!event.workspaceId) return;

  const clients = getWorkspaceClients(event.workspaceId);

  const payload = JSON.stringify(event);

  for (const client of clients) {
    if (client.socket.readyState === 1) {
      client.socket.send(payload);
    }
  }
}
