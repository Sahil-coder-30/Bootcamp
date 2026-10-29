import { createApp } from "./app.js";
import { startTelegramBot, stopTelegramBot } from "./bot/index.js";
import { env } from "./config/env.js";

const server = createApp().listen(env.port, () => {
  console.log(`[backend] listening on http://localhost:${env.port}`);
  void startTelegramBot();
});

// Stop polling before exiting, so a restarted backend does not collide with its previous self (409).
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void stopTelegramBot().finally(() => server.close(() => process.exit(0)));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
