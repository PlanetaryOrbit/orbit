import { createServer } from "node:http";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { broadcast, setupWebSocket } from "@/utils/websocket";

const server = createServer();
const cleanup = setupWebSocket(server);

let port: number;

const sockets = new Set<WebSocket>();

function createMessageQueue(socket: WebSocket) {
  const messages: unknown[] = [];
  const waiters: Array<(message: unknown) => void> = [];

  socket.on("message", (data) => {
    let message: unknown;

    try {
      message = JSON.parse(data.toString());
    } catch {
      message = data.toString();
    }

    const waiter = waiters.shift();

    if (waiter) {
      waiter(message);
    } else {
      messages.push(message);
    }
  });

  return {
    next(): Promise<unknown> {
      const message = messages.shift();

      if (message !== undefined) {
        return Promise.resolve(message);
      }

      return new Promise((resolve) => {
        waiters.push(resolve);
      });
    },
  };
}

function connect(path = "/api/ws") {
  return new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`);

    sockets.add(socket);

    socket.once("open", () => {
      resolve(socket);
    });

    socket.once("error", reject);

    socket.once("close", () => {
      sockets.delete(socket);
    });
  });
}

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Failed to get server address"));
        return;
      }

      port = address.port;
      resolve();
    });
  });
});

afterAll(() => {
  for (const socket of sockets) {
    socket.terminate();
  }

  sockets.clear();

  cleanup();

  server.close();
});

describe("WebSocket", () => {
  test("accepts connections on /api/ws", async () => {
    const socket = await connect();

    expect(socket.readyState).toBe(WebSocket.OPEN);

    socket.terminate();
  });

  test("sends a connected event", async () => {
    const socket = await connect();
    const messages = createMessageQueue(socket);

    expect(messages.next()).resolves.toEqual({
      type: "connected",
      data: {
        message: "Hello World!",
      },
    });

    socket.terminate();
  });

  test("broadcasts messages to connected clients", async () => {
    const first = await connect();
    const firstMessages = createMessageQueue(first);

    const second = await connect();
    const secondMessages = createMessageQueue(second);

    expect(firstMessages.next()).resolves.toEqual({
      type: "connected",
      data: {
        message: "Hello World!",
      },
    });

    expect(secondMessages.next()).resolves.toEqual({
      type: "connected",
      data: {
        message: "Hello World!",
      },
    });

    broadcast({
      type: "test",
      data: {
        message: "Hello from Orbit!",
      },
    });

    expect(firstMessages.next()).resolves.toEqual({
      type: "test",
      data: {
        message: "Hello from Orbit!",
      },
    });

    expect(secondMessages.next()).resolves.toEqual({
      type: "test",
      data: {
        message: "Hello from Orbit!",
      },
    });

    first.terminate();
    second.terminate();
  });

  test("broadcasts only to open clients", async () => {
    const socket = await connect();
    const messages = createMessageQueue(socket);

    expect(messages.next()).resolves.toEqual({
      type: "connected",
      data: {
        message: "Hello World!",
      },
    });

    socket.terminate();

    expect(() => {
      broadcast({
        type: "test",
        data: {
          message: "This should not crash",
        },
      });
    }).not.toThrow();
  });

  test("supports multiple messages", async () => {
    const socket = await connect();
    const messages = createMessageQueue(socket);

    expect(messages.next()).resolves.toEqual({
      type: "connected",
      data: {
        message: "Hello World!",
      },
    });

    broadcast({
      type: "first",
      data: "one",
    });

    expect(messages.next()).resolves.toEqual({
      type: "first",
      data: "one",
    });

    broadcast({
      type: "second",
      data: "two",
    });

    expect(messages.next()).resolves.toEqual({
      type: "second",
      data: "two",
    });

    socket.terminate();
  });

  test("responds to WebSocket ping frames", async () => {
    const socket = await connect();
    const messages = createMessageQueue(socket);

    expect(messages.next()).resolves.toEqual({
      type: "connected",
      data: {
        message: "Hello World!",
      },
    });

    const pong = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timed out waiting for pong"));
      }, 5_000);

      socket.once("pong", () => {
        clearTimeout(timeout);
        resolve();
      });

      socket.once("error", reject);
    });

    socket.ping();

    expect(pong).resolves.toBeUndefined();

    socket.terminate();
  });
});
