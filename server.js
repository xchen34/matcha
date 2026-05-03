require("dotenv").config();
const http = require("http");
const app = require("./app");
const { initRealtime } = require("./realtime");
const { ensureChatVisibilityTables } = require("./scripts/ensureChatVisibilityTables");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

initRealtime(server);

async function start() {
  await ensureChatVisibilityTables();

  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
start();