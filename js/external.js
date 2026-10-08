const selector = document.getElementById("splitSelector");
const panels = [...document.querySelectorAll(".split-panel")];

function activate(panel) {
  panels.forEach(p => p.classList.toggle("is-active", p === panel));
  selector.classList.add("has-hover");
}

function clear() {
  panels.forEach(p => p.classList.remove("is-active"));
  selector.classList.remove("has-hover");
}

panels.forEach(panel => {
  panel.addEventListener("mouseenter", () => activate(panel));
  panel.addEventListener("focus", () => activate(panel));
});

selector.addEventListener("mouseleave", clear);

// Touch: first tap previews the branch; second tap follows the link.
panels.forEach(panel => {
  panel.addEventListener("click", event => {
    if (!window.matchMedia("(hover: none)").matches) return;

    if (!panel.classList.contains("is-active")) {
      event.preventDefault();
      activate(panel);
    }
  });
});
