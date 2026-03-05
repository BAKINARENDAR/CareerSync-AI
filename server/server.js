const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// CORS - allow your frontend + localhost
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
app.options("*", cors(corsOptions));

app.use(express.json());

const io = new Server(server, { cors: corsOptions });

const PORT = process.env.PORT || 5000;
const resend = new Resend(process.env.RESEND_API_KEY);

let rooms = {};
let emailCodes = {};
let speakingStats = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "Backend running!",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({ message: "CareerSync AI Backend is live!" });
});

// CREATE ROOM
app.post("/api/create-room", (req, res) => {
  const code = generateRoomCode();
  rooms[code] = {
    members: [],
    topic: "Is Artificial Intelligence replacing human jobs?",
    duration: 300,
    startTime: null,
    timerInterval: null,
    active: true
  };
  console.log(`Room created: ${code}`);
  res.json({ success: true, roomCode: code });
});

// GET ROOM INFO
app.get("/api/room/:code", (req, res) => {
  const room = rooms[req.params.code];
  if (!room || !room.active) {
    return res.status(404).json({ success: false, message: "Room not found or ended" });
  }
  res.json({
    success: true,
    members: room.members,
    topic: room.topic,
    duration: room.duration
  });
});

// SEND CODE - Using Resend
app.post("/api/send-code", async (req, res) => {
  const { email, roomCode } = req.body;

  if (!email || !roomCode) {
    return res.status(400).json({ success: false, message: "Missing email or roomCode" });
  }

  const room = rooms[roomCode];
  if (!room || !room.active) {
    return res.status(404).json({ success: false, message: "Room not found or ended" });
  }

  if (room.members.length >= 4) {
    return res.status(400).json({ success: false, message: "Room is full" });
  }

  if (room.members.some(m => m.email === email)) {
    return res.status(400).json({ success: false, message: "You already joined this room" });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  emailCodes[email] = { code, roomCode };

  try {
    await resend.emails.send({
      from: "CareerSync AI <onboarding@resend.dev>", // Resend's default sender
      to: email,
      subject: "CareerSync GD Verification Code",
      text: `Your verification code is: ${code}\n\nRoom Code: ${roomCode}\nValid for 10 minutes.`,
      html: `
        <h2>CareerSync AI</h2>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>Room Code: ${roomCode}</p>
        <p>This code expires in 10 minutes.</p>
        <small>If you didn't request this, ignore this email.</small>
      `
    });

    console.log(`OTP sent to ${email} for room ${roomCode}`);
    res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("Resend email error:", err.message);
    console.error("Full error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please check server logs.",
      errorDetail: err.message
    });
  }
});

// VERIFY CODE
app.post("/api/verify-code", (req, res) => {
  const { email, enteredCode } = req.body;
  const record = emailCodes[email];

  if (!record || record.code !== enteredCode) {
    return res.status(400).json({ success: false, message: "Invalid or expired code" });
  }

  const room = rooms[record.roomCode];
  if (!room || !room.active) {
    return res.status(404).json({ success: false, message: "Room not found or ended" });
  }

  if (room.members.some(m => m.email === email)) {
    return res.status(400).json({ success: false, message: "Already joined" });
  }

  if (room.members.length >= 4) {
    return res.status(400).json({ success: false, message: "Room full" });
  }

  const member = {
    email,
    joinedAt: new Date().toISOString(),
    isSpeaking: false
  };

  room.members.push(member);
  console.log(`Member joined: ${email} → Room ${record.roomCode} now ${room.members.length}/4`);

  speakingStats[email] = { speakingTime: 0, turns: 0, lastStart: null };

  if (room.members.length === 4) {
    startGD(record.roomCode);
  }

  delete emailCodes[email];

  io.to(record.roomCode).emit("roomData", {
    topic: room.topic,
    members: room.members
  });

  res.json({ success: true, roomCode: record.roomCode, email });
});

// SOCKET.IO
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  socket.on("join-room", ({ roomCode, email }) => {
    console.log(`[JOIN] ${email} trying to join ${roomCode}`);

    const room = rooms[roomCode];
    if (!room || !room.active) {
      socket.emit("error", { message: "Room not found or ended" });
      return;
    }

    socket.join(roomCode);
    console.log(`[JOIN] Success: ${email} in ${roomCode}`);

    socket.emit("roomData", {
      topic: room.topic,
      members: room.members
    });
  });

  socket.on("start-speaking", ({ roomCode, email }) => {
    const room = rooms[roomCode];
    if (room) {
      const member = room.members.find(m => m.email === email);
      if (member) member.isSpeaking = true;
      io.to(roomCode).emit("roomData", { topic: room.topic, members: room.members });
    }
  });

  socket.on("stop-speaking", ({ roomCode, email }) => {
    const room = rooms[roomCode];
    if (room) {
      const member = room.members.find(m => m.email === email);
      if (member) member.isSpeaking = false;
      io.to(roomCode).emit("roomData", { topic: room.topic, members: room.members });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// START GD TIMER
function startGD(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.startTime) return;

  room.startTime = Date.now();
  console.log(`GD started in room ${roomCode}`);

  room.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - room.startTime) / 1000);
    const remaining = room.duration - elapsed;
    io.to(roomCode).emit("timer-update", remaining);

    if (remaining <= 0) {
      clearInterval(room.timerInterval);
      io.to(roomCode).emit("gd-ended");
      room.active = false;
    }
  }, 1000);
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});