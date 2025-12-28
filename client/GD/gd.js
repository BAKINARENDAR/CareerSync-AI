/* ================= GLOBAL STATE ================= */
let participants = [];
let scores = {};
let currentIndex = 0;
let timeLeft = 60;
let timerInterval;
let recognition;
let isActive = false;

/* ================= CREATE PARTICIPANTS ================= */
function createParticipants() {
  const count = Number(document.getElementById("count").value);
  const container = document.getElementById("participantInputs");

  if (count < 2 || count > 6) {
    alert("Participants must be between 2 and 6");
    return;
  }

  participants = [];
  scores = {};
  currentIndex = 0;
  container.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const input = document.createElement("input");
    input.placeholder = `Participant ${i + 1} Name`;

    input.addEventListener("change", () => {
      participants[i] = input.value;
      scores[input.value] = 0;
      updateScores();
    });

    container.appendChild(input);
  }
}

/* ================= START SPEAKING ================= */
function startTurn() {
  if (isActive) return alert("Current speaker is already speaking");

  if (!participants.length || participants.includes(undefined)) {
    alert("Enter all participant names");
    return;
  }

  isActive = true;
  timeLeft = 60;

  const speaker = participants[currentIndex];
  document.getElementById("activeSpeaker").innerText = speaker;
  document.getElementById("currentTopic").innerText =
    document.getElementById("topic").value;
  document.getElementById("timer").innerText = timeLeft;

  activateMic(true);
  startSpeechRecognition(speaker);
  startTimer(speaker);
}

/* ================= STOP SPEAKING ================= */
function stopTurn() {
  if (!isActive) return;

  clearInterval(timerInterval);
  stopSpeechRecognition();
  activateMic(false);

  document.getElementById("transcript").innerHTML +=
    `<p style="color:#22c55e">✔ Turn completed</p>`;

  currentIndex = (currentIndex + 1) % participants.length;
  isActive = false;
}

/* ================= TIMER ================= */
function startTimer(speaker) {
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").innerText = timeLeft;
    scores[speaker] += 1; // participation score
    updateScores();

    if (timeLeft <= 0) stopTurn();
  }, 1000);
}

/* ================= SPEECH RECOGNITION ================= */
function startSpeechRecognition(speaker) {
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true;

  recognition.onresult = (event) => {
    const text =
      event.results[event.results.length - 1][0].transcript;

    document.getElementById("transcript").innerText += " " + text;
    scores[speaker] += 2; // speech quality
    updateScores();
  };

  recognition.start();
}

function stopSpeechRecognition() {
  if (recognition) recognition.stop();
}

/* ================= MIC UI ================= */
function activateMic(active) {
  const mic = document.getElementById("mic");

  mic.classList.remove("mic-active", "mic-stop");

  if (active) mic.classList.add("mic-active");
  else mic.classList.add("mic-stop");
}

/* ================= SCORE UI ================= */
function updateScores() {
  const scoreDiv = document.getElementById("scores");
  scoreDiv.innerHTML = "";

  Object.keys(scores).forEach(name => {
    scoreDiv.innerHTML += `
      <p><strong>${name}</strong> — ${scores[name]} pts</p>
    `;
  });
}
