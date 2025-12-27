const express = require('express');
const cors = require('cors');
require('dotenv').config();
const Groq = require('groq-sdk');
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, confidence } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'No text provided from speech recognition.' 
      });
    }

    const responseText = text.trim();

    const prompt = `You are an experienced HR interviewer evaluating a candidate's spoken answer.

Candidate's answer: "${responseText}"

Evaluate on 3 dimensions (communication, confidence, structure). Each gets:
- Score 0-10 (decimal OK) 
- 1-2 sentence feedback

Generate exactly 3 realistic HR follow-up questions.

Respond ONLY with valid JSON, no other text:

{
  "communicationScore": 8.5,
  "communicationFeedback": "Clear and concise with good examples.",
  "confidenceScore": 7.0,
  "confidenceFeedback": "Shows ownership but some hesitation.",
  "structureScore": 8.0,
  "structureFeedback": "Logical flow with clear beginning/end.",
  "followupQuestions": ["Tell me about your React experience?", "What was most challenging?", "How did you measure success?"]
}`;

    console.log(' Calling Groq...');

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile', 
      temperature: 0.3,
    });

    const rawText = completion.choices[0]?.message?.content || '';
    console.log(' Groq raw response:', rawText);

    let ai;
    try {
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      const jsonPart = firstBrace !== -1 && lastBrace !== -1 
        ? rawText.slice(firstBrace, lastBrace + 1)
        : rawText;
      ai = JSON.parse(jsonPart);
    } catch (e) {
      console.error(' JSON parse failed:', rawText);
      return res.status(500).json({ 
        success: false, 
        error: 'AI response parse error.' 
      });
    }

    const communicationScore = Number(ai.communicationScore) || 6.5;
    const confidenceScore = Number(ai.confidenceScore) || 6.5;
    const structureScore = Number(ai.structureScore) || 6.5;
    const overallScore = (communicationScore + confidenceScore + structureScore) / 3;

    res.json({
      success: true,
      responseText,
      communicationScore: Math.round(communicationScore * 10) / 10,
      communicationSkills: ai.communicationFeedback || 'Good clarity; add examples.',
      confidenceScore: Math.round(confidenceScore * 10) / 10,
      confidenceLevel: ai.confidenceFeedback || 'Moderate confidence.',
      structureScore: Math.round(structureScore * 10) / 10,
      structureFeedback: ai.structureFeedback || 'Acceptable structure.',
      overallScore: Math.round(overallScore * 10) / 10,
      followupQuestions: ai.followupQuestions || [],
      rawConfidence: confidence || 0
    });

  } catch (error) {
    console.error('Groq ERROR:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Groq failed' 
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Groq Backend running!', 
    groqKeySet: !!process.env.GROQ_API_KEY 
  });
});

app.listen(PORT, () => {
  console.log(`Groq Backend on http://localhost:${PORT}`);
});
