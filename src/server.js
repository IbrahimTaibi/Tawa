const mongoose = require("mongoose");
const app = require("./app");
const SocketServer = require("./socket/socketServer");
require("dotenv").config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected");
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Initialize Socket.IO server
    const socketServer = new SocketServer(server);

    // Make socket server available globally for other modules
    global.socketServer = socketServer;

    console.log("WebSocket server initialized");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
