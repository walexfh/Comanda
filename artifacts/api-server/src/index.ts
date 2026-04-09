import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { setupWebSocket } from "./lib/ws";
import { initDb } from "./lib/init-db";

const rawPort = process.env["PORT"] || "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  logger.warn(`Invalid PORT value: "${rawPort}", defaulting to 8080`);
}


const server = createServer(app);
setupWebSocket(server);

initDb().then(() => {
  server.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}).catch((err) => {
  logger.error({ err }, "Failed to initialize database, starting anyway");
  server.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
});

server.on("error", (err) => {
  logger.error({ err }, "Server error");
  process.exit(1);
});
