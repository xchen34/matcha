require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the existing server process before starting a new one.`
    );
    process.exit(1);
  }

  console.error("Server failed to start:", error);
  process.exit(1);
});
