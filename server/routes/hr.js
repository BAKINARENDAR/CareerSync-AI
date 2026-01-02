const express = require('express');
const { callGroq, parseAiResponse } = require('../utils/groq');
const router = express.Router();

router.post('/analyze', async (req, res) => {
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

    const rawText = await callGroq(prompt);
    const ai = parseAiResponse(rawText);

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

module.exports = router;
