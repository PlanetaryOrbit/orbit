import type { SocketClient } from "./types";

const clients = new Map<string, SocketClient>();

export function addClient(client: SocketClient) {
  clients.set(client.id, client);
}

export function removeClient(id: string) {
  clients.delete(id);
}

export function getClients() {
  return clients.values();
}

export function getWorkspaceClients(workspaceId: number) {
  return [...clients.values()].filter((client) =>
    client.workspaceIds.includes(workspaceId),
  );
}
