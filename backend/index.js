const app = require("./app");
const http = require("node:http");
const initializeChatSocket = require("./src/services/chatSocketService");
const {
  startWelcomeEmailWorker,
} = require("./src/services/welcomeEmailOutboxService");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initializeChatSocket(server, app);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startWelcomeEmailWorker();
});
