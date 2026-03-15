const express = require('express');
const router = express.Router();
const { AccessToken } = require("livekit-server-sdk");

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// We pass in the 'rooms' object from server.js to keep state in sync
module.exports = (rooms) => {
  router.post('/create-room', (req, res) => {
    const { topic } = req.body;
    const roomCode = generateRoomCode();

    rooms[roomCode] = {
      topic: topic || "Is Artificial Intelligence replacing human jobs?",
      createdAt: Date.now(),
      active: true,
      isStarted: false,
      transcript: []
    };

    console.log(`New GD room created: ${roomCode}`);
    res.json({ success: true, roomCode, wsUrl: process.env.LIVEKIT_WS_URL, topic: rooms[roomCode].topic });
  });

  router.post('/get-livekit-token', async (req, res) => {
    const { roomCode, participantName } = req.body;

    if (!roomCode || !participantName) return res.status(400).json({ success: false, message: "Required fields missing" });

    const room = rooms[roomCode];
    if (!room || !room.active) return res.status(404).json({ success: false, message: "Room not found or ended" });

    try {
      const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, { identity: participantName, ttl: "2h" });
      at.addGrant({ roomJoin: true, room: roomCode, canPublish: true, canSubscribe: true, canPublishData: true });
      
      const token = await at.toJwt();
      res.json({ success: true, token, wsUrl: process.env.LIVEKIT_WS_URL, roomCode, topic: room.topic });
    } catch (err) {
      console.error("Token generation failed:", err);
      res.status(500).json({ success: false, message: "Failed to generate token" });
    }
  });

  return router;
};