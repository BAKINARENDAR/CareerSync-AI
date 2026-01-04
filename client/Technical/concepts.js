const micBtn = document.getElementById("micBtn");
const micStatus = document.getElementById("micStatus");
const aiChat = document.getElementById("aiChat");
const userChat = document.getElementById("userChat");
const startBtn = document.getElementById("startBtn");
const topicDisplay = document.getElementById("currentTopic");

// Interview State
let currentTopicIndex = 0;
let questionCount = 0;
const topics = ["Operating Systems", "OOPS", "Computer Networks", "DBMS"];
const studentName = localStorage.getItem("studentName") || "Candidate";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = "en-IN";

// --- API CONFIGURATION ---
// Note: In a real app, call your backend. For demo, we use a direct fetch.
const API_KEY = "YOUR_OPENAI_API_KEY"; 

async function getAIResponse(userFeedback, type) {
    const prompt = type === "question" 
        ? `You are a technical interviewer. Ask a professional ${topics[currentTopicIndex]} interview question for a B.Tech student. Question number ${questionCount + 1} of 5.`
        : `The student answered: "${userFeedback}". If the answer is wrong, explain the correct answer briefly and say "Let's move to the next one". If right, say "Excellent". Don't be too long.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "system", content: "You are a helpful Technical Interviewer." }, { role: "user", content: prompt }]
            })
        });
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (e) {
        return "System error. Let's continue. Tell me what you know about " + topics[currentTopicIndex];
    }
}

// --- CORE INTERVIEW ENGINE ---

async function nextStep(userResponse = null) {
    if (userResponse) {
        // 1. Evaluate user answer
        const evaluation = await getAIResponse(userResponse, "evaluate");
        displayMsg(evaluation, "ai");
        await speak(evaluation);
        questionCount++;
    }

    // 2. Check if topic is finished
    if (questionCount >= 5) {
        questionCount = 0;
        currentTopicIndex++;
    }

    // 3. Check if interview is finished
    if (currentTopicIndex >= topics.length) {
        const finalMsg = "Congratulations! You have completed all technical modules.";
        displayMsg(finalMsg, "ai");
        topicDisplay.innerText = "COMPLETED";
        await speak(finalMsg);
        return;
    }

    // 4. Ask next question
    topicDisplay.innerText = `TOPIC: ${topics[currentTopicIndex].toUpperCase()}`;
    const nextQ = await getAIResponse(null, "question");
    displayMsg(nextQ, "ai");
    await speak(nextQ);
    
    enableMic();
}

// --- UI & VOICE UTILS ---

function displayMsg(text, sender) {
    const div = document.createElement("div");
    div.className = `msg ${sender}-msg`;
    div.innerHTML = `<b>${sender === 'ai' ? 'CareerSync AI' : 'You'}:</b><br>${text}`;
    const container = sender === 'ai' ? aiChat : userChat;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

async function speak(text) {
    return new Promise((resolve) => {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.onend = resolve;
        window.speechSynthesis.speak(utter);
    });
}

function enableMic() {
    micBtn.classList.remove("disabled-mic");
    micStatus.innerText = "Listening for your answer...";
    micBtn.style.boxShadow = "0 0 50px #fff, 0 0 80px #5ee7ff";
    recognition.start();
}

recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    displayMsg(text, "user");
    micBtn.classList.add("disabled-mic");
    micStatus.innerText = "Processing...";
    nextStep(text);
};

recognition.onerror = () => {
    speak("I am unable to recognize your voice. Please try again.");
    micStatus.innerText = "Try clicking the mic again.";
};

startBtn.onclick = () => {
    startBtn.style.display = "none";
    document.getElementById("interviewLayout").style.opacity = "1";
    nextStep();
};