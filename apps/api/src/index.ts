import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadApiConfig } from "./config.js";

const config = loadApiConfig();

serve(
  {
    fetch: createApp().fetch,
    hostname: config.hostname,
    port: config.port
  },
  (info) => {
    console.log(`VanStro API listening on http://${info.address}:${info.port}`);
  }
);
