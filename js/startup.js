const log = document.getElementById("bootLog");
const fill = document.getElementById("progressFill");
const percent = document.getElementById("progressPercent");
const finalText = document.getElementById("startupFinal");
const clock = document.getElementById("clock");

const steps = [
  { text: "INITIALIZING ARCHIVE CORE...", progress: 9, system: "core" },
  { text: "CORE RESPONSE // NOMINAL", progress: 20, ok: true },
  { text: "LOADING COLLECTION INDEX...", progress: 34, system: "index" },
  { text: "VERIFYING DATABASE STRUCTURE...", progress: 47, ok: true },
  { text: "ESTABLISHING VISUAL INTERFACE...", progress: 61, system: "visual" },
  { text: "SCANNING ARCHIVE ROUTES...", progress: 72 },
  { text: "ACCESS CONTROL HANDSHAKE...", progress: 84, system: "access" },
  { text: "UNLISTED ACCESS CHANNEL // ACCEPTED", progress: 93, warn: true },
  { text: "ARCHIVE READY", progress: 100, ok: true }
];

function updateClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], { hour12: false });
}
updateClock();
setInterval(updateClock, 1000);

function addLine(step) {
  const el = document.createElement("div");
  el.className = "boot-line" + (step.ok ? " ok" : "") + (step.warn ? " warn" : "");
  el.textContent = "> " + step.text;
  log.appendChild(el);

  fill.style.width = step.progress + "%";
  percent.textContent = step.progress + "%";

  if (step.system) {
    const status = document.querySelector(`[data-system="${step.system}"]`);
    if (status) {
      status.textContent = "ONLINE";
      status.classList.add("online");
    }
  }
}

let index = 0;

function nextStep() {
  if (index >= steps.length) {
    finalText.textContent = "ACCESS AUTHORIZED // OPENING ARCHIVE";
    finalText.classList.add("ready");

    setTimeout(() => {
      document.body.classList.add("transitioning");
    }, 420);

    setTimeout(() => {
      window.location.href = "archive.html";
    }, 1180);
    return;
  }

  addLine(steps[index]);
  index += 1;

  const delay = index === steps.length ? 500 : 390 + Math.random() * 210;
  setTimeout(nextStep, delay);
}

setTimeout(nextStep, 420);
