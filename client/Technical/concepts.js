const studentName = localStorage.getItem("studentName") || "Narendra";
let currentTopic = "OOPS";

function setTopic(topic) {
    currentTopic = topic;
    // Update UI highlights
    document.querySelectorAll('.topic-item').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    
    speakAI(`Great, ${studentName}. Let's start with ${topic}. My first question is: What do you understand by the term 'Inheritance'?`);
}

function speakAI(text) {
    const chat = document.getElementById("aiChat");
    const msg = document.createElement("div");
    msg.className = "msg ai-msg";
    msg.innerHTML = `<b>CareerSync AI:</b><br>${text}`;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;

    const utter = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utter);
}

// Microphone Logic for conceptual answers
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    
    // Show user answer in chat
    const userMsg = document.createElement("div");
    userMsg.className = "msg user-msg";
    userMsg.style.textAlign = "right";
    userMsg.innerHTML = `<b>You:</b><br>${transcript}`;
    document.getElementById("aiChat").appendChild(userMsg);

    // Send answer to Groq for evaluation
    const response = await fetch('http://localhost:5000/api/technical/evaluate-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            topic: currentTopic, 
            answer: transcript, 
            studentName: studentName 
        })
    });
    const data = await response.json();
    speakAI(data.feedback);
};

document.getElementById("micBtn").onclick = () => recognition.start();