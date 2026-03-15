// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json());

let rooms = {};

const setupRoutes = require('./routes/index');
setupRoutes(app, rooms);

const io = new Server(server, { cors: { origin: "*" } });
io.on("connection", (socket) => {
 
  socket.on("join-gd-room", ({ roomCode }) => socket.join(roomCode));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Modular Hub running on port ${PORT}`));