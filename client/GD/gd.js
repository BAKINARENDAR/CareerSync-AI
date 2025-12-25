let participants = [];
let currentIndex = 0;
let timeLeft = 60;
let timer;

let participationCount = {};
let leader = "";

const topicSelect = document.getElementById("topicSelect");
const currentTopic = document.getElementById("currentTopic");
const memberSelect = document.getElementById("memberSelect");
const speakerInput = document.getElementById("speakerInput");

const speakerEl = document.getElementById("speaker");
const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("status");

const participationEl = document.getElementById("participation");
const leadershipEl = document.getElementById("leadership");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const nextBtn = document.getElementById("nextBtn");

topicSelect.onchange = () => {
  currentTopic.innerText = topicSelect.value;
};

function generateParticipants(count) {
  participants = [];
  participationCount = {};
  for (let i = 1; i <= count; i++) {
    let name = "Participant " + i;
    participants.push(name);
    participationCount[name] = 0;
  }
}

function startTimer() {
  statusEl.innerText = "Speaking...";
  startBtn.disabled = true;
  stopBtn.disabled = false;
  nextBtn.disabled = true;

  timer = setInterval(() => {
    timeLeft--;
    timerEl.innerText = timeLeft;

    if (timeLeft === 0) stopSpeaking();
  }, 1000);
}

function stopSpeaking() {
  clearInterval(timer);
  stopBtn.disabled = true;
  nextBtn.disabled = false;
  statusEl.innerText = "Stopped";
}

function updateInsights(name) {
  participationEl.innerText =
    "Participation: " + participationCount[name] + " turn(s)";
  leadershipEl.innerText =
    name === leader ? "Leadership Indicator: Yes" : "Leadership Indicator: No";
}

startBtn.onclick = () => {
  currentIndex = 0;
  timeLeft = 60;
  timerEl.innerText = timeLeft;

  generateParticipants(parseInt(memberSelect.value));

  let name = speakerInput.value || participants[currentIndex];
  participants[currentIndex] = name;
  leader = name;

  participationCount[name]++;
  speakerEl.innerText = "Speaker: " + name;
  updateInsights(name);

  startTimer();
};

stopBtn.onclick = stopSpeaking;

nextBtn.onclick = () => {
  currentIndex++;

  if (currentIndex < participants.length) {
    let name = speakerInput.value || participants[currentIndex];
    participants[currentIndex] = name;

    participationCount[name]++;
    speakerEl.innerText = "Speaker: " + name;
    updateInsights(name);

    timeLeft = 60;
    timerEl.innerText = timeLeft;
    startBtn.disabled = false;
    nextBtn.disabled = true;
    statusEl.innerText = "Ready for next participant";
  } else {
    speakerEl.innerText = "Group Discussion Completed";
    timerEl.innerText = "--";
    statusEl.innerText = "GD session finished";
    startBtn.disabled = true;
    stopBtn.disabled = true;
    nextBtn.disabled = true;
  }
};
