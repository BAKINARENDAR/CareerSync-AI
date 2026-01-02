const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function callGroq(prompt) {
  console.log(' Calling Groq...');
  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile', 
    temperature: 0.3,
  });
  const rawText = completion.choices[0]?.message?.content || '';
  console.log(' Groq raw response:', rawText);
  return rawText;
}

function parseAiResponse(rawText) {
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
    throw new Error('AI response parse error.');
  }
  return ai;
}

module.exports = { callGroq, parseAiResponse };
