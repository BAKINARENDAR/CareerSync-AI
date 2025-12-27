let participants = [];
let scores = {};
let current = 0;
let time = 60;
let timer;
let recognition;

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
  if (!participants.length) return alert("Add participants first");

  const speaker = participants[current];
  document.getElementById("speaker").innerText = speaker;
  document.getElementById("currentTopic").innerText =
    document.getElementById("topic").value;

  time = 60;
  document.getElementById("timer").innerText = time;
  document.getElementById("mic").classList.add("mic-active");

  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.onresult = (e) => {
    document.getElementById("transcript").innerText +=
      e.results[e.results.length - 1][0].transcript;
    scores[speaker] += 2;
    updateScores();
  };
  recognition.start();

  timer = setInterval(() => {
    time--;
    document.getElementById("timer").innerText = time;
    scores[speaker] += 1;
    if (time <= 0) stopSpeaking();
  }, 1000);
}

function stopSpeaking() {
  clearInterval(timer);
  if (recognition) recognition.stop();
  document.getElementById("mic").classList.remove("mic-active");
  current = (current + 1) % participants.length;
}

function updateScores() {
  const div = document.getElementById("scores");
  div.innerHTML = "";
  for (let p in scores) {
    div.innerHTML += `<p>${p}: ${scores[p]} pts</p>`;
  }
}
