import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { logger } from "./logger";

interface WsClient {
  ws: WebSocket;
  tenantId: number | null;
}

const clients: Set<WsClient> = new Set();

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const client: WsClient = { ws, tenantId: null };
    clients.add(client);

    logger.info({ url: req.url }, "WS client connected");

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "subscribe" && typeof msg.tenantId === "number") {
          client.tenantId = msg.tenantId;
          logger.info({ tenantId: msg.tenantId }, "WS client subscribed to tenant");
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => {
      clients.delete(client);
      logger.info("WS client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WS client error");
      clients.delete(client);
    });
  });

  logger.info("WebSocket server initialized at /ws");
}

export function broadcast(tenantId: number, message: unknown): void {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.tenantId === tenantId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}
