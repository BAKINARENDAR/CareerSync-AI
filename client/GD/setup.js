// THIS LINE MUST PRINT
console.log("✅ setup.js loaded");

// WAIT UNTIL HTML IS READY
document.addEventListener("DOMContentLoaded", function () {

  const addBtn = document.getElementById("addBtn");
  const enterBtn = document.getElementById("enterBtn");
  const countInput = document.getElementById("countInput");
  const participantsContainer = document.getElementById("participantsContainer");

  addBtn.addEventListener("click", function () {
    participantsContainer.innerHTML = "";

    const count = Number(countInput.value);

    if (!count || count < 1) {
      alert("Enter valid count");
      return;
    }

    for (let i = 0; i < count; i++) {
      const input = document.createElement("input");
      input.placeholder = "Participant " + (i + 1);
      participantsContainer.appendChild(input);
      participantsContainer.appendChild(document.createElement("br"));
    }

    alert("Participants added");
  });

 enterBtn.addEventListener("click", function () {

  const topic = topicInput.value.trim();
  const participantInputs = participantsContainer.querySelectorAll("input");

  if (!topic) {
    alert("Please enter a topic");
    return;
  }

  if (participantInputs.length === 0) {
    alert("Please add participants first");
    return;
  }

  const names = [];
  for (let input of participantInputs) {
    if (input.value.trim() === "") {
      alert("Please fill all participant names");
      return;
    }
    names.push(input.value.trim());
  }

  // ✅ SAVE DATA CORRECTLY
  localStorage.setItem("gdTopic", topic);
  localStorage.setItem("gdParticipants", JSON.stringify(names));

  // ✅ REDIRECT TO GD ROOM
  window.location.href = "/GD/gd-room.html";
});


});
