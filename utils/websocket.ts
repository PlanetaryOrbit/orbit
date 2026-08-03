import { broadcast } from "@/websocket/events";

export async function emitEvent<T>(
  event: string,
  data: T & {
    workspaceGroupId?: number;
  },
) {
  const workspaceId = data.workspaceGroupId;

  broadcast({
    event,

    workspaceId,

    data,

    timestamp: Date.now(),
  });
}
