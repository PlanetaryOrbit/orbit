const heartbeatInterval = 120_000; // 2 minutes
const clientTimeout = heartbeatInterval + 30_000; // 2.5 minutes

type WebSocketHandler = Parameters<typeof defineWebSocketHandler>[0];

type OrbitPeer =
  NonNullable<WebSocketHandler['open']> extends (peer: infer T) => unknown ? T : never;

const peers = new Map<
  OrbitPeer,
  {
    lastSeen: number;
  }
>();

const _heartbeatTimer = setInterval(() => {
  const now = Date.now();

  for (const [peer, state] of peers) {
    if (now - state.lastSeen > clientTimeout) {
      if (import.meta.dev) {
        console.log('[WS] Terminating inactive client');
      }

      peer.close(1000, 'Heartbeat timeout');
      peers.delete(peer);
      continue;
    }

    peer.send(
      JSON.stringify({
        type: 'ping',
        data: {
          timestamp: new Date().toISOString(),
        },
      }),
    );
  }
}, heartbeatInterval);

export default defineWebSocketHandler({
  open(peer) {
    peers.set(peer, {
      lastSeen: Date.now(),
    });

    if (import.meta.dev) {
      console.log('[WS] Client connected');
    }

    peer.send(
      JSON.stringify({
        type: 'connected',
        data: {
          message: 'Hello World!',
        },
      }),
    );
  },

  message(peer, message) {
    const state = peers.get(peer);

    if (!state) {
      peer.close(1008, 'Unknown connection');
      return;
    }

    let payload: unknown;

    try {
      payload = JSON.parse(message.text());
    } catch {
      peer.send(
        JSON.stringify({
          type: 'error',
          data: {
            message: 'Invalid JSON.',
          },
        }),
      );

      return;
    }

    if (
      typeof payload === 'object' &&
      payload !== null &&
      'type' in payload &&
      payload.type === 'pong'
    ) {
      state.lastSeen = Date.now();
      return;
    }

    if (import.meta.dev) {
      console.log('[WS] Message:', payload);
    }
  },

  close(peer) {
    peers.delete(peer);

    if (import.meta.dev) {
      console.log('[WS] Client disconnected');
    }
  },

  error(peer, error) {
    peers.delete(peer);

    if (import.meta.dev) {
      console.error('[WS] Error:', error);
    }
  },
});
