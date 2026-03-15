// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const { AccessToken } = require("livekit-server-sdk");

const app = express();
const server = http.createServer(app);

// CORS configuration (your original settings)
const corsOptions = {
  origin: [
    "https://careersync-client.onrender.com",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "*"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Fix for Express 5 wildcard issue
app.options("/*all", cors(corsOptions));

app.use(express.json());

const io = new Server(server, { cors: corsOptions });

const PORT = process.env.PORT || 5000;

// LiveKit credentials – MUST be in .env on production!
const LIVEKIT_API_KEY    = process.env.LIVEKIT_API_KEY    || 'APIJQKhWwecEzs';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'dgWkNj05gSLEsV2FvcnFmr1GubBgTfXY3YZOr08RBEB';
const LIVEKIT_WS_URL     = process.env.LIVEKIT_WS_URL     || 'wss://careersync-ai-5761xc62.livekit.cloud';

// In-memory storage for active GD rooms
let rooms = {};  // { roomCode: { topic, createdAt, active: true } }

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ────────────────────────────────────────────────
// Health check endpoints (unchanged)
app.get("/api/health", (req, res) => {
  res.json({
    status: "Backend running!",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.json({ message: "CareerSync AI Backend is live!" });
});

// ────────────────────────────────────────────────
// GD: Create a new discussion room
app.post("/api/gd/create-room", (req, res) => {
  const { topic } = req.body;  // optional: client can send custom topic

  const roomCode = generateRoomCode();

  rooms[roomCode] = {
    topic: topic || "Is Artificial Intelligence replacing human jobs?",
    createdAt: Date.now(),
    active: true
  };

  console.log(`New GD room created: ${roomCode} | Topic: ${rooms[roomCode].topic}`);

  res.json({
    success: true,
    roomCode,
    wsUrl: LIVEKIT_WS_URL,
    topic: rooms[roomCode].topic,
    message: "Share this code with others to join the voice discussion"
  });
});

// ────────────────────────────────────────────────
// GD: Generate LiveKit access token for a participant
// FIXED: Added 'async' to the route handler
app.post("/api/gd/get-livekit-token", async (req, res) => {
  const { roomCode, participantName } = req.body;

  if (!roomCode || !participantName) {
    return res.status(400).json({ 
      success: false, 
      message: "roomCode and participantName are required" 
    });
  }

  const room = rooms[roomCode];
  if (!room || !room.active) {
    return res.status(404).json({ 
      success: false, 
      message: "Room not found or has ended" 
    });
  }

  try {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantName,   // This will be displayed as participant name
      ttl: "2h"                    // Token valid for 2 hours
    });

    at.addGrant({
      roomJoin: true,
      room: roomCode,              // LiveKit room name = your room code
      canPublish: true,            // Can speak (publish audio)
      canSubscribe: true,          // Can hear others
      canPublishData: true         // Optional: for text chat / data later
    });

    // FIXED: Added 'await' before at.toJwt()
    const token = await at.toJwt();

    res.json({
      success: true,
      token,
      wsUrl: LIVEKIT_WS_URL,
      roomCode,
      topic: room.topic
    });
  } catch (err) {
    console.error("LiveKit token generation failed:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Failed to generate access token" 
    });
  }
});

// ────────────────────────────────────────────────
// Socket.IO connection handling (minimal for now)
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Client joins the room (for notifications / future features)
  socket.on("join-gd-room", ({ roomCode, participantName }) => {
    const room = rooms[roomCode];
    if (!room || !room.active) {
      socket.emit("error", { message: "Room not found or has ended" });
      return;
    }

    socket.join(roomCode);
    console.log(`${participantName} joined GD room ${roomCode}`);

    // Notify others in the room
    io.to(roomCode).emit("participant-joined", {
      name: participantName,
      timestamp: new Date().toISOString()
    });

    socket.emit("room-info", {
      topic: room.topic,
      message: "Connected to voice discussion – enable your microphone"
    });
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// ────────────────────────────────────────────────
// Optional: Clean up old/inactive rooms every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const code in rooms) {
    const age = now - rooms[code].createdAt;
    if (age > 60 * 60 * 1000) { // 1 hour timeout
      rooms[code].active = false;
      io.to(code).emit("gd-ended", { message: "Room has expired" });
      delete rooms[code];
      console.log(`Cleaned up expired room: ${code}`);
    }
  }
}, 10 * 60 * 1000);

// Start the server
server.listen(PORT, () => {
  console.log(`CareerSync AI server running on port ${PORT}`);
});