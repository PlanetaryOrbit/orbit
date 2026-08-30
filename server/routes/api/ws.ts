import type { ApiResponse } from '~~/server/utils/types';

const heartbeatInterval = 120000; // 2 minutes - interval between heartbeat pings
const clientTimeout = heartbeatInterval + 30000; // 30 seconds - time before a client is considered inactive (after the heartbeat interval)
const maxMessageSize = 65536; // Maximum message size in bytes
const maxMessagesPerSecond = 50; // Maximum number of messages per second
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

type OrbitResponse<T> = ApiResponse<T>;

const peers = new Map<OrbitPeer, PeerState>();

const clientEventTypes = new Set(['pong', 'subscribe', 'unsubscribe']);

function closePeer(peer: OrbitPeer, code: number, reason: string) {
  peers.delete(peer);
  peer.close(code, reason);
}

function sendError(peer: OrbitPeer, code: string, message: string) {
  const response: OrbitResponse<never> = {
    success: false,
    error: {
      code,
      message,
    },
  };

  peer.send(
    JSON.stringify({
      type: 'error',
      data: response.error,
    }),
  );
}

function sendMessage<T>(peer: OrbitPeer, type: string, data: T) {
  const response: OrbitResponse<T> = {
    success: true,
    data,
  };

  peer.send(
    JSON.stringify({
      type,
      data: response.data,
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

function registerInvalidMessage(peer: OrbitPeer, state: PeerState, code: string, message: string) {
  state.invalidMessages++;

  sendError(peer, code, message);

  if (state.invalidMessages >= maxInvalidMessages) {
    closePeer(peer, 1008, 'Too many invalid messages');
  }
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

    sendMessage(peer, 'ping', {
      timestamp: new Date().toISOString(),
    });
  }
}, heartbeatInterval);

export default defineWebSocketHandler({
  open(peer) {
    const now = Date.now();

    peers.set(peer, {
      lastSeen: now,
      messageCount: 0,
      messageWindowStart: now,
      invalidMessages: 0,
    });

    if (import.meta.dev) {
      console.log('[WS] Client connected');
    }

    sendMessage(peer, 'connected', {
      message: 'Hello World!',
    });
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
      registerInvalidMessage(peer, state, 'INVALID_JSON', 'Invalid JSON.');
      return;
    }

    if (!isOrbitMessage(payload)) {
      registerInvalidMessage(peer, state, 'INVALID_MESSAGE', 'Invalid message format.');
      return;
    }

    if (!clientEventTypes.has(payload.type)) {
      registerInvalidMessage(peer, state, 'UNKNOWN_EVENT', 'Unknown event type.');
      return;
    }

    // Any valid messages reset the invalid-message counter. THIS IMPLEMENTATION COULD BE RISKY AND ALLOW FOR ATTACKS!!
    // We may want to change this to use a bucket based system in the future
    state.invalidMessages = 0;

    if (payload.type === 'pong') {
      state.lastSeen = now;
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
