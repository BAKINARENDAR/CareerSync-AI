const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5500", "http://127.0.0.1:5500", "*"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());

let rooms = {};
let emailCodes = {};
let speakingStats = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase().toUpperCase();
}

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

// GET ROOM
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

// EMAIL SETUP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// SEND CODE
app.post("/api/send-code", async (req, res) => {
  const { email, roomCode } = req.body;
  const room = rooms[roomCode];
  if (!room || !room.active) return res.status(404).json({ success: false, message: "Room not found" });

  if (room.members.length >= 4) return res.status(400).json({ success: false, message: "Room full" });
  if (room.members.some(m => m.email === email)) return res.status(400).json({ success: false, message: "Already joined" });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  emailCodes[email] = { code, roomCode };

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "CareerSync GD Code",
      text: `Code: ${code}\nRoom: ${roomCode}`
    });
    console.log(`OTP sent to ${email} for room ${roomCode}`);
    res.json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ success: false, message: "Email send failed" });
  }
});

// VERIFY CODE – JOIN ROOM
app.post("/api/verify-code", (req, res) => {
  const { email, enteredCode } = req.body;
  const record = emailCodes[email];

  if (!record || record.code !== enteredCode) {
    return res.status(400).json({ success: false, message: "Invalid code" });
  }

  const room = rooms[record.roomCode];
  if (!room || !room.active) return res.status(404).json({ success: false, message: "Room not found" });

  if (room.members.length >= 4) return res.status(400).json({ success: false, message: "Room full" });
  if (room.members.some(m => m.email === email)) return res.status(400).json({ success: false, message: "Already joined" });

  const member = {
    email,
    joinedAt: new Date().toISOString(),
    isSpeaking: false
  };

  room.members.push(member);
  console.log(`Added ${email} to ${record.roomCode} → total: ${room.members.length}`);

  speakingStats[email] = { speakingTime: 0, turns: 0, lastStart: null };

  if (room.members.length === 4) startGD(record.roomCode);

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
    console.log(`[JOIN] ${email} trying to join ${roomCode} from socket ${socket.id}`);

    const room = rooms[roomCode];
    if (!room || !room.active) {
      console.log(`[JOIN] Room not found: ${roomCode}`);
      socket.emit("error", { message: "Room not found or ended" });
      return;
    }

    socket.join(roomCode);
    console.log(`[JOIN] Success: ${email} in ${roomCode} – members now: ${room.members.length}`);

    socket.emit("roomData", {
      topic: room.topic,
      members: room.members
    });
  });

  socket.on("start-speaking", ({ roomCode, email }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const member = room.members.find(m => m.email === email);
    if (member) {
      member.isSpeaking = true;
      io.to(roomCode).emit("roomData", { topic: room.topic, members: room.members });
    }

    const stat = speakingStats[email];
    if (stat) {
      stat.turns += 1;
      stat.lastStart = Date.now();
    }
  });

  socket.on("stop-speaking", ({ roomCode, email }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const member = room.members.find(m => m.email === email);
    if (member) {
      member.isSpeaking = false;
      io.to(roomCode).emit("roomData", { topic: room.topic, members: room.members });
    }

    const stat = speakingStats[email];
    if (stat && stat.lastStart) {
      const duration = Math.floor((Date.now() - stat.lastStart) / 1000);
      stat.speakingTime += duration;
      stat.lastStart = null;
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// START TIMER WHEN FULL
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

// EVALUATION (unchanged for now)
app.post("/api/evaluate", async (req, res) => {
  // ... your existing code ...
});

server.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});