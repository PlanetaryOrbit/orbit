export interface SocketClient {
  id: string;
  userId: bigint;
  workspaceIds: number[];
  socket: WebSocket;
}

export interface OrbitEvent<T = unknown> {
  event: string;
  workspaceId?: number;
  data: T;
  timestamp: number;
}
