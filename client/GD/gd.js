let participants = [];
let currentIndex = 0;
let timeLeft = 60;
let timerInterval;

let participationCount = {};
let leader = "";

const speakerEl = document.getElementById("speaker");
const timerEl = document.getElementById("timer");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const nextBtn = document.getElementById("nextBtn");
const statusEl = document.getElementById("status");

const topicSelect = document.getElementById("topicSelect");
const topicText = document.getElementById("topicText");
const memberSelect = document.getElementById("memberSelect");
const speakerNameInput = document.getElementById("speakerName");

const participationEl = document.getElementById("participation");
const leadershipEl = document.getElementById("leadership");

topicSelect.onchange = () => {
  topicText.innerText = topicSelect.value;
};

function generateParticipants(count) {
  participants = [];
  participationCount = {};
  for (let i = 1; i <= count; i++) {
    const name = "Participant " + i;
    participants.push(name);
    participationCount[name] = 0;
  }
}

function startTimer() {
  startBtn.disabled = true;
  stopBtn.disabled = false;
  nextBtn.disabled = true;
  statusEl.innerText = "Speaking...";

  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.innerText = timeLeft;

    if (timeLeft === 0) {
      stopSpeaking();
    }
  }, 1000);
}

function stopSpeaking() {
  clearInterval(timerInterval);
  stopBtn.disabled = true;
  nextBtn.disabled = false;
  statusEl.innerText = "Stopped";
}

startBtn.onclick = () => {
  currentIndex = 0;
  timeLeft = 60;
  timerEl.innerText = timeLeft;

  generateParticipants(parseInt(memberSelect.value));

  let name = speakerNameInput.value || participants[currentIndex];
  participants[currentIndex] = name;

  speakerEl.innerText = "Speaker: " + name;
  participationCount[name]++;

  if (currentIndex === 0) {
    leader = name;
  }

  updateInsights(name);
  startTimer();
};

nextBtn.onclick = () => {
  currentIndex++;

  if (currentIndex < participants.length) {
    let name = speakerNameInput.value || participants[currentIndex];
    participants[currentIndex] = name;

    speakerEl.innerText = "Speaker: " + name;
    participationCount[name]++;

    updateInsights(name);

    timeLeft = 60;
    timerEl.innerText = timeLeft;
    startBtn.disabled = false;
    nextBtn.disabled = true;
    statusEl.innerText = "Next participant ready";
  } else {
    speakerEl.innerText = "Group Discussion Completed";
    timerEl.innerText = "--";
    startBtn.disabled = true;
    stopBtn.disabled = true;
    nextBtn.disabled = true;
    statusEl.innerText = "GD session finished";
  }
};

function updateInsights(name) {
  participationEl.innerText = `Participation: ${participationCount[name]} turn(s)`;
  leadershipEl.innerText =
    name === leader ? "Leadership Indicator: Yes" : "Leadership Indicator: No";
}
