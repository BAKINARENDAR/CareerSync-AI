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
let micLocks = {}; // Tracks who currently holds the mic in each room
let handRaises = {}; // Tracks the queue of people waiting for the mic

const setupRoutes = require('./routes/index');
setupRoutes(app, rooms);

// --- SOCKET.IO REAL-TIME LOGIC ---
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  
  socket.on("join-gd-room", ({ roomCode, participantName }) => {
      socket.join(roomCode);
      if (!handRaises[roomCode]) handRaises[roomCode] = [];
      // Tell the new user who currently has the mic
      socket.emit("mic-update", { currentSpeaker: micLocks[roomCode], queue: handRaises[roomCode] });
  });

  socket.on("start-gd", (roomCode) => {
      if (rooms[roomCode]) rooms[roomCode].isStarted = true;
      io.to(roomCode).emit("gd-started"); 
  });

  socket.on("gd-message", (data) => {
      io.to(data.roomCode).emit("gd-new-message", data);
  });

  // --- THE "BATON" MIC LOGIC ---
  socket.on("claim-mic", ({ roomCode, name }) => {
      // If mic is free, give it to them
      if (!micLocks[roomCode]) {
          micLocks[roomCode] = name;
          // Remove them from the hand raise queue if they were in it
          if (handRaises[roomCode]) {
              handRaises[roomCode] = handRaises[roomCode].filter(n => n !== name);
          }
          io.to(roomCode).emit("mic-update", { currentSpeaker: name, queue: handRaises[roomCode] });
      }
  });

  socket.on("release-mic", ({ roomCode }) => {
      micLocks[roomCode] = null;
      // Check if someone is waiting in line
      if (handRaises[roomCode] && handRaises[roomCode].length > 0) {
          const nextSpeaker = handRaises[roomCode].shift(); // Pull first person from queue
          micLocks[roomCode] = nextSpeaker;
      }
      io.to(roomCode).emit("mic-update", { currentSpeaker: micLocks[roomCode], queue: handRaises[roomCode] });
  });

  socket.on("raise-hand", ({ roomCode, name }) => {
      if (!handRaises[roomCode]) handRaises[roomCode] = [];
      // Add to queue if they aren't already in it, and don't already hold the mic
      if (!handRaises[roomCode].includes(name) && micLocks[roomCode] !== name) {
          handRaises[roomCode].push(name);
      }
      io.to(roomCode).emit("hand-queue-update", { queue: handRaises[roomCode] });
  });

});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Modular Hub running on port ${PORT}`));