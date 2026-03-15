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
let micLocks = {}; // Tracks who currently holds the mic

const setupRoutes = require('./routes/index');
setupRoutes(app, rooms);

const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  
  socket.on("join-gd-room", ({ roomCode }) => {
      socket.join(roomCode);
      // Tell the new user who holds the mic (if anyone)
      socket.emit("mic-update", { currentSpeaker: micLocks[roomCode] || null });
  });

  socket.on("start-gd", (roomCode) => {
      if (rooms[roomCode]) rooms[roomCode].isStarted = true;
      io.to(roomCode).emit("gd-started"); 
  });

  socket.on("gd-message", (data) => {
      io.to(data.roomCode).emit("gd-new-message", data);
  });

  // --- STRICT MIC BATON LOGIC ---
  socket.on("claim-mic", ({ roomCode, name }) => {
      // Only give it if it's currently free
      if (!micLocks[roomCode]) {
          micLocks[roomCode] = name;
          io.to(roomCode).emit("mic-update", { currentSpeaker: name });
      }
  });

  socket.on("release-mic", ({ roomCode }) => {
      micLocks[roomCode] = null; // Free the mic
      io.to(roomCode).emit("mic-update", { currentSpeaker: null });
  });

  // If a user disconnects abruptly while holding the mic, free it
  socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
          if (micLocks[room]) {
              micLocks[room] = null;
              io.to(room).emit("mic-update", { currentSpeaker: null });
          }
      }
  });

});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Modular Hub running on port ${PORT}`));