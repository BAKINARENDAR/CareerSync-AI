const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "CareerSync AI Backend Running!",
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "Backend running!" });
});

let rooms = {};
let emailCodes = {};
let speakingStats = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ================= CREATE ROOM =================
app.post("/api/create-room", (req, res) => {
  const code = generateRoomCode();

  rooms[code] = {
    members: [],
    topic: "Is Artificial Intelligence replacing human jobs?",
    duration: 300,
    startTime: null,
    timerInterval: null
  };

  res.json({ success: true, roomCode: code });
});

// ================= GET ROOM INFO =================
app.get("/api/room/:code", (req, res) => {
  const room = rooms[req.params.code];
  if (!room) return res.status(404).json({ success: false });

  res.json({
    success: true,
    members: room.members,
    topic: room.topic,
    duration: room.duration
  });
});

// ================= EMAIL SETUP =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ================= SEND CODE =================
app.post("/api/send-code", async (req, res) => {
  const { email, roomCode } = req.body;

  if (!rooms[roomCode])
    return res.status(404).json({ success: false, message: "Room not found" });

  if (rooms[roomCode].members.length >= 4)
    return res.status(400).json({ success: false, message: "Room full" });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  emailCodes[email] = { code, roomCode };

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "CareerSync GD Verification Code",
      text: `Your verification code is: ${code}`
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ================= VERIFY CODE =================
app.post("/api/verify-code", (req, res) => {
  const { email, enteredCode } = req.body;
  const record = emailCodes[email];

  if (!record || record.code !== enteredCode)
    return res.status(400).json({ success: false, message: "Invalid code" });

  const room = rooms[record.roomCode];
  if (!room)
    return res.status(404).json({ success: false, message: "Room not found" });

  if (room.members.length >= 4)
    return res.status(400).json({ success: false, message: "Room full" });

  room.members.push(email);

  speakingStats[email] = {
    speakingTime: 0,
    turns: 0,
    lastStart: null
  };

  if (room.members.length === 4) startGD(record.roomCode);

  delete emailCodes[email];

  res.json({
    success: true,
    roomCode: record.roomCode,
    members: room.members
  });
});

// ================= SOCKET =================
io.on("connection", (socket) => {
  socket.on("join-room", ({ roomCode, email }) => {
    socket.join(roomCode);
  });

  socket.on("start-speaking", ({ roomCode, email }) => {
    const stat = speakingStats[email];
    if (!stat) return;

    stat.turns += 1;
    stat.lastStart = Date.now();

    io.to(roomCode).emit("speaker-changed", email);
  });

  socket.on("stop-speaking", ({ roomCode, email }) => {
    const stat = speakingStats[email];
    if (!stat || !stat.lastStart) return;

    const duration = Math.floor((Date.now() - stat.lastStart) / 1000);
    stat.speakingTime += duration;
    stat.lastStart = null;
  });
});

// ================= START GD =================
function startGD(roomCode) {
  const room = rooms[roomCode];
  room.startTime = Date.now();

  room.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - room.startTime) / 1000);
    const remaining = room.duration - elapsed;

    io.to(roomCode).emit("timer-update", remaining);

    if (remaining <= 0) {
      clearInterval(room.timerInterval);
      io.to(roomCode).emit("gd-ended");
    }
  }, 1000);
}

// ================= AI EVALUATION =================
app.post("/api/evaluate", async (req, res) => {
  const { roomCode } = req.body;
  const room = rooms[roomCode];

  if (!room) return res.status(404).json({ success: false });

  const prompt = `
Topic: ${room.topic}
Participation Stats:
${JSON.stringify(speakingStats)}

Give evaluation for each participant:
- Leadership score /10
- Communication score /10
- Participation score /10
- Strength
- Improvement
`;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "mixtral-8x7b-32768",
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      success: true,
      evaluation: response.data.choices[0].message.content
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

server.listen(PORT, () => {
  console.log(`CareerSync Backend running on http://localhost:${PORT}`);
});