const express = require('express');
const router = express.Router();
const { AccessToken } = require("livekit-server-sdk");
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

module.exports = (rooms) => {
    
    router.post('/create-room', async (req, res) => {
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        let aiTopic = "Why is India still considered a developing country?"; 

        try {
            const completion = await groq.chat.completions.create({
                messages: [{ 
                    role: "system", 
                    content: "Generate one short Group Discussion topic. Maximum 12 words. Make it a single line. Example: 'Why is India still a developing country?'. Return ONLY the topic text, no quotes." 
                }],
                model: "llama-3.3-70b-versatile",
                temperature: 0.8
            });
            if (completion.choices && completion.choices[0]) {
                aiTopic = completion.choices[0].message.content.trim();
            }
        } catch (err) {
            console.error("AI Topic generation failed, using fallback.");
        }

        rooms[roomCode] = { topic: aiTopic, createdAt: Date.now(), active: true, isStarted: false };
        res.json({ success: true, roomCode, topic: aiTopic });
    });

    router.post('/get-livekit-token', async (req, res) => {
        try {
            const body = req.body || {};
            const roomCode = body.roomCode;
            const participantName = body.participantName || "Guest";
            
            const room = rooms[roomCode];
            if (!room) return res.status(404).json({ success: false, message: "Room not found" });

            const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
                identity: participantName,
                ttl: "2h"
            });
            at.addGrant({ roomJoin: true, room: roomCode, canPublish: true, canSubscribe: true });
            
            res.json({ success: true, token: await at.toJwt(), wsUrl: process.env.LIVEKIT_WS_URL, topic: room.topic });
        } catch (e) {
            res.status(500).json({ success: false, message: "Server error generating token." });
        }
    });

    router.post('/analyze-gd', async (req, res) => {
        const { transcript, participantName, topic } = req.body;
        try {
            const completion = await groq.chat.completions.create({
                messages: [{ 
                    role: "system", 
                    content: `You are an AI HR Assessor evaluating ${participantName} in a Group Discussion about "${topic}".
                    Read the transcript. If ${participantName} did not speak much, give a lower score. 
                    Respond STRICTLY with a valid JSON object in this format:
                    {"score": "8/10", "feedback": "Overall feedback.", "strengths": "One strength.", "improvements": "One area to improve."}` 
                },
                { role: "user", content: `Transcript:\n${transcript}` }],
                model: "llama-3.3-70b-versatile",
                temperature: 0.5
            });

            let responseText = completion.choices[0].message.content.trim();
            if (responseText.startsWith('```json')) responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            res.json(JSON.parse(responseText));
        } catch (err) {
            res.status(500).json({ score: "N/A", feedback: "Failed to analyze transcript.", strengths: "-", improvements: "-" });
        }
    });

    return router;
};