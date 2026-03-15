// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Merged CORS configuration for all modules
const corsOptions = {
  origin: [
    "https://careersync-client.onrender.com",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",   
    "http://127.0.0.2:5501",   
    "http://127.0.0.1:5501",
    "*"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options("/*all", cors(corsOptions));
app.use(express.json());

// Global State for GD Room Management
let rooms = {};

// ==========================================
// IMPORT & SETUP MODULAR ROUTES
// ==========================================
// This points to your routes/index.js which handles HR, Technical, and GD
const setupRoutes = require('./routes/index');
setupRoutes(app, rooms);

// Basic Health Checks
app.get("/", (req, res) => res.json({ message: "CareerSync AI Hub is live!" }));
app.get("/api/health", (req, res) => res.json({ status: "Backend running!" }));

// ==========================================
// SOCKET.IO HUB (GD Real-time Logic)
// ==========================================
const io = new Server(server, { cors: corsOptions });

// AI Feedback Helper Function for GD
async function generateGDAIFeedback(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.transcript.length === 0) return "Not enough discussion data to generate feedback.";

  const script = room.transcript.map(t => `${t.name}: ${t.text}`).join('\n');
  const prompt = `You are an expert HR Recruiter. Analyze this GD Transcript on the topic: ${room.topic}. Provide brief, constructive feedback for each participant.\n\nTranscript:\n${script}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3-8b-8192", messages: [{ role: "user", content: prompt }] })
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "AI evaluation unavailable.";
  } catch (error) {
    console.error("GD AI Error:", error);
    return "Failed to connect to AI feedback service.";
  }
}

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // GD Join Event
  socket.on("join-gd-room", ({ roomCode, participantName }) => {
    const room = rooms[roomCode];
    if (!room || !room.active) return socket.emit("error", { message: "Room not found" });
    
    socket.join(roomCode);
    io.to(roomCode).emit("participant-joined", { name: participantName, timestamp: new Date().toISOString() });
    if (room.isStarted) socket.emit("gd-started");
  });

  // GD Start Sync
  socket.on("start-gd", (roomCode) => {
    if (rooms[roomCode]) {
      rooms[roomCode].isStarted = true;
      io.to(roomCode).emit("gd-started");
    }
  });

  // GD Live Transcripts (Interim)
  socket.on("interim-transcript", ({ roomCode, name, text }) => {
    if (rooms[roomCode]) io.to(roomCode).emit("live-interim", { name, text });
  });

  // GD Final Sentence Transcripts
  socket.on("new-transcript", ({ roomCode, name, text }) => {
    if (rooms[roomCode]) {
      rooms[roomCode].transcript.push({ name, text });
      io.to(roomCode).emit("live-subtitle", { name, text });
    }
  });

  // GD End & AI Analysis
  socket.on("end-gd", async (roomCode) => {
    if (rooms[roomCode]) {
      rooms[roomCode].isStarted = false;
      io.to(roomCode).emit("gd-ended"); 
      io.to(roomCode).emit("analyzing-feedback");
      const feedback = await generateGDAIFeedback(roomCode);
      io.to(roomCode).emit("gd-feedback", feedback);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Auto-cleanup of expired rooms (1 hour)
setInterval(() => {
  const now = Date.now();
  for (const code in rooms) {
    if (now - rooms[code].createdAt > 60 * 60 * 1000) { 
      delete rooms[code];
    }
  }
}, 10 * 60 * 1000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`CareerSync Modular Server running on port ${PORT}`);
});