const heartbeatInterval = 120000; // 2 minutes - interval between heartbeat pings
const clientTimeout = heartbeatInterval + 150000; // 2.5 minutes - time before a client is considered inactive
const maxMessageSize = 65536; // Maximum message size in bytes
const maxMessagesPerSecond = 10; // Maximum number of messages per second
const maxInvalidMessages = 10; // Maximum number of invalid messages before a client is terminated

type WebSocketHandler = Parameters<typeof defineWebSocketHandler>[0];

type OrbitPeer =
  NonNullable<WebSocketHandler['open']> extends (peer: infer T) => unknown ? T : never;

type PeerState = {
  lastSeen: number;
  messageCount: number;
  messageWindowStart: number;
  invalidMessages: number;
};

type OrbitMessage = {
  type: string;
  data?: unknown;
};

const peers = new Map<OrbitPeer, PeerState>();

function closePeer(peer: OrbitPeer, code: number, reason: string) {
  peers.delete(peer);
  peer.close(code, reason);
}

function sendError(peer: OrbitPeer, message: string) {
  peer.send(
    JSON.stringify({
      type: 'error',
      data: {
        message,
      },
    }),
  );
}

function isOrbitMessage(payload: unknown): payload is OrbitMessage {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  if (!('type' in payload)) {
    return false;
  }

  return typeof payload.type === 'string';
}

const _heartbeatTimer = setInterval(() => {
  const now = Date.now();

  for (const [peer, state] of peers) {
    if (now - state.lastSeen > clientTimeout) {
      if (import.meta.dev) {
        console.log('[WS] Terminating inactive client');
      }

      closePeer(peer, 1000, 'Heartbeat timeout');
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
      messageCount: 0,
      messageWindowStart: Date.now(),
      invalidMessages: 0,
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
      closePeer(peer, 1008, 'Unknown connection');
      return;
    }

    const now = Date.now();
    const text = message.text();

    if (text.length > maxMessageSize) {
      if (import.meta.dev) {
        console.warn('[WS] Message rejected: too large');
      }

      closePeer(peer, 1009, 'Message too large');
      return;
    }

    if (now - state.messageWindowStart >= 1000) {
      state.messageCount = 0;
      state.messageWindowStart = now;
    }

    state.messageCount++;

    if (state.messageCount > maxMessagesPerSecond) {
      if (import.meta.dev) {
        console.warn('[WS] Rate limit exceeded');
      }
      closePeer(peer, 1008, 'Rate limit exceeded');
      return;
    }

    let payload: unknown;

    try {
      payload = JSON.parse(text);
    } catch {
      state.invalidMessages++;

      sendError(peer, 'Invalid JSON.');

      if (state.invalidMessages >= maxInvalidMessages) {
        closePeer(peer, 1008, 'Too many invalid messages');
      }

      return;
    }

    // Any valid messages reset the invalid-message counter. THIS IMPLEMENTATION COULD BE RISKY AND ALLOW FOR ATTACKS!!
    // We may want to change this to use a bucket based system in the future
    state.invalidMessages = 0;

    if (!isOrbitMessage(payload)) {
      state.invalidMessages++;

      sendError(peer, 'Invalid message format.');

      if (state.invalidMessages >= maxInvalidMessages) {
        closePeer(peer, 1008, 'Too many invalid messages');
      }

      return;
    }

    if (payload.type === 'pong') {
      state.lastSeen = now;
      return;
    }

    const clientEventTypes = new Set(['pong', 'subscribe', 'unsubscribe']);

    if (!clientEventTypes.has(payload.type)) {
      state.invalidMessages++;
      sendError(peer, 'Unknown event type.');
      if (state.invalidMessages >= maxInvalidMessages) {
        closePeer(peer, 1008, 'Too many invalid messages');
      }
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
