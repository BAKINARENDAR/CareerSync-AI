const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const interviewRoutes = require('./routes/interview');
app.use('/api', interviewRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Groq Backend running!', 
    groqKeySet: !!process.env.GROQ_API_KEY 
  });
});

app.listen(PORT, () => {
  console.log(`Groq Backend on http://localhost:${PORT}`);
});
