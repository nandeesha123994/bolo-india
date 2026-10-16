const app = require("./app");
const {
  startWelcomeEmailWorker,
} = require("./src/services/welcomeEmailOutboxService");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startWelcomeEmailWorker();
});
