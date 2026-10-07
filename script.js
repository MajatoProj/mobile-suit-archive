const bootLog = document.getElementById("bootLog");
const progressFill = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");
const finalMessage = document.getElementById("finalMessage");
const enterBtn = document.getElementById("enterBtn");

const lines = [
  "INITIALIZING MOBILE SUIT ARCHIVE...",
  "CHECKING CORE SYSTEMS...",
  "LOADING UNIT DATABASE...",
  "VERIFYING COLLECTION INDEX...",
  "ESTABLISHING VISUAL INTERFACE...",
  "SYNCHRONIZING ARCHIVE MODULES...",
  "SYSTEM STATUS: NOMINAL",
  "ACCESS CONTROL: ACCEPTED"
];

let lineIndex = 0;
let progress = 0;

function addLine(text) {
  const div = document.createElement("div");
  div.className = "log-line";
  div.textContent = "> " + text;
  bootLog.appendChild(div);
  bootLog.scrollTop = bootLog.scrollHeight;
}

function updateProgress(value) {
  progressFill.style.width = value + "%";
  progressPercent.textContent = value + "%";
}

function runBootSequence() {
  const interval = setInterval(() => {
    if (lineIndex < lines.length) {
      addLine(lines[lineIndex]);
      lineIndex++;
      progress += 12;
      if (progress > 96) progress = 96;
      updateProgress(progress);
    } else {
      clearInterval(interval);

      setTimeout(() => {
        updateProgress(100);
        addLine("ARCHIVE READY // ENTER DATABASE");
        finalMessage.classList.remove("hidden");
        enterBtn.classList.remove("hidden");
      }, 700);
    }
  }, 700);
}

runBootSequence();
