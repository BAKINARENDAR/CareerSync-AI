const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

router.post('/analyze-thought', async (req, res) => {
  const { message, history = [], studentName } = req.body;

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
4. Keep responses strictly under 3 sentences.`
        },
        ...history,
        { role: "user", content: message }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7
    });

    res.json({ feedback: completion.choices[0].message.content });

  } catch (err) {
    console.error(err);
    res.status(500).json({ feedback: "I'm sorry, can you repeat that?" });
  }
});

router.post('/analyze-concept', async (req, res) => {
  const { message, history = [], studentName, subject } = req.body;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a Senior Technical Interviewer.
STRICT RULES:
1. NEVER define concepts or explain how ${subject} works yourself.
2. YOUR ROLE is strictly to ask ${studentName} technical questions.
3. Start with basics, then go deeper.
4. Keep responses strictly under 3 sentences.`
        },
        ...history,
        { role: "user", content: message }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7
    });

    res.json({ feedback: completion.choices[0].message.content });

  } catch (err) {
    console.error(err);
    res.status(500).json({ feedback: "I encountered an error. Please repeat." });
  }
});

module.exports = router;
