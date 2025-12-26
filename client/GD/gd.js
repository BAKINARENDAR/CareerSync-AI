let time = 300;
let interval;
let recognition;
let participants = {};
let currentSpeaker = null;

// Load topic
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("topicText").innerText =
    localStorage.getItem("gdTopic");
});

function joinGD() {
  const name = document.getElementById("username").value;
  if (!name) {
    alert("Enter your name");
    return;
  }

  if (!participants[name]) {
    participants[name] = { words: 0, turns: 0 };
  }

  document.getElementById("status").innerText =
    `${name} joined the discussion`;
}

function startSpeaking() {
  const name = document.getElementById("username").value;

  if (currentSpeaker && currentSpeaker !== name) {
    alert(`${currentSpeaker} is speaking. Please wait.`);
    return;
  }

  currentSpeaker = name;
  participants[name].turns++;

  recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    document.getElementById("response").value += " " + text;
    participants[name].words += text.split(" ").length;
  };

  recognition.start();
}

function submitGD() {
  if (recognition) recognition.stop();
  currentSpeaker = null;
}

function startTimer() {
  interval = setInterval(() => {
    time--;
    let min = Math.floor(time / 60);
    let sec = time % 60;
    document.getElementById("timer").innerText =
      `${min}:${sec < 10 ? "0" : ""}${sec}`;

    if (time === 0) {
      clearInterval(interval);
      generateInsights();
    }
  }, 1000);
}

function generateInsights() {
  let result = "<b>GD Insights</b><br><br>";
  let leader = "";
  let maxWords = 0;

  for (let user in participants) {
    result += `${user} → Words: ${participants[user].words}, Turns: ${participants[user].turns}<br>`;
    if (participants[user].words > maxWords) {
      maxWords = participants[user].words;
      leader = user;
    }
  }

  result += `<br><b>Leader:</b> ${leader}`;
  document.getElementById("insights").innerHTML = result;
}
