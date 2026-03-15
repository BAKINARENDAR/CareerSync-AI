// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const { AccessToken } = require("livekit-server-sdk");

const app = express();
const server = http.createServer(app);

// CORS configuration
// CORS configuration
const corsOptions = {
  origin: [
    "https://careersync-client.onrender.com",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",   // Added your new local port
    "http://127.0.0.2:5501",   // Added your specific Live Server IP
    "http://127.0.0.1:5501"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options("/*all", cors(corsOptions));
app.use(express.json());

const io = new Server(server, { cors: corsOptions });
const PORT = process.env.PORT || 5000;

// Corrected LiveKit credentials
const LIVEKIT_API_KEY    = process.env.LIVEKIT_API_KEY    || 'APIJQKhWwe3cEzs';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'dgWkNj05gSLEsV2FvcnFmr1GubBgTfXY3YZ0rO8RBEB';
const LIVEKIT_WS_URL     = process.env.LIVEKIT_WS_URL     || 'wss://careersyncai-5761xc62.livekit.cloud';

// --- ADDED FOR GD FEATURES: Groq API Key ---
const GROQ_API_KEY       = process.env.GROQ_API_KEY;

let rooms = {};  

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

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

app.post("/api/gd/create-room", (req, res) => {
  const { topic } = req.body;  

  const roomCode = generateRoomCode();

  rooms[roomCode] = {
    topic: topic || "Is Artificial Intelligence replacing human jobs?",
    createdAt: Date.now(),
    active: true,
    // --- ADDED FOR GD FEATURES: Tracking state and transcripts ---
    isStarted: false,
    transcript: [] 
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

// Fixed async function and await for the token
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
      identity: participantName,   
      ttl: "2h"                    
    });

    at.addGrant({
      roomJoin: true,
      room: roomCode,              
      canPublish: true,            
      canSubscribe: true,          
      canPublishData: true         
    });

    // Await added here
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

// --- ADDED FOR GD FEATURES: AI Feedback Generator ---
async function generateAIFeedback(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.transcript.length === 0) return "Not enough discussion data to generate feedback.";

  const script = room.transcript.map(t => `${t.name}: ${t.text}`).join('\n');
  const prompt = `You are an expert HR Recruiter analyzing a Group Discussion.
  Topic: ${room.topic}
  
  Transcript:
  ${script}
  
  Please provide brief, constructive feedback for each participant based on their communication skills, logic, and contribution. Keep it encouraging but professional.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", 
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Groq Error:", error);
    return "Error generating AI feedback. Please try again later.";
  }
}

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("join-gd-room", ({ roomCode, participantName }) => {
    const room = rooms[roomCode];
    if (!room || !room.active) {
      socket.emit("error", { message: "Room not found or has ended" });
      return;
    }

    socket.join(roomCode);
    console.log(`${participantName} joined GD room ${roomCode}`);

    io.to(roomCode).emit("participant-joined", {
      name: participantName,
      timestamp: new Date().toISOString()
    });

    socket.emit("room-info", {
      topic: room.topic,
      message: "Connected to voice discussion – enable your microphone"
    });

    // --- ADDED FOR GD FEATURES: Notify late joiners if GD is running ---
    if (room.isStarted) {
      socket.emit("gd-started");
    }
  });

  // --- ADDED FOR GD FEATURES: Socket events for GD flow ---
  socket.on("start-gd", (roomCode) => {
    if (rooms[roomCode]) {
      rooms[roomCode].isStarted = true;
      io.to(roomCode).emit("gd-started");
    }
  });

  socket.on("new-transcript", ({ roomCode, name, text }) => {
    if (rooms[roomCode]) {
      rooms[roomCode].transcript.push({ name, text });
      io.to(roomCode).emit("live-subtitle", { name, text });
    }
  });

  socket.on("end-gd", async (roomCode) => {
    if (rooms[roomCode]) {
      rooms[roomCode].isStarted = false;
      io.to(roomCode).emit("gd-ended"); 

      io.to(roomCode).emit("analyzing-feedback");
      const feedback = await generateAIFeedback(roomCode);
      io.to(roomCode).emit("gd-feedback", feedback);
    }
  });
  // ---------------------------------------------------------

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const code in rooms) {
    const age = now - rooms[code].createdAt;
    if (age > 60 * 60 * 1000) { 
      rooms[code].active = false;
      io.to(code).emit("gd-ended", { message: "Room has expired" });
      delete rooms[code];
      console.log(`Cleaned up expired room: ${code}`);
    }
  }
}, 10 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`CareerSync AI server running on port ${PORT}`);
});