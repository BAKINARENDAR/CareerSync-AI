const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

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
  allowedHeaders: ["Content-Type"],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options("/*all", cors(corsOptions));
app.use(express.json());

const io = new Server(server, { cors: corsOptions });
const PORT = process.env.PORT || 5000;

// Global Rooms Object for GD state
let rooms = {};

// --- IMPORT YOUR SEPARATED ROUTES ---
const hrRoutes = require('./routes/hr');
const techRoutes = require('./routes/tech');
const gdRoutes = require('./routes/gd')(rooms); // Pass rooms object

// --- MOUNT THE ROUTES ---
app.use('/api', hrRoutes);     // Handles /api/analyze
app.use('/api', techRoutes);   // Handles /api/analyze-thought & /api/analyze-concept
app.use('/api/gd', gdRoutes);  // Handles /api/gd/create-room & /api/gd/get-livekit-token

// Health Checks
app.get("/", (req, res) => res.json({ message: "CareerSync AI Hub is live!" }));
app.get("/api/health", (req, res) => res.json({ status: "Backend running!" }));

// --- GD AI FEEDBACK FUNCTION ---
async function generateGDAIFeedback(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.transcript.length === 0) return "Not enough discussion data to generate feedback.";

  const script = room.transcript.map(t => `${t.name}: ${t.text}`).join('\n');
  const prompt = `You are an expert HR Recruiter analyzing a Group Discussion.
  Topic: ${room.topic}
  Transcript:\n${script}\n
  Provide brief, constructive feedback for each participant based on communication skills, logic, and contribution.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3-8b-8192", messages: [{ role: "user", content: prompt }] })
    });
    const data = await response.json();
    if (!response.ok) return `Error from AI service: ${data.error?.message}`;
    return data.choices && data.choices.length > 0 ? data.choices[0].message.content : "Empty response.";
  } catch (error) {
    return "Failed to connect to AI service.";
  }
}

// --- SOCKET.IO FOR GD REAL-TIME ---
io.on("connection", (socket) => {
  socket.on("join-gd-room", ({ roomCode, participantName }) => {
    const room = rooms[roomCode];
    if (!room || !room.active) return socket.emit("error", { message: "Room not found or ended" });
    
    socket.join(roomCode);
    io.to(roomCode).emit("participant-joined", { name: participantName, timestamp: new Date().toISOString() });
    if (room.isStarted) socket.emit("gd-started");
  });

  socket.on("start-gd", (roomCode) => {
    if (rooms[roomCode]) {
      rooms[roomCode].isStarted = true;
      io.to(roomCode).emit("gd-started");
    }
  });

  socket.on("interim-transcript", ({ roomCode, name, text }) => {
    if (rooms[roomCode]) io.to(roomCode).emit("live-interim", { name, text });
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
      const feedback = await generateGDAIFeedback(roomCode);
      io.to(roomCode).emit("gd-feedback", feedback);
    }
  });
});

// Cleanup old rooms
setInterval(() => {
  const now = Date.now();
  for (const code in rooms) {
    if (now - rooms[code].createdAt > 60 * 60 * 1000) { 
      io.to(code).emit("gd-ended", { message: "Room expired" });
      delete rooms[code];
    }
  }
}, 10 * 60 * 1000);

server.listen(PORT, () => console.log(`Modular Server running on port ${PORT}`));