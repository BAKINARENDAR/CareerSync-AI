let participants = [];
let scores = {};
let current = 0;
let time = 60;
let timer;
let recognition;
let isSpeaking = true;


function generateParticipants() {
  const count = document.getElementById("count").value;
  const div = document.getElementById("participants");
  div.innerHTML = "";
  participants = [];
  scores = {};

  for (let i = 0; i < count; i++) {
    const input = document.createElement("input");
    input.placeholder = `Participant ${i + 1} Name`;
    input.onchange = () => {
      participants[i] = input.value;
      scores[input.value] = 0;
    };
    div.appendChild(input);
  }
}

function startSpeaking() {
  if (isSpeaking) return alert("Current speaker is still speaking!");

  if (!participants.length)
    return alert("Add participants first");

  const speaker = participants[current];
  document.getElementById("speaker").innerText = speaker;
  document.getElementById("currentTopic").innerText =
    document.getElementById("topic").value;

  time = 60;
  isSpeaking = true;
  document.getElementById("timer").innerText = time;

  const mic = document.getElementById("mic");
  mic.classList.add("mic-active");
  mic.classList.remove("mic-stop");

  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true;

  recognition.onresult = (e) => {
    const text = e.results[e.results.length - 1][0].transcript;
    document.getElementById("transcript").innerText += " " + text;
    scores[speaker] += 2; // speech contribution
    updateScores();
  };

  recognition.start();

  timer = setInterval(() => {
    time--;
    document.getElementById("timer").innerText = time;
    scores[speaker] += 1; // time participation
    if (time <= 0) stopSpeaking();
  }, 1000);
}

function stopSpeaking() {
  if (!isSpeaking) return;

  clearInterval(timer);
  if (recognition) recognition.stop();

  const mic = document.getElementById("mic");
  mic.classList.remove("mic-active");
  mic.classList.add("mic-stop");

  const speaker = participants[current];

  // Show turn completion feedback
  document.getElementById("transcript").innerHTML +=
    `<p class="turn-ended">✔ ${speaker}'s turn completed</p>`;

  isSpeaking = false;

  // Move to next participant
  current = (current + 1) % participants.length;
}

function updateScores() {
  const div = document.getElementById("scores");
  div.innerHTML = "";
  for (let p in scores) {
    div.innerHTML += `<p>${p}: ${scores[p]} pts</p>`;
  }
}

