const startBtn = document.getElementById("startBtn");
const interviewLayout = document.getElementById("interviewLayout");
const aiChat = document.getElementById("aiChat");
const userChat = document.getElementById("userChat");
const micBtn = document.getElementById("micBtn");
const options = document.getElementById("options");

let studentName = "";
let interviewStarted = false;

/* AUTO CORRECT */
function autoCorrect(text) {
  const corrections = {
    "b tech": "B.Tech",
    "mlr institute of technology": "MLR Institute of Technology",
    "coding entusiast": "coding enthusiast",
    "data base": "database"
  };

  let t = text.toLowerCase();
  for (let key in corrections) {
    t = t.replaceAll(key, corrections[key]);
  }

  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* SPEAK AI */
function speakAI(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-IN";
  utter.rate = 0.9;
  speechSynthesis.speak(utter);

  const msg = document.createElement("div");
  msg.className = "msg ai-msg";
  msg.innerHTML = `<b>CareerSync AI:</b><br>${text}`;
  aiChat.appendChild(msg);
  aiChat.scrollTop = aiChat.scrollHeight;
}

/* START INTERVIEW */
startBtn.onclick = () => {
  interviewStarted = true;
  startBtn.style.display = "none";
  interviewLayout.style.display = "grid";

  speakAI(
    "Hello, I am CareerSync AI. I assist students with placement preparation including technical interviews, HR rounds, and group discussions. Please introduce yourself."
  );
};

/* SPEECH RECOGNITION */
const recognition = new webkitSpeechRecognition();
recognition.lang = "en-IN";
recognition.continuous = true;        // ✅ IMPORTANT
recognition.interimResults = false;

/* MIC CLICK */
micBtn.onclick = () => {
  if (!interviewStarted) return;       

  micBtn.style.boxShadow =
    "0 0 30px #ffffff, 0 0 45px #5ee7ff, inset 0 0 30px #5ee7ff";

  recognition.start();
};

/* RESULT */
recognition.onresult = (e) => {
  const rawText = e.results[0][0].transcript;
  const text = autoCorrect(rawText);

  const msg = document.createElement("div");
  msg.className = "msg user-msg";
  msg.innerHTML = `<b>You:</b><br>${text}`;
  userChat.appendChild(msg);
  userChat.scrollTop = userChat.scrollHeight;

  if (!studentName) {
    studentName = text.split(" ")[0];
    speakAI(`Nice to meet you, ${studentName}. You can now choose a module to begin.`);
    options.style.display = "block";
  }
};

/* STOP EFFECT */
recognition.onend = () => {
  micBtn.style.boxShadow =
    "0 0 15px #ffffff, 0 0 25px #5ee7ff, inset 0 0 20px #5ee7ff";
};

/* NAVIGATION */
function goCoding() {
  window.location.href = "coding.html";
}

function goConcepts() {
  window.location.href = "concepts.html";
}
