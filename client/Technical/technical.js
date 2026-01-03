const startBtn = document.getElementById("startBtn");
const interviewLayout = document.getElementById("interviewLayout");
const aiChat = document.getElementById("aiChat");
const userChat = document.getElementById("userChat");
const micBtn = document.getElementById("micBtn");
const micStatus = document.getElementById("micStatus");
const options = document.getElementById("options");

let studentName = "";
let interviewStarted = false;
let canUseMic = false;
let silenceTimer; 
let introDelayTimer;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = "en-IN";
recognition.continuous = false; // Changed to false to force fresh sessions
recognition.interimResults = false;

// --- DYNAMIC ACCURACY LAYER ---
function cleanTranscript(text) {
    let t = text.toLowerCase().trim();

    // Mapping Phonetics to Reality
    const phoneticFixes = [
        { regex: /my mail|mail are|i was stuff|malad east|malad|institute of tech|mlr/gi, replace: "MLR Institute of Technology" },
        { regex: /birthday|btech|b tech/gi, replace: "B.Tech" },
        { regex: /pursing|persuing/gi, replace: "pursuing" },
        { regex: /i'm|i am/gi, replace: "I am" }
    ];

    phoneticFixes.forEach(fix => {
        t = t.replace(fix.regex, fix.replace);
    });

    const dictionary = {
        "narendra": "Narendra",
        "hyderabad": "Hyderabad"
    };

    Object.keys(dictionary).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        t = t.replace(regex, dictionary[key]);
    });

    t = t.replace(/\bi\b/g, "I"); 
    return t.charAt(0).toUpperCase() + t.slice(1);
}

function speakAI(text) {
    window.speechSynthesis.cancel();
    canUseMic = false;
    micBtn.classList.add("disabled-mic");
    micStatus.innerText = "CareerSync AI is speaking...";

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-IN";
    utter.rate = 0.95;

    utter.onend = () => {
        if (!studentName) {
            canUseMic = true;
            micBtn.classList.remove("disabled-mic");
            micStatus.innerText = "Click the mic to introduce yourself";
        } else {
            micStatus.innerText = "Please select a module below";
        }
    };

    speechSynthesis.speak(utter);

    const msg = document.createElement("div");
    msg.className = "msg ai-msg";
    msg.innerHTML = `<b>CareerSync AI:</b><br>${text}`;
    aiChat.appendChild(msg);
    aiChat.scrollTop = aiChat.scrollHeight;
}

startBtn.onclick = () => {
    interviewStarted = true;
    startBtn.style.display = "none";
    interviewLayout.style.display = "grid";
    micBtn.style.cursor = "pointer";
    speakAI("Hello, I am CareerSync AI. Please introduce yourself by clicking on the microphone.");
};

micBtn.onclick = () => {
    if (!interviewStarted || !canUseMic) return;
    
    // Safety: Abort any "stuck" recognition before starting fresh
    try { recognition.abort(); } catch(e) {}

    setTimeout(() => {
        try {
            recognition.start();
            micStatus.innerText = "Listening...";
            micBtn.style.boxShadow = "0 0 50px #fff, 0 0 80px #5ee7ff";
            resetSilenceTimer();
        } catch (e) { console.log("Mic error"); }
    }, 100);
};

function resetSilenceTimer() {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
        if (!studentName && canUseMic) { handleVoiceError(); }
    }, 10000); 
}

function handleVoiceError() {
    recognition.stop();
    micBtn.style.boxShadow = "0 0 25px #fff, 0 0 50px #5ee7ff, inset 0 0 30px #5ee7ff";
    speakAI("I am unable to recognize your voice. Please try again.");
}

recognition.onresult = (event) => {
    clearTimeout(silenceTimer);
    clearTimeout(introDelayTimer);

    // Only take the very last result to avoid duplication
    const lastResultIndex = event.results.length - 1;
    const rawText = event.results[lastResultIndex][0].transcript;
    
    const correctedText = cleanTranscript(rawText);
    
    // UI Update: Shows ONLY what you just said
    const userMsg = document.createElement("div");
    userMsg.className = "msg user-msg";
    userMsg.innerHTML = `<b>You:</b><br>${correctedText}`;
    userChat.appendChild(userMsg);
    userChat.scrollTop = userChat.scrollHeight;

    introDelayTimer = setTimeout(() => {
        processIdentity(correctedText);
    }, 2000); 
};

function processIdentity(text) {
    if (!studentName) {
        const words = text.split(" ");
        const amIndex = words.findIndex(w => w.toLowerCase() === "am");
        let name = (amIndex !== -1 && words[amIndex + 1]) ? words[amIndex + 1] : words[0];
        
        studentName = name.replace(/[.,]/g, "");
        localStorage.setItem("studentName", studentName); 

        recognition.stop();
        speakAI(`Nice to meet you, ${studentName}. You can now choose a module.`);
        
        options.style.display = "block";
        canUseMic = false;
        micBtn.classList.add("disabled-mic");
        micStatus.innerText = "Intro Completed";
    }
}

recognition.onerror = (event) => { if (event.error === 'no-speech') handleVoiceError(); };
recognition.onend = () => { if (canUseMic) micBtn.style.boxShadow = "0 0 25px #fff, 0 0 50px #5ee7ff, inset 0 0 30px #5ee7ff"; };

function goCoding() { window.open("coding.html", "_blank"); }
function goConcepts() { window.open("concepts.html", "_blank"); }