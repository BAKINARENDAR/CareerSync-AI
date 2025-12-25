const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Multer setup for audio files
const upload = multer({ dest: 'uploads/' });

// Simple NLP analysis (no ML dependencies needed)
function analyzeResponse(text) {
    const textLower = text.toLowerCase();
    
    // Count metrics
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / sentenceCount;
    
    // Communication Score (0-10)
    let communicationScore = 5;
    if (wordCount > 50) communicationScore += 1;
    if (sentenceCount > 3) communicationScore += 1;
    if (avgWordsPerSentence > 10) communicationScore += 1;
    if (text.includes('example') || text.includes('specifically')) communicationScore += 1;
    if (!textLower.includes('um') && !textLower.includes('uh') && !textLower.includes('like')) communicationScore += 1;
    
    communicationScore = Math.min(communicationScore, 10);
    
    // Confidence Score (0-10)
    let confidenceScore = 5;
    if (avgWordsPerSentence > 12) confidenceScore += 1;
    if (!textLower.includes('maybe') && !textLower.includes('i think') && !textLower.includes('i guess')) confidenceScore += 1;
    if (textLower.includes('i managed') || textLower.includes('i achieved') || textLower.includes('i led')) confidenceScore += 2;
    if (wordCount > 100) confidenceScore += 1;
    
    confidenceScore = Math.min(confidenceScore, 10);
    
    // Structure Score (0-10)
    let structureScore = 5;
    if (textLower.includes('first') || textLower.includes('initially')) structureScore += 1;
    if (textLower.includes('then') || textLower.includes('next') || textLower.includes('after')) structureScore += 1;
    if (textLower.includes('finally') || textLower.includes('ultimately') || textLower.includes('result')) structureScore += 1;
    if (sentenceCount > 4) structureScore += 1;
    
    structureScore = Math.min(structureScore, 10);
    
    return {
        communicationScore: Math.round(communicationScore * 10) / 10,
        confidenceScore: Math.round(confidenceScore * 10) / 10,
        structureScore: Math.round(structureScore * 10) / 10,
        wordCount,
        sentenceCount
    };
}

// Simple follow-up question generator
function generateFollowups(text) {
    const followupQuestions = [
        "What was your biggest challenge in that situation?",
        "How did you handle conflicts with team members?",
        "What did you learn from that experience?",
        "Can you give a specific example of your achievement?",
        "How would you approach this differently next time?"
    ];
    
    // Randomly select 3 follow-up questions
    const selected = [];
    for (let i = 0; i < 3; i++) {
        const random = Math.floor(Math.random() * followupQuestions.length);
        selected.push(followupQuestions[random]);
    }
    
    return selected;
}

// API Endpoint: Analyze Response
app.post('/api/analyze', upload.single('audio'), async (req, res) => {
    try {
        // For demo: use mock text (in production, use speech-to-text)
        const mockResponses = [
            "I am a passionate software developer with 3 years of experience. I specialize in building scalable web applications using React and Node.js. In my previous role, I led a team project to redesign our company's dashboard, which resulted in 40% improvement in user engagement. I am excited about this opportunity because it aligns with my career goals.",
            "My strength is problem solving. I have experience with multiple programming languages including JavaScript, Python, and Java. I once managed to optimize a slow database query that was causing performance issues, reducing load time by 50%. I believe continuous learning is important, so I actively participate in online courses and tech communities."
        ];
        
        const responseText = mockResponses[Math.floor(Math.random() * mockResponses.length)];
        
        // Analyze the response
        const analysis = analyzeResponse(responseText);
        const followups = generateFollowups(responseText);
        
        // Calculate overall score
        const overallScore = (analysis.communicationScore + analysis.confidenceScore + analysis.structureScore) / 3;
        
        res.json({
            success: true,
            responseText,
            communicationScore: analysis.communicationScore,
            communicationSkills: `Your response shows ${analysis.communicationScore > 7 ? 'strong' : 'moderate'} communication skills. Word count: ${analysis.wordCount}`,
            confidenceScore: analysis.confidenceScore,
            confidenceLevel: `${analysis.confidenceScore > 7 ? 'High' : 'Moderate'}. ${analysis.confidenceScore > 7 ? 'Great!' : 'Try to speak with more conviction.'}`,
            structureScore: analysis.structureScore,
            followupQuestions: followups,
            overallScore: Math.round(overallScore * 10) / 10
        });
        
        // Cleanup uploaded file
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'Backend is running!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ CareerSync Backend running on http://localhost:${PORT}`);
    console.log(`📡 API endpoint: http://localhost:${PORT}/api/analyze`);
});
