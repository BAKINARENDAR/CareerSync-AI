// READ DATA FROM SETUP PAGE
const topic = localStorage.getItem("gdTopic");
const participants = JSON.parse(localStorage.getItem("gdParticipants"));

if (!topic || !participants || participants.length === 0) {
  alert("No GD data found. Please start from setup page.");
  window.location.href = "/GD/setup.html";
}


// ELEMENTS
const topicText = document.getElementById("topicText");
const boxes = document.getElementById("participantBoxes");
const transcript = document.getElementById("transcript");
const status = document.getElementById("status");
const mic = document.getElementById("mic");
const scoresDiv = document.getElementById("scores");

topicText.innerText = topic;

let scores = {};
let recognition = null;
let currentSpeaker = null;

// CREATE PARTICIPANT BOXES
participants.forEach(name => {
  scores[name] = 0;

  const box = document.createElement("div");
  box.className = "participant";
  box.innerText = name;

  box.addEventListener("click", () => startSpeaking(name, box));
  boxes.appendChild(box);
});

updateScores();

// START SPEAKING
function startSpeaking(name, box) {
  if (currentSpeaker) {
    alert(`${currentSpeaker} is already speaking`);
    return;
  }

  currentSpeaker = name;
  status.innerText = `${name} is speaking`;
  mic.classList.add("mic-active");

  document.querySelectorAll(".participant").forEach(p =>
    p.classList.remove("active")
  );
  box.classList.add("active");

  transcript.innerText = "";

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech Recognition not supported");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;

  recognition.onresult = (e) => {
    const text = e.results[e.results.length - 1][0].transcript;
    transcript.innerText += " " + text;
    scores[name] += 2;
    updateScores();
  };

  recognition.start();
}

// STOP SPEAKING
mic.addEventListener("click", () => {
  if (!currentSpeaker) return;

  recognition.stop();
  mic.classList.remove("mic-active");
  status.innerText = "Click a participant name to speak";

  document.querySelectorAll(".participant").forEach(p =>
    p.classList.remove("active")
  );

  currentSpeaker = null;
});

// UPDATE SCORES
function updateScores() {
  scoresDiv.innerHTML = "";
  for (let p in scores) {
    scoresDiv.innerHTML += `<p>${p}: ${scores[p]} pts</p>`;
  }
}
