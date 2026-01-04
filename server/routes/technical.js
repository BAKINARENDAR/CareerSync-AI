const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/analyze-thought', async (req, res) => {
    const { message, history, studentName } = req.body;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are a Senior Technical Interviewer. 
                    STRICT RULES:
                    1. NEVER explain the coding solution yourself.
                    2. YOUR ROLE is ONLY to present the challenge and judge ${studentName}'s logic.
                    3. Ask about Time and Space complexity (O notation) based on their answer.
                    4. Keep your responses strictly under 3 sentences for easy listening.` 
                },
                ...history, 
                { role: "user", content: message }
            ],
            model: "llama-3.3-70b-versatile", 
            temperature: 0.7
        });
        res.json({ feedback: completion.choices[0].message.content });
    } catch (e) { res.status(500).json({ feedback: "I'm sorry, can you repeat that?" }); }
});

module.exports = router;