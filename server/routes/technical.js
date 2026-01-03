const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/analyze-code', async (req, res) => {
    const { code, question, studentName } = req.body;
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: `You are CareerSync AI. Help ${studentName} solve 'Two Sum'. Analyze their code: ${code}. Answer their question: ${question}. Give hints only.` },
                { role: "user", content: `Code: ${code}\nQuestion: ${question}` }
            ],
            model: "llama3-8b-8192",
        });
        res.json({ feedback: completion.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ feedback: "AI error. Try again." });
    }
});
router.post('/evaluate-concept', async (req, res) => {
    const { topic, answer, studentName } = req.body;
    try {
        const completion = await groq.chat.completions.create({
            messages: [{
                role: "system",
                content: `You are a technical interviewer. The student ${studentName} is answering a question on ${topic}. 
                Their answer is: "${answer}". 
                Evaluate if it is correct. Provide a short verbal feedback and then ask the next follow-up question.`
            }],
            model: "llama3-8b-8192",
        });
        res.json({ feedback: completion.choices[0].message.content });
    } catch (e) { res.status(500).json({ error: "AI error" }); }
});
module.exports = router;