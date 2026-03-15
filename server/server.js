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

// Setup Modular Routes
const setupRoutes = require('./routes/index');
setupRoutes(app, rooms);

// --- SOCKET.IO REAL-TIME LOGIC ---
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  
  // 1. Join Room
  socket.on("join-gd-room", ({ roomCode, participantName }) => {
      socket.join(roomCode);
      console.log(`${participantName || 'A user'} joined room: ${roomCode}`);
  });

  // 2. Start Discussion (Syncs the timer for everyone)
  socket.on("start-gd", (roomCode) => {
      if (rooms[roomCode]) {
          rooms[roomCode].isStarted = true;
      }
      io.to(roomCode).emit("gd-started"); 
  });

  // 3. Broadcast Transcripts (Syncs speech text for everyone)
  socket.on("gd-message", (data) => {
      io.to(data.roomCode).emit("gd-new-message", data);
  });

  // 4. Hand Raise Feature
  socket.on("raise-hand", (data) => {
      io.to(data.roomCode).emit("gd-hand-raised", data);
  });

});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Modular Hub running on port ${PORT}`));