const WORDS = [
  ["A", "ssembled"],
  ["R", "obotic"],
  ["C", "ollection"],
  ["H", "angar"],
  ["I", "nventory"],
  ["V", "erified"],
  ["E", "xhibit"]
];

const acronym = document.getElementById("acronym");
const bootPercent = document.getElementById("bootPercent");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.getElementById("clock").textContent =
  new Date().toLocaleTimeString([], { hour12: false });

WORDS.forEach(([letter, rest]) => {
  const row = document.createElement("div");
  row.innerHTML = `<b>${letter}</b><span>${letter}${rest}</span>`;
  acronym.appendChild(row);
});

const rows = [...acronym.children];
const timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, reduceMotion ? 0 : ms));

rows.forEach((row, i) => later(() => {
  row.classList.add("on");
  bootPercent.textContent = "BOOT " + String(Math.round((i + 1) / rows.length * 100)).padStart(3, "0");
}, 150 + i * 110));

later(() => document.body.classList.add("os-done"), 1150);
later(() => document.body.classList.add("os-out"), 2000);
later(openArchive, 2450);

function openArchive() {
  timers.forEach(clearTimeout);
  window.location.href = "archive.html";
}

// Any click, tap or key skips straight to the archive.
document.addEventListener("click", openArchive);
document.addEventListener("keydown", openArchive);
